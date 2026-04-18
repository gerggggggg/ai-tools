"use strict";

/**
 * Custom harness adapter template for permission-reviewer.
 *
 * Copy this file, rename it (e.g., my-harness.cjs), and set:
 *   PERMISSION_REVIEWER_HARNESS=my-harness
 *
 * The adapter must export a single function:
 *   invoke(payloadJson: string) → string
 *
 * Return value must be one of:
 *
 *   1. Codex NDJSON format — at least one line matching:
 *      {"type":"item.completed","item":{"type":"agent_message","text":"{\"decision\":\"allow\",\"reason\":\"...\"}"}}`
 *
 *   2. Single synthetic NDJSON envelope — same shape as (1) above.
 *      Use this when your harness returns a plain JSON string.
 *
 * If the output cannot be parsed to a {decision, reason} object, the main
 * hook hard-denies.
 *
 * Configuration pattern: read env vars prefixed with your harness name.
 */

const { execFileSync } = require("child_process");

const TIMEOUT_MS = parseInt(process.env.PERMISSION_REVIEWER_TIMEOUT_MS || "30000", 10);

/**
 * Invoke your custom LLM harness.
 * @param {string} payloadJson — JSON string of the review context
 * @returns {string} NDJSON string (see format above)
 */
function invoke(payloadJson) {
  // TODO: implement your harness invocation here.
  //
  // Example: call an arbitrary CLI that returns a JSON decision:
  //
  //   const raw = execFileSync(
  //     "/usr/local/bin/my-llm-cli",
  //     ["review", "--json", payloadJson],
  //     { timeout: TIMEOUT_MS, maxBuffer: 1_000_000, encoding: "utf8" }
  //   );
  //
  // If your CLI returns flat JSON: {"decision":"allow","reason":"..."}
  // wrap it in the NDJSON envelope:
  //
  //   const envelope = {
  //     type: "item.completed",
  //     item: { type: "agent_message", text: raw.trim() },
  //   };
  //   return JSON.stringify(envelope);

  throw new Error("custom harness: invoke() not implemented — edit harnesses/custom.cjs");
}

module.exports = { invoke };
