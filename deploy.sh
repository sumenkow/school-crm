#!/bin/bash
set -e
echo "1. Staging files..."
git add -A
echo "2. Committing..."
git commit -m "feat: complete Supabase dual-write integration, dev role, and mock data cleanup"
echo "3. Pushing to GitHub..."
git push origin main
echo "DONE! Everything pushed to GitHub."
