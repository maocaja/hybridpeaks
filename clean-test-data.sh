#!/usr/bin/env bash
set -e

echo "🧹 Cleaning HybridPeaks test data..."
echo ""
echo "⚠️  This will delete test users from the database."
echo "    Make sure the backend is running."
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Cancelled."
  exit 0
fi

# This script requires direct database access or an admin endpoint
# For now, we'll provide instructions to clean via Prisma Studio or SQL

echo ""
echo "To clean test data, you have two options:"
echo ""
echo "Option 1: Use Prisma Studio (Recommended)"
echo "  cd backend"
echo "  npx prisma studio"
echo "  Then delete users: coach@test.com and athlete@test.com"
echo ""
echo "Option 2: Use SQL directly"
echo "  Connect to your database and run:"
echo "  DELETE FROM users WHERE email IN ('coach@test.com', 'athlete@test.com');"
echo ""
echo "After cleaning, run ./setup-test-data.sh again."

