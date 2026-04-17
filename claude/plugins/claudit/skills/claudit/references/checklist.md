# Audit Checklist

Evaluate each area below. Rate as: **Good**, **Needs Attention**, **Missing**.

## A. CLAUDE.md — Attention Budget

- [ ] **Redundant instructions**: Rules that restate what Claude already does by default (e.g., "write clean code", "follow SOLID principles", "use meaningful variable names", "remove unused imports"). These waste attention tokens on every turn.
- [ ] **Duplicate instructions**: The same rule appearing in multiple places (global CLAUDE.md, project CLAUDE.md, skill files, agent files). Consolidate to one source of truth.
- [ ] **Stale instructions**: Rules that reference old model behaviors, removed features, or completed migrations.
- [ ] **Length**: Global CLAUDE.md over ~80 lines is a yellow flag. Over ~120 lines is a red flag. Use skills for progressive disclosure instead.
- [ ] **Specificity**: Every instruction should be something non-obvious or unique to this user/team. If you'd give the same instruction to any developer, it probably doesn't need to be here.

## B. Token Usage & Cost Optimization

- [ ] **Always-loaded content size**: Calculate approximate token count of everything loaded on every turn (CLAUDE.md, skill frontmatter descriptions, agent frontmatter descriptions, MEMORY.md index). Flag if over ~4000 tokens.
- [ ] **Skill description bloat**: Frontmatter descriptions should be short trigger-phrases, not full explanations. The body is loaded on-demand — only the description pays the always-on cost.
- [ ] **Agent model allocation**: Are expensive models (opus) used only where reasoning depth is needed? Mechanical tasks (test running, simple implementation) should use cheaper models (sonnet/haiku).
- [ ] **Subagent usage patterns**: Are subagents being used to offload work to cheaper models? Could more work be delegated to sonnet/haiku subagents?
- [ ] **Prompt cache efficiency**: Are there patterns that would break prompt caching? (e.g., frequently changing system-level content, model switching mid-conversation)
- [ ] **Memory vs. re-discovery**: Are learnings being persisted to memory, or is Claude re-discovering the same things across sessions (wasting tokens on repeated exploration)?
- [ ] **Skill progressive disclosure**: Are large instruction sets behind skills (loaded on-demand) or front-loaded in CLAUDE.md (loaded every turn)?
- [ ] **Duplicate context**: Same information in CLAUDE.md AND skill files AND agent files means it's loaded 2-3x. Consolidate to single source.
- [ ] **Conversation hygiene**: Are there patterns that lead to unnecessarily long conversations? (e.g., verbose artifact formats, excessive confirmation loops)

## C. Skills — Progressive Disclosure

- [ ] **YAML frontmatter**: Every skill has a `name` and `description` in frontmatter (these are what get pre-loaded into context).
- [ ] **Description quality**: Descriptions are specific enough to trigger on the right tasks and not trigger on wrong ones.
- [ ] **Description brevity**: Descriptions should be short. Long descriptions waste tokens on every turn. Move details into the skill body.
- [ ] **Reference files**: Complex skills use separate reference files loaded on-demand rather than putting everything in SKILL.md.
- [ ] **Cross-references**: Skills that depend on each other explicitly reference the dependency.
- [ ] **Coverage**: Common workflows the user performs frequently should have skills (PR creation, ticket start, deployment, etc.).
- [ ] **Staleness**: Skills that reference deprecated tools, old APIs, or retired workflows.

## D. Agents — Model & Role Allocation

- [ ] **Model selection**: Agents doing complex reasoning (planning, architecture, review) should use capable models. Agents doing mechanical work (running tests, simple implementations) can use faster/cheaper models.
- [ ] **Role clarity**: Each agent has a clear, non-overlapping charter. No two agents should do the same thing.
- [ ] **Boundaries**: Agents specify what they should NOT do, preventing scope creep.
- [ ] **Reference loading**: Agents load only the references they need for their stage.
- [ ] **Model freshness**: Are agent model references using the latest available models? Older model IDs may be deprecated or suboptimal.

## E. Hooks — Automation & Safety

