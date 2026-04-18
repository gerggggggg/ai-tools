#!/usr/bin/env bash
# permission-review.test.sh
#
# Exercises permission-review.cjs without a live harness.
#
# Usage:
#   bash hooks/scripts/permission-review.test.sh
#
# CODEX_OVERRIDE_OUTPUT must be a single NDJSON line in the agent_message
# envelope that harnesses emit. The text field must have its inner quotes
# backslash-escaped so the outer JSON remains valid:
#
#   '{"type":"item.completed","item":{"type":"agent_message","text":"{\"decision\":\"allow\",\"reason\":\"ok\"}"}}'
#
# The flat {"decision":"allow",...} format does NOT work — normalizeOutput
# requires the item.completed/agent_message envelope.
#
# Note on forbidden-fields: normalizeOutput whitelist-extracts only
# `decision` and `reason`, discarding everything else before validateOutput
# runs. The validator's forbidden-fields check guards the normalised layer and
# cannot be triggered by extra fields in the raw harness output — the normaliser
# IS the injection boundary.

set -euo pipefail
SCRIPT="$(dirname "$0")/permission-review.cjs"
PASS=0
FAIL=0

# run_test LABEL PAYLOAD EXPECT [CODEX_OVERRIDE]
#
#   EXPECT: "allow" | "deny" (hard-deny) | "dialog" (escalate to native prompt)
run_test() {
  local label="$1"
  local payload="$2"
  local expect="$3"
  local override="${4:-}"

  local stderr_file
  stderr_file=$(mktemp)

  local stdout
  if [ -n "$override" ]; then
    stdout=$(echo "$payload" | env CODEX_OVERRIDE_OUTPUT="$override" node "$SCRIPT" 2>"$stderr_file" || true)
  else
    stdout=$(echo "$payload" | node "$SCRIPT" 2>"$stderr_file" || true)
  fi

  local node_stderr
  node_stderr=$(cat "$stderr_file")
  rm -f "$stderr_file"

  local got
  if [ "$stdout" = "{}" ]; then
    got="dialog"
  else
    got=$(echo "$stdout" | node -e "
      try {
        const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
        process.stdout.write(d.hookSpecificOutput.decision.behavior);
      } catch(e) { process.stdout.write('PARSE_ERROR'); }
    " 2>/dev/null || echo "PARSE_ERROR")
  fi

  if [ "$got" = "$expect" ]; then
    echo "PASS  $label"
    PASS=$((PASS + 1))
  else
    echo "FAIL  $label  (expected=$expect  got=$got)"
    echo "      stdout:  $stdout"
    echo "      stderr:  $node_stderr"
    FAIL=$((FAIL + 1))
  fi
}

# ── NDJSON helpers ────────────────────────────────────────────────────────────
#
# macOS BSD printf converts \" to " (POSIX), stripping backslashes — so we
# build strings in bash double-quotes where \\ → \ and \" → ", giving us
# literal backslash-quote pairs (\\\" → \") in the output.

ndjson_allow() {
  local reason="${1:-ok}"
  echo "{\"type\":\"item.completed\",\"item\":{\"type\":\"agent_message\",\"text\":\"{\\\"decision\\\":\\\"allow\\\",\\\"reason\\\":\\\"${reason}\\\"}\"}}"
}

ndjson_deny() {
  local reason="${1:-denied}"
  echo "{\"type\":\"item.completed\",\"item\":{\"type\":\"agent_message\",\"text\":\"{\\\"decision\\\":\\\"deny\\\",\\\"reason\\\":\\\"${reason}\\\"}\"}}"
}

ndjson_full_allow() {
  local reason="${1:-ok}"
  local decision_line
  decision_line=$(ndjson_allow "$reason")
  printf '%s\n%s\n%s\n%s\n%s\n' \
    '{"type":"thread.started","thread_id":"test-abc"}' \
    '{"type":"turn.started"}' \
    '{"type":"item.completed","item":{"type":"agent_message","text":"Reviewing the permission request."}}' \
    "$decision_line" \
    '{"type":"turn.completed","usage":{"input_tokens":100,"output_tokens":20}}'
}

ndjson_full_deny() {
  local reason="${1:-denied}"
  local decision_line
  decision_line=$(ndjson_deny "$reason")
  printf '%s\n%s\n%s\n%s\n%s\n' \
    '{"type":"thread.started","thread_id":"test-abc"}' \
    '{"type":"turn.started"}' \
    '{"type":"item.completed","item":{"type":"agent_message","text":"Reviewing the permission request."}}' \
    "$decision_line" \
    '{"type":"turn.completed","usage":{"input_tokens":100,"output_tokens":20}}'
}

# ── Fixtures ──────────────────────────────────────────────────────────────────

BASH_PAYLOAD='{
  "hook_event_name": "PermissionRequest",
  "tool_name": "Bash",
  "tool_input": { "command": "pnpm test" },
  "permission_mode": "ask"
}'

