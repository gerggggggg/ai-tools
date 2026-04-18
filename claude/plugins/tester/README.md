# tester

A Claude Code plugin providing an expert testing coach and executor skill. Enforces disciplined TDD, correct test pyramid shape, dependency injection and testability design, behavioral test naming, and actionable failure messages — across any language or framework.

## What It Does

The `tester` skill activates whenever you ask Claude to write, review, or advise on tests. It applies a consistent set of principles:

- **Red/Green TDD** — always write a failing test first; never implement before a covering test exists
- **Bug fix protocol** — replicate the bug in a test, fix the code, invert the assertion
- **Test pyramid** — unit tests at the base, fast and numerous; E2E at the top, minimal
- **Testability design** — flags complex setup as a code smell; advocates DI, interfaces, and mocking at boundaries
- **Naming** — test names as behavior statements, readable without the body
- **Failure messages** — specific, actionable output that self-diagnoses what broke

## Trigger Phrases

The skill loads automatically when you say things like:

- "Write a test for X"
- "Add unit tests"
- "Write a failing test first"
- "How should I test this?"
- "Test setup is complicated"
- "Hard to test — should I refactor?"
- "Review my tests"
- "My test is failing"
- "TDD", "red green", "test pyramid"

## Files

```
tester/
├── .claude-plugin/plugin.json
├── skills/tester/
│   ├── SKILL.md                    — core testing principles and workflow
│   └── references/
│       └── patterns.md             — language-specific examples (TS, Python, Go), DI patterns, AAA template, flakiness table
└── README.md
```

## Installation

```bash
# Install at user scope (available in all projects)
claude plugin install /path/to/tester --scope user
```

Or register in `~/.claude/settings.json` under `plugins`.
