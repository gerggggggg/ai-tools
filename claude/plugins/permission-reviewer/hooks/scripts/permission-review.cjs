#!/usr/bin/env node
/**
 * permission-review.cjs
 *
 * Claude Code PermissionRequest hook — delegates allow/deny decisions to a
 * configurable LLM harness without trusting LLM output directly.
 *
 * Security contract:
 *   - On harness ALLOW  → emit allow JSON; Claude Code proceeds silently.
 *   - On harness DENY   → hard-deny with reviewer's reason; Claude Code shows
 *                         the denial message — no interactive dialog is shown.
 *   - On hook ERROR     → hard-deny immediately; a broken hook must never
 *                         become a pass-through.
 *   - All deny/error paths write a diagnostic line to stderr.
 *
 * Configuration (env vars):
 *   PERMISSION_REVIEWER_HARNESS   Which harness to use: codex | claude | custom
 *                                 (default: codex)
 *   PERMISSION_REVIEWER_HARNESS_PATH  Absolute path to a harness .cjs file.
 *                                     Overrides PERMISSION_REVIEWER_HARNESS.
 *   CODEX_OVERRIDE_OUTPUT         Skip harness, inject raw NDJSON for testing.
 *
 * Harness-specific configuration: see harnesses/<name>.cjs for env vars.
 */

"use strict";

const path = require("path");

// ── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_BEHAVIORS = new Set(["allow", "deny"]);

// ── Harness loader ───────────────────────────────────────────────────────────

function loadHarness() {
  if (process.env.PERMISSION_REVIEWER_HARNESS_PATH) {
    return require(process.env.PERMISSION_REVIEWER_HARNESS_PATH);
  }
  const name = (process.env.PERMISSION_REVIEWER_HARNESS || "codex").toLowerCase();
  const harnessPath = path.join(__dirname, "..", "..", "harnesses", `${name}.cjs`);
  try {
    return require(harnessPath);
  } catch (err) {
    throw new Error(`Could not load harness "${name}" from ${harnessPath}: ${err.message}`);
  }
}

// ── Output helpers ───────────────────────────────────────────────────────────

function log(msg) {
  process.stderr.write(`[permission-review] ${msg}\n`);
}

function hardDeny(message) {
  const msg = String(message || "Permission denied by automated reviewer.");
  log(`HARD DENY: ${msg}`);
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PermissionRequest",
      decision: { behavior: "deny", message: msg },
    },
  }) + "\n");
  process.exit(0);
}

function escalateToDialog(reason) {
  log(`HARNESS DENY (escalating to dialog): ${reason}`);
  process.stdout.write("{}\n");
  process.exit(0);
}

function allow(reason) {
  log(`ALLOW: ${reason ?? "(no reason)"}`);
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PermissionRequest",
      decision: { behavior: "allow" },
    },
  }) + "\n");
  process.exit(0);
}

// ── Stdin reader ─────────────────────────────────────────────────────────────

function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.on("data", (c) => chunks.push(c));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    process.stdin.on("error", reject);
  });
}

// ── Harness invocation ───────────────────────────────────────────────────────

/**
 * Invoke the configured LLM harness.
 *
 * If CODEX_OVERRIDE_OUTPUT is set, it is returned directly (for testing).
 * Otherwise the harness adapter's invoke() is called.
 */
function invokeHarness(payloadJson) {
  if (process.env.CODEX_OVERRIDE_OUTPUT) {
    return process.env.CODEX_OVERRIDE_OUTPUT;
  }
  const harness = loadHarness();
  return harness.invoke(payloadJson);
}

// ── Normalisation ────────────────────────────────────────────────────────────

/**
 * Extract { decision, reason } from harness NDJSON output and map to
 * the internal { behavior, message } schema.
 *
 * Scans NDJSON lines for:
 *   { "type": "item.completed",
 *     "item": { "type": "agent_message", "text": "{\"decision\":\"...\",\"reason\":\"...\"}" } }
 *
 * Skips all other line types, prose text, and malformed lines.
 * Throws if no valid decision line is found.
 */
function normalizeOutput(raw) {
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    let obj;
    try { obj = JSON.parse(line); } catch { continue; }
    if (!obj || typeof obj !== "object") continue;

    const item = obj.item;
    if (
      obj.type === "item.completed" &&
      item?.type === "agent_message" &&
      typeof item.text === "string"
    ) {
      let candidate;
      try { candidate = JSON.parse(item.text); } catch { continue; }
      if (candidate && typeof candidate.decision === "string") {
        return JSON.stringify({ behavior: candidate.decision, message: candidate.reason });
      }
    }
  }

  throw new Error("No agent_message in harness output contained a parseable 'decision' field.");
}

// ── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate the normalised { behavior, message } JSON string.
 *
 * Guards:
 *   1. Valid JSON plain object.
 *   2. `behavior` in [allow, deny].
 *   3. `message` is a string if present.
 *   4. No extra fields — blocks updatedPermissions / updatedInput injection.
 */
function validateOutput(raw) {
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch { throw new Error("Normalised output is not valid JSON."); }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Normalised output must be a plain JSON object.");
  }

  const { behavior, message, ...rest } = parsed;
  const forbidden = Object.keys(rest);
  if (forbidden.length > 0) {
    throw new Error(`Forbidden fields in normalised output: ${forbidden.join(", ")}`);
  }

  if (!ALLOWED_BEHAVIORS.has(behavior)) {
    throw new Error(`behavior "${behavior}" not in allowed set [allow, deny].`);
  }

  if (message !== undefined && typeof message !== "string") {
    throw new Error("message field must be a string.");
  }

  return { behavior, message };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  let rawPayload;
  try { rawPayload = await readStdin(); }
  catch (err) { hardDeny(`Failed to read stdin: ${err.message}`); }

  let payload;
  try { payload = JSON.parse(rawPayload); }
  catch { hardDeny("Hook payload is not valid JSON."); }

  const hookEventName         = payload?.hook_event_name        ?? null;
  const toolName              = payload?.tool_name               ?? null;
  const toolInput             = payload?.tool_input              ?? null;
  const permissionMode        = payload?.permission_mode         ?? null;
  const permissionSuggestions = payload?.permission_suggestions  ?? null;

  if (hookEventName !== "PermissionRequest") {
    hardDeny(`Unexpected hook_event_name: "${hookEventName}". Expected "PermissionRequest".`);
  }
  if (!toolName) {
    hardDeny("Payload missing required field: tool_name.");
  }

  const reviewContext = {
    hook_event_name: hookEventName,
    tool_name:       toolName,
    tool_input:      toolInput,
    permission_mode: permissionMode,
    cwd:             process.env.PWD ?? null,
    ...(permissionSuggestions != null && { permission_suggestions: permissionSuggestions }),
  };

  let harnessRaw;
  try { harnessRaw = invokeHarness(JSON.stringify(reviewContext)); }
  catch (err) { hardDeny(`Harness invocation failed: ${err.message}`); }

  let normalized;
  try { normalized = normalizeOutput(harnessRaw); }
  catch (err) { hardDeny(`Harness output could not be normalised: ${err.message}`); }

  let decision;
  try { decision = validateOutput(normalized); }
  catch (err) { hardDeny(`Harness output failed validation: ${err.message}`); }

  if (decision.behavior === "allow") {
    allow(decision.message);
  } else {
    hardDeny(decision.message ?? "Denied by automated reviewer.");
  }
}

main().catch((err) => {
  hardDeny(`Unhandled error: ${err.message}`);
});
