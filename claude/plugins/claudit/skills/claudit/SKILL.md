---
name: claudit
description: "Audit your Claude Code configuration against best practices. Reviews CLAUDE.md files, settings, skills, agents, hooks, memory, and permissions for optimization opportunities. Run periodically or after model upgrades to keep your setup lean and effective."
---

# Claude Code Configuration Audit

Perform a comprehensive audit of the current user's Claude Code setup, recommend improvements based on current best practices, and identify cost/token optimization opportunities.

## When to Run

- After a new Claude model release (assumptions about what Claude can/can't do may be stale)
- Quarterly, as a hygiene check
- When onboarding a new teammate to Claude Code
- When performance or cost feels suboptimal
- When exploring new capabilities in the AI ecosystem (MCP servers, new hook patterns, etc.)

## Audit Procedure

### Step 0: Generate Fresh Insights Report

Before anything else, invoke the `/insights` skill to generate a fresh usage report:

```
Skill("insights")
```

This produces (or refreshes) `~/.claude/usage-data/report.html`. Once it completes:

1. Note the report path: `~/.claude/usage-data/report.html`
2. Read the report and extract the key signals you'll need for the audit:
   - Top friction patterns (commands that required extra confirmation, repeated failures, path confusion, etc.)
   - Skills and agents that appear frequently in transcripts
   - Hook or permission gaps that caused interruptions
   - Any cost or token anomalies surfaced
3. Keep these signals in context — they feed directly into Section J of the checklist and sharpen every other section.

If `/insights` is unavailable or fails, read `~/.claude/usage-data/report.html` directly if it exists, and note its age. If it's older than 90 days, flag it in the report.

### Step 1: Gather Configuration

Read all of these (skip any that don't exist):

1. `~/.claude/CLAUDE.md` — global instructions
2. `~/.claude/settings.json` — global settings (permissions, hooks, model)
3. `~/.claude/settings.local.json` — local settings overrides
4. `~/.claude/skills/` — list all skill directories and read each `SKILL.md`
5. `~/.claude/agents/` — list all agent files and read each
6. `~/.claude/projects/` — scan for `memory/MEMORY.md` files and project-level `settings.local.json`
7. Any `.claude/` directories in the current working directory or common project roots
8. Project-level `CLAUDE.md` files in the current repo (if in a repo)
9. Any MCP server configurations in settings files

### Step 2: Analyze Custom Skills

Custom skills live in `~/.claude/skills/` (as opposed to plugin-installed skills under `~/.claude/plugins/`). If any exist, analyze them for quality, token efficiency, and model targeting.

**2a. Identify custom skills:**
```
ls ~/.claude/skills/
```
For each directory found, read its `SKILL.md`. These are the skills to analyze — plugin-installed skills are maintained upstream and out of scope here.

**2b. If `skill-creator:skill-creator` is available** (check the available skills list in context), invoke it for a focused review of each custom skill:
```
Skill("skill-creator:skill-creator", "Review <skill-name> at ~/.claude/skills/<skill-name>/SKILL.md for effectiveness, description triggering accuracy, token efficiency, and model targeting. Report specific issues and concrete improvements.")
```
Run one invocation per custom skill. Collect the findings for inclusion in the audit report.

If `skill-creator:skill-creator` is not available, perform the analysis inline using the criteria below.

**2c. Evaluation criteria for each custom skill:**

*Description quality (triggering accuracy):*
- Is the description specific enough to trigger on the right tasks without false positives?
- Is it concise? Long descriptions pay an always-on token cost every turn.
- Does it include both what the skill does AND when to invoke it?

*Body quality (instruction effectiveness):*
- Are instructions written in the imperative and grounded in "why", not just "what"?
- Is the body under ~500 lines? Anything longer should use progressive disclosure via `references/` files.
- Are there large blocks that could be moved to on-demand reference files?
- Any instructions that restate what the current model already does by default?

*Model targeting:*
- Does the skill specify a `model` frontmatter field? If so, is it current?
- Current model IDs (as of audit date — verify against `docs.anthropic.com/en/docs/about-claude/models`):
  - Complex reasoning, architecture, review → `claude-opus-4-7` (highest quality, highest cost)
  - General implementation, most tasks → `claude-sonnet-4-6` (best balance)
  - Mechanical/repetitive tasks → `claude-haiku-4-5` (fastest, cheapest)
- Flag any skill using a retired or suboptimal model ID for its use case.

*Token efficiency:*
- Estimate description token cost (always loaded) vs. body token cost (loaded on-demand).
- Flag descriptions over ~150 words — they inflate the always-on context budget.
- Check for duplicate content between skills or between skills and CLAUDE.md.

Collect findings per skill: name, issues found, recommended changes, estimated token savings.

### Step 3: Research Current Best Practices

Fetch the latest guidance from authoritative sources. Run these searches in parallel where possible — the goal is to surface anything published in the last 60–90 days that's relevant to coding agent and harness optimization.

#### 3a. Official model and platform documentation

- **Anthropic docs** — `docs.anthropic.com/en/docs/about-claude/models` for current model IDs, capabilities, and deprecations
- **Claude Code docs** — `docs.anthropic.com/en/docs/claude-code` for new features, settings, hooks, and slash commands
- **Anthropic blog** — WebSearch `site:anthropic.com/research OR site:anthropic.com/news` for recent releases and guidance

#### 3b. Competing model providers (for cross-pollinating ideas)

Search recent posts from:
- **OpenAI** — `openai.com/blog` — agent patterns, tool use, structured outputs
- **Google DeepMind** — `deepmind.google/discover/blog` — Gemini agent patterns, long-context strategies
- **Mistral / Cohere / Together** — search for recent agent harness or prompt engineering posts

Look for patterns that are model-agnostic and applicable to Claude Code: context structuring, tool use discipline, agent orchestration, cost reduction.

#### 3c. High-signal independent blogs and newsletters

WebSearch or WebFetch recent posts from:
- **Simon Willison** — `simonwillison.net` — prolific writer on LLM tooling, agent patterns, prompt engineering
- **Latent Space** — `latent.space` — deep technical podcasts and write-ups on agent frameworks
- **The Pragmatic Engineer** — `newsletter.pragmaticengineer.com` — engineering teams adopting AI coding tools
- **Hamel Husain** — `hamel.dev` — practical LLM ops and evaluation
- **Eugene Yan** — `eugeneyan.com` — applied ML, agent evaluation, RAG patterns
- **Swyx / Alessio** — search `swyx.io` and recent Latent Space episodes
- **LangChain blog** — `blog.langchain.dev` — agent orchestration patterns, even if not LangChain-specific

Search query to use: `"coding agent" OR "AI coding assistant" OR "Claude Code" optimization tips best practices` — filter results to the past 90 days

#### 3d. Community and ecosystem

- **Claude Code GitHub discussions** — search for recent threads on hooks, skills, MCP, and agent patterns
- **Hacker News** — WebSearch `site:news.ycombinator.com claude code OR coding agent harness` for high-voted recent threads
- **Reddit r/ClaudeAI and r/LocalLLaMA** — search for recent tips on Claude Code setup and agent configuration
- **MCP server registry** — check `github.com/modelcontextprotocol/servers` for new high-value servers added recently

#### 3e. Synthesize findings

After fetching, extract only what's actionable for this specific user's setup. For each finding, note:
- **Source** and publication date
- **What the recommendation is**
- **Whether it applies** to the user's current config (and why)
- **Which audit area** it affects (A–J from the checklist)

Discard findings that are speculative, vendor-marketing-heavy, or not applicable to Claude Code specifically. Flag the top 3–5 highest-signal findings for inclusion in the "What's New — Try These" section of the report.

When researching, trust hierarchy:
1. **Official Anthropic sources** — ground truth for Claude behavior and Claude Code features
2. **Independent technical writers** (Willison, Husain, Yan) — high signal, practical focus
3. **Other model providers** — useful for patterns, not for Claude-specific claims
4. **Community** — useful for real-world friction and workarounds, verify before recommending

Flag anything that contradicts the user's current setup or suggests a pattern worth adopting.

### Step 4: Evaluate Each Area

Read `references/checklist.md` for the full checklist. It covers ten areas (A through J): CLAUDE.md attention budget, token usage & cost, skills, agents, hooks, permissions, memory, MCP servers, context budget, and insights cross-reference. For each area, assess the current state, flag issues, and recommend improvements using the rating scale: **Good**, **Needs Attention**, **Missing**.

Incorporate the custom skill findings from Step 2 into the Skills row (area C) and the Token Usage row (area B).

### Step 5: Generate Report

Output a structured report:

```
# Claude Code Configuration Audit Report
**Date:** [today's date]
**User:** [username from CLAUDE.md or git config]
**Model:** [current model from settings]

## Scorecard

| Area | Rating | Key Finding |
|------|--------|-------------|
| CLAUDE.md Attention Budget | Good/Needs Attention/Missing | one-liner |
| Token Usage & Cost | Good/Needs Attention/Missing | one-liner |
| Skills | Good/Needs Attention/Missing | one-liner |
| Custom Skill Quality | Good/Needs Attention/Missing/N/A | one-liner |
| Agents | Good/Needs Attention/Missing | one-liner |
| Hooks | Good/Needs Attention/Missing | one-liner |
| Permissions | Good/Needs Attention/Missing | one-liner |
| Memory | Good/Needs Attention/Missing | one-liner |
| MCP Servers | Good/Needs Attention/Missing | one-liner |
| Context Budget | Good/Needs Attention/Missing | one-liner |
| Insights Cross-Reference | Good/Needs Attention/Missing | one-liner |

## Token & Cost Analysis

[Detailed breakdown of always-loaded token costs:
- CLAUDE.md: ~X tokens
- Skill descriptions: ~X tokens (list each)
- Agent descriptions: ~X tokens (list each)
- MEMORY.md index: ~X tokens
- Total always-on cost: ~X tokens/turn
- Estimated savings from recommendations: ~X tokens/turn]

## Detailed Findings

[For each area rated "Needs Attention" or "Missing", provide:
- What was found
- Why it matters (with reference to best practice)
- Specific recommended action
- Estimated token/cost impact where applicable]

## Custom Skill Analysis

[Only include if custom skills exist in ~/.claude/skills/. For each skill:

**Skill: `<name>`**
- Description token cost: ~X words (target: under 100)
- Body size: ~X lines (target: under 500)
- Model targeting: [current model ID] → [recommended if different]
- Issues: [list specific problems found]
- Recommended changes: [concrete edits, not vague suggestions]
- Estimated savings: ~X tokens/turn from description trim

If `skill-creator:skill-creator` was invoked, include its analysis verbatim or summarized here.]

## Model Targeting Summary

[Table of all skills and agents with explicit model pinning:

| Component | Type | Current Model | Recommended | Change Needed? |
|-----------|------|---------------|-------------|----------------|
| skill-name | skill | claude-opus-4-5 | claude-opus-4-7 | Yes — upgraded |
| agent-name | agent | claude-sonnet-3-5 | claude-sonnet-4-6 | Yes — retired |

Include skills/agents with no model pin that would benefit from one. Omit components where the default is appropriate.
Verify current model IDs against docs.anthropic.com/en/docs/about-claude/models before making recommendations.]

## What's New — Try These

[Based on research in Step 3, recommend new capabilities worth adopting:
- New MCP servers that are stable, secure, and high-value
- New Claude Code features or settings
- New patterns for skills, hooks, or agents
- Emerging best practices from the community
For each, note: what it does, why it's worth trying, effort to set up, and any security considerations]

## What's Stale — Retire These

[Patterns, configurations, or assumptions that are no longer needed:
- Instructions that newer models handle by default
- Workarounds for bugs that have been fixed
- Deprecated features or patterns
- Overly cautious guardrails that limit capability unnecessarily
For each, note: what it is, why it's stale, and what to replace it with (if anything)]

## Model-Specific Notes

[Recommendations specific to the current model:
- Capabilities that have improved (allowing removal of guardrails)
- New features that enable better patterns
- Known limitations to work around
- Optimal model routing for subagents given current pricing]

## Action Items

Present every actionable finding as a row. The Suggestion column is a starting recommendation — the user overrides it when invoking the fixer.

| # | Area | Action | Effort | Impact | Suggestion |
|---|------|--------|--------|--------|------------|
| 1 | [area] | [specific, self-contained action description] | Low/Med/High | [token savings or qualitative benefit] | Do/Skip/Discuss |
| 2 | ... | ... | ... | ... | ... |

Rules for this table:
- Every row must be actionable by the fixer agent without referring back to the full report
- "Discuss" suggestion = needs user input before the fixer can act (ambiguous scope, multiple valid approaches, destructive operations)
- "Skip" suggestion = low ROI or already handled another way — include so the user can consciously dismiss it
- Order by impact descending within each effort tier (Low effort first, then Medium, then High)

---
**Insights Report:** `~/.claude/usage-data/report.html` — open with `open ~/.claude/usage-data/report.html`
```

### Step 6: Write Baseline and Offer Fixer

After presenting the report, write the config baseline so the drift-detection hook has a reference point:

```python
import json, subprocess, glob, os
from datetime import date

def count(cmd): return int(subprocess.check_output(cmd, shell=True, text=True).strip() or 0)

baseline = {
    "last_audit": date.today().isoformat(),
    "metrics": {
        "skills_count":          count("find ~/.claude/skills ~/.claude/plugins -name 'SKILL.md' 2>/dev/null | wc -l"),
        "agents_count":          count("find ~/.claude/agents ~/.claude/plugins -name '*.md' -path '*/agents/*' 2>/dev/null | wc -l"),
        "plugins_count":         count("find ~/.claude/plugins -maxdepth 3 -name 'plugin.json' 2>/dev/null | wc -l"),
        "mcp_servers_count":     sum(len(json.load(open(f)).get("mcpServers", {})) for f in glob.glob(os.path.expanduser("~/.claude/settings*.json")) if os.path.exists(f)),
        "global_claude_md_lines": count("wc -l < ~/.claude/CLAUDE.md 2>/dev/null || echo 0"),
        "memory_files_count":    count("find ~/.claude/projects -name '*.md' -path '*/memory/*' 2>/dev/null | wc -l"),
        "settings_json_lines":   count("wc -l < ~/.claude/settings.json 2>/dev/null || echo 0"),
    }
}
json.dump(baseline, open(os.path.expanduser("~/.claude/claudit-baseline.json"), "w"), indent=2)
```

Run this as a Bash command (adapt as needed for the environment). Confirm to the user: "Baseline saved — the drift-detection hook will now track changes since this audit."

Then offer:

> **Ready to implement?** Tell the fixer agent (also known as `optimizer`) which Action Items to act on:
> - **Do** — implement now
> - **Skip** — dismiss
> - **Discuss** — I'll ask you one question before acting
>
> Example: *"fixer: do 1, 3, 5 / skip 2 / discuss 4 and 7"*

For custom skill improvements, the fixer can also invoke `skill-creator:skill-creator` on individual skills if deeper revision is needed.
