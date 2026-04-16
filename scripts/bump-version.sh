#!/usr/bin/env bash
# Bump plugin version across all manifest files.
# Usage: ./scripts/bump-version.sh <new-version>
# Example: ./scripts/bump-version.sh 1.0.2
#
# Files updated:
#   1. .claude-plugin/marketplace.json  (top-level version + plugins[0].version)
#   2. plugins/agent-bridge/.claude-plugin/plugin.json  (version)
#   3. package.json  (version)

set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <new-version>"
  echo "Example: $0 1.0.2"
  exit 1
fi

NEW_VERSION="$1"

# Validate semver-ish format
if ! echo "$NEW_VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
  echo "Error: version must be semver (e.g. 1.0.2)"
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# 1. marketplace.json — top-level version
MARKETPLACE="$ROOT/.claude-plugin/marketplace.json"
if [ -f "$MARKETPLACE" ]; then
  tmp=$(mktemp)
  # Update top-level "version" and plugins[0].version
  node -e "
    const fs = require('fs');
    const m = JSON.parse(fs.readFileSync('$MARKETPLACE', 'utf8'));
    m.version = '$NEW_VERSION';
    if (m.plugins && m.plugins[0]) m.plugins[0].version = '$NEW_VERSION';
    fs.writeFileSync('$MARKETPLACE', JSON.stringify(m, null, 2) + '\n');
  "
  echo "Updated $MARKETPLACE"
else
  echo "Warning: $MARKETPLACE not found"
fi

# 2. plugin.json
PLUGIN_JSON="$ROOT/plugins/agent-bridge/.claude-plugin/plugin.json"
if [ -f "$PLUGIN_JSON" ]; then
  node -e "
    const fs = require('fs');
    const p = JSON.parse(fs.readFileSync('$PLUGIN_JSON', 'utf8'));
    p.version = '$NEW_VERSION';
    fs.writeFileSync('$PLUGIN_JSON', JSON.stringify(p, null, 2) + '\n');
  "
  echo "Updated $PLUGIN_JSON"
else
  echo "Warning: $PLUGIN_JSON not found"
fi

# 3. package.json
PACKAGE_JSON="$ROOT/package.json"
if [ -f "$PACKAGE_JSON" ]; then
  node -e "
    const fs = require('fs');
    const p = JSON.parse(fs.readFileSync('$PACKAGE_JSON', 'utf8'));
    p.version = '$NEW_VERSION';
    fs.writeFileSync('$PACKAGE_JSON', JSON.stringify(p, null, 2) + '\n');
  "
  echo "Updated $PACKAGE_JSON"
else
  echo "Warning: $PACKAGE_JSON not found"
fi

echo ""
echo "All files bumped to v$NEW_VERSION"
echo "Next: commit and push to release."
