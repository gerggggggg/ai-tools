"use strict";

/**
 * Codex harness adapter for permission-reviewer.
 *
 * Configuration (env vars):
 *   CODEX_BIN        Path to codex binary (default: /opt/homebrew/bin/codex)
 *   CODEX_MODEL      Model name (default: gpt-5.3-codex)
 *   CODEX_SKILL_NAME Skill prefix name (default: claude-permission-reviewer)
 *
 * Output: Codex NDJSON string — the main hook normalizes it.
 */

const { execFileSync } = require("child_process");
const path = require("path");

const CODEX_BIN        = process.env.CODEX_BIN        || "/opt/homebrew/bin/codex";
const CODEX_MODEL      = process.env.CODEX_MODEL      || "gpt-5.3-codex";
const CODEX_SKILL_NAME = process.env.CODEX_SKILL_NAME || "claude-permission-reviewer";
const TIMEOUT_MS       = parseInt(process.env.PERMISSION_REVIEWER_TIMEOUT_MS || "30000", 10);

/**
 * Invoke Codex with the permission-reviewer skill.
 * @param {string} payloadJson — JSON string of the review context
 * @returns {string} Raw Codex NDJSON output
 */
function invoke(payloadJson) {
  const prompt = `$${CODEX_SKILL_NAME}: Review the following permission request and return strict JSON only.\n\n${payloadJson}`;

  return execFileSync(
    CODEX_BIN,
    [
      "exec",
      "--model",   CODEX_MODEL,
      "--sandbox", "read-only",
      "--config",  "model_reasoning_effort=low",
      "--json",
      prompt,
    ],
    { timeout: TIMEOUT_MS, maxBuffer: 1_000_000, encoding: "utf8" }
  );
}

module.exports = { invoke };
