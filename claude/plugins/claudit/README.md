# claudit

A Claude Code plugin that audits your Claude Code configuration against best practices and helps you act on the findings.

## What it does

Run `/claudit` to get a structured audit of your Claude Code setup. It reads your full config, cross-references current best practices from the Anthropic docs, and produces a scored report with concrete action items.

**Areas covered:**

| Area | What gets checked |
|------|-------------------|
| CLAUDE.md | Redundant, duplicate, and stale instructions |
| Token usage & cost | Always-loaded context, skill description bloat, model allocation |
| Skills | Triggering accuracy, body efficiency, model targeting |
| Agents | Model selection, role clarity, reference loading |
| Hooks | Automation gaps, safety gates, efficiency |
| Permissions | Allow/ask/deny hygiene and security posture |
| Memory | Coverage, freshness, token ROI |
| MCP servers | Installed vs. missing high-value integrations |
| What's new / stale | Capabilities to adopt and patterns to retire |

The audit ends with a numbered **Action Items table** you hand directly to the `fixer` agent.

## Components

### `/claudit` skill

The main audit command. Kicks off by running `/insights` for usage data, reads your full config, fetches current best practices, and outputs a structured report.

### `fixer` agent (also: `optimizer`)

Implements audit recommendations. After the audit, tell it which items to act on:

```
fixer: do 1, 3, 5 / skip 2 / discuss 4 and 7
```

```
optimizer do all quick wins
```

The fixer only touches config files (`.claude/` and plugin directories). It never edits source code and always confirms before deleting anything.

### Drift detection hook

A `SessionStart` hook that compares your current config against a snapshot saved after the last audit. If your config has drifted substantially or the audit is stale, it prints a one-line reminder. Silent otherwise.

Drift thresholds:
- > 30 days since last audit → reminder
- > 40% metric change (any time) → warning
- > 20% change + > 15 days → suggestion

## Installation

```bash
# Add the marketplace (one-time setup)
claude plugin marketplace add ~/projects/ai-tools/claude/plugins

# Install the plugin
claude plugin install claudit
```

## Usage

```
/claudit
```

When the Action Items table appears, hand it to the fixer:

```
fixer: do 1, 3, 5 / skip 2 / discuss 4
```

### When to run

- After a new Claude model release — assumptions about model behavior may be stale
- Quarterly, as a hygiene check
- When cost or performance feels off
- When onboarding to a new project or machine

## License

GNU General Public License v3.0 or later — see [LICENSE](LICENSE).

## Author

[Greg Polumbo](https://github.com/gerggggggg)
