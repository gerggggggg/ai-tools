# permission-reviewer

A Claude Code plugin that delegates `PermissionRequest` hook decisions to a configurable LLM harness. Instead of every `Bash`, `Edit`, or `Write` tool call going straight to Claude Code's native allow/deny dialog, this hook asks a second LLM to review the request first — silently approving safe operations and escalating suspicious ones to the user.

## How it works

```
Claude Code tool call
       │
       ▼
PermissionRequest hook fires
       │
       ▼
permission-review.cjs
       │
       ├─ Validates payload (hard-deny on bad input)
       │
       ├─ Calls harness adapter (Codex / Claude / custom)
       │       └─ LLM evaluates against SKILL.md decision rules
       │
       ├─ Normalizes + validates response
       │
       ├─ ALLOW  → emit allow JSON → Claude Code proceeds silently
       └─ DENY   → emit {} → Claude Code shows native dialog (user can override)
```

Error on any step → hard deny immediately; a broken hook never becomes a pass-through.

## Installation

```bash
# Install for a specific project
claude plugin install /path/to/permission-reviewer

# Or point at it directly during development
claude --plugin-dir /path/to/permission-reviewer
```

After installation, add a `settings.json` deny-list entry for paths you want hard-blocked even before the hook fires (the hook is a second layer, not the only gate):

```json
{
  "permissions": {
    "deny": [
      "Bash(cat ~/.ssh/*)",
      "Bash(cat ~/.aws/*)",
      "Bash(curl *|*sh)",
      "Bash(wget *|*sh)"
    ]
  }
}
```

## Configuration

All configuration is via environment variables. Set them in your shell profile or in a `.env` sourced before starting Claude Code.

### Harness selection

| Env var | Default | Description |
|---------|---------|-------------|
| `PERMISSION_REVIEWER_HARNESS` | `codex` | Which harness: `codex`, `claude`, or your custom harness name |
| `PERMISSION_REVIEWER_HARNESS_PATH` | — | Absolute path to a `.cjs` harness file (overrides `PERMISSION_REVIEWER_HARNESS`) |
| `PERMISSION_REVIEWER_TIMEOUT_MS` | `30000` | Milliseconds before harness call times out → hard deny |

### Codex harness (`codex`)

| Env var | Default | Description |
|---------|---------|-------------|
| `CODEX_BIN` | `/opt/homebrew/bin/codex` | Path to the Codex binary |
| `CODEX_MODEL` | `gpt-5.3-codex` | Model name |
| `CODEX_SKILL_NAME` | `claude-permission-reviewer` | Skill prefix in the prompt (`$<skill-name>:`) |

Requires the [Codex CLI](https://github.com/openai/codex) and a skill installed at `~/.codex/skills/<skill-name>/SKILL.md`. Use `skills/permission-reviewer/SKILL.md` from this plugin as the skill content.

### Claude harness (`claude`)

| Env var | Default | Description |
|---------|---------|-------------|
| `CLAUDE_BIN` | `claude` | Path to the Claude Code CLI binary |
| `CLAUDE_REVIEWER_MODEL` | `claude-haiku-4-5-20251001` | Model to use |
| `SKILL_PATH` | `<plugin-root>/skills/permission-reviewer/SKILL.md` | Path to skill content file |

Requires [Claude Code CLI](https://claude.ai/code) to be installed.

### Custom harness

Copy `harnesses/custom.cjs`, implement `invoke(payloadJson)`, then:

```bash
export PERMISSION_REVIEWER_HARNESS_PATH=/path/to/my-harness.cjs
```

## Installing the skill in a harness

`skills/permission-reviewer/SKILL.md` is a standalone, harness-agnostic skill file.

**Codex:** Copy it to `~/.codex/skills/<skill-name>/SKILL.md` (rename the directory to match `CODEX_SKILL_NAME`).

**Other harnesses:** Embed the skill content as a system prompt. The Claude harness adapter does this automatically from `SKILL_PATH`.

## Testing

```bash
bash hooks/scripts/permission-review.test.sh
```

All 15 tests run without a live harness using `CODEX_OVERRIDE_OUTPUT` injection. Tests cover:
- Hook-level error paths (invalid payload, wrong event name, empty stdin)
- Normalizer error paths (prose output, invalid decision values)
- Allow path (silent proceed)
- Deny path (escalate to native dialog)
- Multi-line NDJSON (realistic Codex output format)

To test with a real harness, trigger a `Bash` or `Edit` call in Claude Code that isn't on the auto-allow list.

## Security notes

- The normalizer whitelists only `decision` and `reason` fields — `updatedPermissions`, `updatedInput`, and other injection vectors are stripped before validation.
- Timeout, ENOENT, and non-zero exit from the harness all hard-deny.
- Deny escalates to Claude Code's native dialog (user can override); it does **not** hard-block.
- Hard deny on hook errors means a misconfigured plugin fails closed, not open.
