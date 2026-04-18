# ai-tools

A personal collection of AI tools, Claude Code plugins, and configurations that I've built and find genuinely useful day-to-day.

## What's here

### `claude/plugins/`

Claude Code plugins, each installable independently.

| Plugin | What it does |
|--------|-------------|
| [claudit](claude/plugins/claudit/) | Audits your Claude Code configuration against best practices and helps you act on the findings |

## Using the plugins

These plugins are distributed via a local marketplace. To set it up:

```bash
claude plugin marketplace add ai-tools/claude/plugins
```

Then install any plugin by name:

```bash
claude plugin install claudit
```

## Author

[Greg Polumbo](https://github.com/gerggggggg)
