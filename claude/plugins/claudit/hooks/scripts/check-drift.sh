#!/bin/bash
# claudit drift detector — SessionStart hook
# Compares current config metrics against the baseline written by the last /claudit run.
# Prints a reminder if the audit is stale or the config has changed substantially.
# Silently exits if no baseline exists or all thresholds are clear.

BASELINE="$HOME/.claude/claudit-baseline.json"

[ -f "$BASELINE" ] || exit 0

# Days since last audit
last_audit=$(python3 -c "
import json
try:
    d = json.load(open('$BASELINE'))
    print(d.get('last_audit', ''))
except:
    print('')
" 2>/dev/null)

[ -n "$last_audit" ] || exit 0

days_since=$(python3 -c "
from datetime import date
try:
    audit = date.fromisoformat('$last_audit')
    print((date.today() - audit).days)
except:
    print(0)
" 2>/dev/null)
days_since=${days_since:-0}

# Collect current counts (names and content never leave this script)
skills_count=$(find ~/.claude/skills ~/.claude/plugins -name "SKILL.md" 2>/dev/null | wc -l | tr -d ' ')
agents_count=$(find ~/.claude/agents ~/.claude/plugins -name "*.md" -path "*/agents/*" 2>/dev/null | wc -l | tr -d ' ')
plugins_count=$(find ~/.claude/plugins -maxdepth 3 -name "plugin.json" 2>/dev/null | wc -l | tr -d ' ')
mcp_count=$(python3 -c "
import json, glob, os
count = 0
for f in glob.glob(os.path.expanduser('~/.claude/settings*.json')):
    try:
        count += len(json.load(open(f)).get('mcpServers', {}))
    except: pass
print(count)
" 2>/dev/null || echo 0)
global_md_lines=$(wc -l < ~/.claude/CLAUDE.md 2>/dev/null | tr -d ' ' || echo 0)
memory_count=$(find ~/.claude/projects -name "*.md" -path "*/memory/*" 2>/dev/null | wc -l | tr -d ' ')
settings_lines=$(wc -l < ~/.claude/settings.json 2>/dev/null | tr -d ' ' || echo 0)

# Compute drift score (average % change across all tracked dimensions)
drift_pct=$(python3 -c "
import json
try:
    m = json.load(open('$BASELINE')).get('metrics', {})
except:
    print(0)
    exit()

current = {
    'skills_count': $skills_count,
    'agents_count': $agents_count,
    'plugins_count': $plugins_count,
    'mcp_servers_count': $mcp_count,
    'global_claude_md_lines': $global_md_lines,
    'memory_files_count': $memory_count,
    'settings_json_lines': $settings_lines,
}

deltas = []
for k, cur in current.items():
    base = m.get(k, 0)
    if base > 0:
        deltas.append(abs(cur - base) / base * 100)

print(int(sum(deltas) / len(deltas)) if deltas else 0)
" 2>/dev/null || echo 0)

# Decision — only one message per session, pick the most urgent
if [ "$days_since" -gt 30 ]; then
    echo "⚠️  claudit: Last audit was ${days_since} days ago. Run /claudit to refresh."
elif [ "$drift_pct" -gt 40 ]; then
    echo "⚠️  claudit: Config has changed substantially since the last audit (${drift_pct}% drift). Consider running /claudit."
elif [ "$drift_pct" -gt 20 ] && [ "$days_since" -gt 15 ]; then
    echo "💡 claudit: Significant config changes detected (${drift_pct}% drift, ${days_since}d ago). Consider running /claudit sooner."
fi

exit 0