RM_PAYLOAD='{
  "hook_event_name": "PermissionRequest",
  "tool_name": "Bash",
  "tool_input": { "command": "rm -rf /" },
  "permission_mode": "ask"
}'

EDIT_PAYLOAD='{
  "hook_event_name": "PermissionRequest",
  "tool_name": "Edit",
  "tool_input": { "file_path": "src/index.ts", "old_string": "a", "new_string": "b" },
  "permission_mode": "ask"
}'

WRITE_PAYLOAD='{
  "hook_event_name": "PermissionRequest",
  "tool_name": "Write",
  "tool_input": { "file_path": "src/new.ts", "content": "export {};" },
  "permission_mode": "ask"
}'

# ── Hook-level error paths (hard deny, no harness call) ───────────────────────

run_test "wrong event name → hard deny" '{
  "hook_event_name": "PreToolUse",
  "tool_name": "Bash",
  "tool_input": { "command": "ls" },
  "permission_mode": "ask"
}' "deny"

run_test "missing hook_event_name → hard deny" '{
  "tool_name": "Bash",
  "tool_input": { "command": "ls" },
  "permission_mode": "ask"
}' "deny"

run_test "missing tool_name → hard deny" '{
  "hook_event_name": "PermissionRequest",
  "permission_mode": "ask"
}' "deny"

run_test "invalid JSON payload → hard deny" 'not json at all' "deny"

run_test "empty stdin → hard deny" '' "deny"

# ── Normaliser error paths (harness ran but output unreadable) ────────────────

run_test "no agent_message line → hard deny" \
  "$BASH_PAYLOAD" "deny" \
  '{"some":"other","structure":"here"}'

# agent_message text is prose — JSON.parse fails, line is skipped, no decision found.
run_test "agent_message prose text → hard deny" \
  "$BASH_PAYLOAD" "deny" \
  '{"type":"item.completed","item":{"type":"agent_message","text":"I have reviewed and the answer is yes."}}'

# Invalid decision value — validateOutput rejects anything not in [allow, deny].
run_test "invalid decision value → hard deny" \
  "$BASH_PAYLOAD" "deny" \
  '{"type":"item.completed","item":{"type":"agent_message","text":"{\"decision\":\"maybe\",\"reason\":\"not sure\"}"}}'

# ── Allow path (harness approved → silent proceed, no dialog) ────────────────

run_test "harness allow Bash → silent allow" \
  "$BASH_PAYLOAD" "allow" \
  "$(ndjson_allow 'routine safe command')"

run_test "harness allow Edit → silent allow" \
  "$EDIT_PAYLOAD" "allow" \
  "$(ndjson_allow 'scoped project edit')"

run_test "harness allow Write → silent allow" \
  "$WRITE_PAYLOAD" "allow" \
  "$(ndjson_allow 'scoped project write')"

# ── Deny path (harness denied → escalate to native dialog) ───────────────────

run_test "harness deny → hard deny" \
  "$RM_PAYLOAD" "deny" \
  "$(ndjson_deny 'destructive operation')"

# Deny with no reason — still hard-denies.
run_test "harness deny no reason → hard deny" \
  "$RM_PAYLOAD" "deny" \
  '{"type":"item.completed","item":{"type":"agent_message","text":"{\"decision\":\"deny\"}"}}'

# ── Multi-line NDJSON (realistic Codex output format) ────────────────────────

run_test "multi-line NDJSON → allow" \
  "$BASH_PAYLOAD" "allow" \
  "$(ndjson_full_allow 'safe git command')"

run_test "multi-line NDJSON → hard deny" \
  "$RM_PAYLOAD" "deny" \
  "$(ndjson_full_deny 'credential access')"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
