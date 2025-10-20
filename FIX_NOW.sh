#!/bin/bash
# FASTEST FIX - Remove env files from git history

echo "🚀 Quick fix starting..."

# Go to the commit before the problem
git checkout 2fd93e4

# Remove the files
git rm .env.backup-20251013-235229 .env.backup-email-fix .env.bak 2>/dev/null || true

# Amend that commit
git commit --amend --no-edit

# Note the new commit hash
NEW_HASH=$(git rev-parse HEAD)
echo "New commit hash: $NEW_HASH"

# Go back to main
git checkout main

# Rebase onto the fixed commit
git rebase --onto $NEW_HASH 2fd93e4

echo "✅ Done! Now try: git push --force-with-lease"

