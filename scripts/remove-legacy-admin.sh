#!/usr/bin/env bash
#
# Finishes the debug-recorder-admin → client integration cleanup.
#
# The admin app's features were migrated into client/ (see docs/redesign/) and
# every workspace/CI/build reference to debug-recorder-admin has already been
# removed. This script deletes the now-orphaned folder and refreshes the pnpm
# lockfile so `pnpm install --frozen-lockfile` keeps working in CI.
#
# Run once from the repo root:  bash scripts/remove-legacy-admin.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ -d debug-recorder-admin ]; then
  echo "› Removing debug-recorder-admin/ …"
  rm -rf debug-recorder-admin
else
  echo "› debug-recorder-admin/ already gone — skipping."
fi

echo "› Refreshing pnpm lockfile (workspace no longer includes the admin package) …"
pnpm install --lockfile-only

echo
echo "✓ Done. Now verify the unified client:"
echo "    pnpm typecheck"
echo "    cd client && pnpm test && pnpm build"
