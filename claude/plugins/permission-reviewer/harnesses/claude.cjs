"use strict";

/**
 * Claude harness adapter for permission-reviewer.
 *
 * Invokes `claude -p` (Claude Code print mode) with the skill content
 * embedded as system context. Requires Claude Code CLI to be installed.
 *
 * Configuration (env vars):
 *   CLAUDE_BIN             Path to claude binary (default: claude)
 *   CLAUDE_REVIEWER_MODEL  Model to use (default: claude-haiku-4-5-20251001)
 *   SKILL_PATH             Override path to SKILL.md (default: ../skills/permission-reviewer/SKILL.md relative to this file)
 *
 * Output: Single JSON line {"decision":"allow"|"deny","reason":"..."}
 * The main hook's normalizeCodexOutput() handles this flat format automatically
 * (it falls through NDJSON parsing and the caller catches — so we return
 * a synthetic NDJSON envelope to keep the normalize path consistent).
 */

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const CLAUDE_BIN   = process.env.CLAUDE_BIN            || "claude";
const MODEL        = process.env.CLAUDE_REVIEWER_MODEL || "claude-haiku-4-5-20251001";
const TIMEOUT_MS   = parseInt(process.env.PERMISSION_REVIEWER_TIMEOUT_MS || "30000", 10);

const DEFAULT_SKILL_PATH = path.join(__dirname, "..", "skills", "permission-reviewer", "SKILL.md");
const SKILL_PATH = process.env.SKILL_PATH || DEFAULT_SKILL_PATH;

function loadSkillContent() {
  try {
    return fs.readFileSync(SKILL_PATH, "utf8");
  } catch (err) {
    throw new Error(`Could not load skill file at ${SKILL_PATH}: ${err.message}`);
  }
}

/**
 * Invoke Claude CLI with permission-reviewer skill embedded in the prompt.
 * @param {string} payloadJson — JSON string of the review context
 * @returns {string} Synthetic NDJSON envelope containing Claude's JSON decision
 */
function invoke(payloadJson) {
  const skillContent = loadSkillContent();

  const systemPrompt = skillContent
    .replace(/^---[\s\S]*?---\n/, "")  // strip YAML frontmatter
    .trim();

  const userPrompt = `Review the following permission request and return strict JSON only.\n\n${payloadJson}`;

  const raw = execFileSync(
    CLAUDE_BIN,
    ["-p", `${systemPrompt}\n\n${userPrompt}`, "--model", MODEL],
    { timeout: TIMEOUT_MS, maxBuffer: 1_000_000, encoding: "utf8" }
  );

  // Claude -p emits plain text. Wrap it in the NDJSON envelope that
  // normalizeCodexOutput() expects so we can reuse the same normalize path.
  const text = raw.trim();
  const envelope = {
    type: "item.completed",
    item: { type: "agent_message", text },
  };
  return JSON.stringify(envelope);
}

module.exports = { invoke };