- [ ] **Branch protection**: A hook preventing commits to main/master (mechanical enforcement, not just a CLAUDE.md rule).
- [ ] **Pre-commit checks**: Linting, compilation, or format checks before commits.
- [ ] **Safety gates**: Destructive operations (force push, delete) gated by hooks rather than relying on CLAUDE.md instructions alone.
- [ ] **Hook existence**: If there are zero hooks, that's a missed opportunity. Even one or two high-value hooks significantly improve safety and consistency.
- [ ] **Hook efficiency**: Hooks should be fast. Slow hooks (full compile, full test suite) on every commit can hurt flow. Consider scoping hooks to changed files only.

## F. Permissions — Security Posture

- [ ] **Allow list hygiene**: No overly broad patterns that could be dangerous. Wildcards should be scoped.
- [ ] **Ask list coverage**: Destructive or irreversible operations (push, delete, deploy, secrets) are in the ask list.
- [ ] **Deny list**: Explicitly dangerous patterns are denied if applicable.
- [ ] **Project-level overrides**: Project-specific settings don't accidentally widen the global security posture.
- [ ] **MCP tool permissions**: If MCP servers are configured, their tools should have appropriate permission scoping.

## G. Memory — Knowledge Retention

- [ ] **Usage**: Memory files exist and are being actively used. An empty or near-empty MEMORY.md suggests missed learning opportunities.
- [ ] **Freshness**: Memory entries are current and relevant. Stale memories should be updated or removed.
- [ ] **Organization**: Memories are organized by topic, not chronologically. Each memory file has proper frontmatter (name, description, type).
- [ ] **Coverage**: Feedback memories (corrections and confirmations), project context, and user preferences are all represented.
- [ ] **No code/architecture snapshots**: Memory should not duplicate what can be derived from reading the codebase.
- [ ] **Token ROI**: Are the most frequently-useful learnings captured? Memory that prevents repeated 10-minute investigations pays for itself many times over.

## H. MCP Servers — Ecosystem & Integration

- [ ] **Installed servers**: What MCP servers are currently configured? Are they actively used?
- [ ] **Missing high-value servers**: Are there well-established, secure MCP servers that would add value for the user's workflows? Consider servers for: Version control (GitHub, GitLab), Project management (Jira, Linear), Documentation (Confluence, Notion), Monitoring/observability (Datadog, Grafana), Cloud infrastructure (AWS, GCP), Communication (Slack), Database access (Postgres, Redis).
- [ ] **Security posture**: MCP servers have access to external systems. Are credentials properly managed? Are servers from trusted sources?
- [ ] **Redundancy**: Is an MCP server providing capability that a built-in tool or skill already covers? Prefer built-in when equivalent.
- [ ] **Staleness**: Are MCP server versions current? Outdated servers may have security issues or miss new features.

## I. Context Budget — Overall Efficiency

- [ ] Count approximate lines/tokens in global CLAUDE.md
- [ ] Count skill descriptions (frontmatter only — these are always loaded)
- [ ] Count agent descriptions (frontmatter only — these are always loaded)
- [ ] Count MEMORY.md index entries
- [ ] Sum total always-loaded content and flag if it exceeds ~200 lines / ~4000 tokens
- [ ] Compare to previous audit if available — is the budget growing or shrinking?

## J. Insights Cross-Reference — Config vs. Friction

Check memory for an insights report baseline (look for a `reference` type memory about insights). If one exists:

- [ ] **Friction coverage**: For each top friction pattern in the baseline, verify there is a corresponding CLAUDE.md instruction, hook, or skill that addresses it. Flag any unaddressed friction.
- [ ] **Improvement tracking**: Compare the list of "improvements implemented" in the baseline against current config. Were any reverted or lost? Are they still present and correctly configured?
- [ ] **Backlog review**: Check the improvement backlog items. Have any become easier to implement since the last audit (e.g., new MCP servers, new Claude features)?
- [ ] **Staleness**: If the insights baseline is older than 90 days, recommend re-running `/insights` before the next audit to refresh the friction data.

If no insights baseline exists in memory, recommend running `/insights` first to establish one — config audits are more actionable when grounded in actual usage friction.
