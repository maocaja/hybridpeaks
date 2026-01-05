#!/usr/bin/env bash
set -e

echo "🔄 Resetting test users..."
echo ""
echo "This script will delete and recreate test users."
echo "⚠️  Make sure the backend is running and you have database access."
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Cancelled."
  exit 0
fi

cd backend

echo ""
echo "📝 Deleting existing test users..."

# Delete users via Prisma (requires direct DB access or Prisma CLI)
# For now, we'll use a SQL approach if psql is available, or provide instructions

if command -v psql &> /dev/null; then
  DATABASE_URL=$(grep DATABASE_URL .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
  if [ -n "$DATABASE_URL" ]; then
    echo "Deleting users from database..."
    psql "$DATABASE_URL" -c "DELETE FROM users WHERE email IN ('coach@test.com', 'athlete@test.com');" 2>/dev/null || echo "⚠️  Could not delete via psql. Please delete manually via Prisma Studio."
  else
    echo "⚠️  DATABASE_URL not found in .env"
  fi
else
  echo "⚠️  psql not found. Please delete users manually:"
  echo ""
  echo "Option 1: Prisma Studio"
  echo "  cd backend && npx prisma studio"
  echo "  Then delete: coach@test.com and athlete@test.com"
  echo ""
  echo "Option 2: SQL directly"
  echo "  Connect to your database and run:"
  echo "  DELETE FROM users WHERE email IN ('coach@test.com', 'athlete@test.com');"
  echo ""
  read -p "Press Enter after deleting users to continue with registration..."
fi

echo ""
echo "📝 Creating new test users..."

# Create coach
COACH_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"coach@test.com","password":"password123","role":"COACH"}')

if echo "$COACH_RESPONSE" | grep -q "already exists\|Email already"; then
  echo "⚠️  Coach already exists. Skipping..."
else
  echo "✅ Coach created"
fi

# Create athlete
ATHLETE_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"athlete@test.com","password":"password123","role":"ATHLETE"}')

if echo "$ATHLETE_RESPONSE" | grep -q "already exists\|Email already"; then
  echo "⚠️  Athlete already exists. Skipping..."
else
  echo "✅ Athlete created"
fi

echo ""
echo "✅ Test users reset complete!"
echo ""
echo "You can now log in with:"
echo "  Email: athlete@test.com"
echo "  Password: password123"
echo ""
echo "Or run ./setup-test-data.sh to set up the full test environment."


