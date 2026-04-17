# claudit

A Claude Code plugin that audits your Claude Code configuration against best practices and helps you act on the findings.

## What it does

Run `/claudit` to get a structured audit of your Claude Code setup covering:

- **CLAUDE.md attention budget** — redundant, duplicate, and stale instructions
- **Token usage & cost** — always-loaded context, skill description bloat, model allocation
- **Custom skill quality** — triggering accuracy, body efficiency, model targeting (uses `skill-creator` if installed)
- **Agents** — model selection, role clarity, reference loading
- **Hooks** — automation gaps, safety gates, efficiency
- **Permissions** — allow/ask/deny hygiene and security posture
- **Memory** — coverage, freshness, token ROI
- **MCP servers** — installed vs. missing high-value integrations
- **What's new / what's stale** — capabilities to adopt and patterns to retire

The audit ends with a numbered **Action Items table** you can hand directly to the `fixer` agent.

## Components

### `/claudit` skill
The main audit. Starts by running `/insights` for usage data, reads your full config, researches current best practices, and produces a structured report with a numbered Action Items table.

### `fixer` / `optimizer` agent
Implements audit recommendations. After the audit, tell it which items to act on:

```
fixer: do 1, 3, 5 / skip 2 / discuss 4 and 7
```

or

```
optimizer do all quick wins
```

The fixer only touches config files (`.claude/` hierarchy and plugin directories). It never edits source code and always confirms before deleting anything.

### Drift detection hook
A `SessionStart` hook that compares your current config against a baseline snapshot saved after each audit. If your config has changed substantially or the audit is more than 30 days old, it prints a one-line reminder. Silent otherwise.

Drift thresholds:
- > 30 days since last audit → reminder
- > 40% metric drift (any time) → warning
- > 20% drift + > 15 days → suggestion

## Installation

```bash
claude plugin install ~/projects/ai-tools/claude/plugins/claudit
```

Or from a marketplace if published there.

## Usage

```
/claudit
```

Then follow the prompts. When the Action Items table appears, invoke the fixer:

```
fixer: do 1 2 4, skip 3, discuss 5
```

## License

GNU General Public License v3.0 or later — see [LICENSE](LICENSE).

## Author

Greg Polumbo — gpolumbo@gmail.com
