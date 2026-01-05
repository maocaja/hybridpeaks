#!/bin/bash
# Manual validation script for export normalized endpoint (T007, T008)

set -e

BASE_URL="http://localhost:3000"
COACH_EMAIL="coach@test.com"
COACH_PASSWORD="password123"

echo "🔍 Manual Validation: Export Normalized Endpoint"
echo "=================================================="
echo ""

# Step 1: Login as coach (or register if needed)
echo "1️⃣  Logging in as coach..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$COACH_EMAIL\",
    \"password\": \"$COACH_PASSWORD\"
  }")

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken // empty')

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" = "null" ]; then
  echo "⚠️  Login failed, attempting to register..."
  REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$COACH_EMAIL\",
      \"password\": \"$COACH_PASSWORD\",
      \"role\": \"COACH\"
    }")
  
  ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.accessToken // empty')
  
  if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" = "null" ]; then
    echo "❌ Failed to register/login. Response:"
    echo "$REGISTER_RESPONSE" | jq '.'
    exit 1
  fi
  
  echo "✅ Registered and logged in"
else
  echo "✅ Logged in successfully"
fi

echo "✅ Logged in successfully"
echo ""

# Step 2: Get athletes list
echo "2️⃣  Fetching athletes list..."
ATHLETES_RESPONSE=$(curl -s -X GET "$BASE_URL/api/coach/athletes" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

ATHLETE_ID=$(echo "$ATHLETES_RESPONSE" | jq -r '.[0].id // empty')

if [ -z "$ATHLETE_ID" ] || [ "$ATHLETE_ID" = "null" ]; then
  echo "❌ No athletes found. Please run setup-test-data.sh first."
  echo "Response:"
  echo "$ATHLETES_RESPONSE" | jq '.'
  exit 1
fi

echo "✅ Found athlete: $ATHLETE_ID"
echo ""

# Step 3: Get sessions for this week
echo "3️⃣  Fetching sessions for this week..."
WEEK_START=$(date -v+Mon -v+0d +%Y-%m-%d 2>/dev/null || date -d "last monday" +%Y-%m-%d)
WEEK_END=$(date -v+Sun -v+0d +%Y-%m-%d 2>/dev/null || date -d "next sunday" +%Y-%m-%d)

SESSIONS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/coach/athletes/$ATHLETE_ID/sessions?from=$WEEK_START&to=$WEEK_END" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

# Find first ENDURANCE session
SESSION_ID=$(echo "$SESSIONS_RESPONSE" | jq -r '[.[] | select(.type == "ENDURANCE")][0].id // empty')

if [ -z "$SESSION_ID" ] || [ "$SESSION_ID" = "null" ]; then
  echo "⚠️  No ENDURANCE sessions found for this week."
  echo "Creating a test endurance session..."
  
  # Create a weekly plan with endurance session
  CREATE_PLAN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/coach/athletes/$ATHLETE_ID/weekly-plans" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"weekStart\": \"$WEEK_START\",
      \"sessions\": [
        {
          \"date\": \"$WEEK_START\",
          \"type\": \"ENDURANCE\",
          \"title\": \"Test Bike Intervals\",
          \"prescription\": {
            \"sport\": \"BIKE\",
            \"steps\": [
              {
                \"type\": \"WARMUP\",
                \"duration\": {
                  \"type\": \"TIME\",
                  \"value\": 600
                },
                \"primaryTarget\": {
                  \"kind\": \"POWER\",
                  \"unit\": \"WATTS\",
                  \"zone\": 1
                }
              },
              {
                \"type\": \"WORK\",
                \"duration\": {
                  \"type\": \"TIME\",
                  \"value\": 1800
                },
                \"primaryTarget\": {
                  \"kind\": \"POWER\",
                  \"unit\": \"WATTS\",
                  \"zone\": 3
                }
              }
            ]
          }
        }
      ]
    }")
  
  SESSION_ID=$(echo "$CREATE_PLAN_RESPONSE" | jq -r '.sessions[0].id // empty')
  
  if [ -z "$SESSION_ID" ] || [ "$SESSION_ID" = "null" ]; then
    echo "❌ Failed to create test session. Response:"
    echo "$CREATE_PLAN_RESPONSE" | jq '.'
    exit 1
  fi
  
  echo "✅ Created test endurance session: $SESSION_ID"
else
  echo "✅ Found endurance session: $SESSION_ID"
fi
echo ""

# Step 4: Call export normalized endpoint
echo "4️⃣  Calling export normalized endpoint..."
EXPORT_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$BASE_URL/api/coach/athletes/sessions/$SESSION_ID/export/normalized" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

HTTP_STATUS=$(echo "$EXPORT_RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
BODY=$(echo "$EXPORT_RESPONSE" | sed '/HTTP_STATUS:/d')

echo "HTTP Status: $HTTP_STATUS"
echo ""

if [ "$HTTP_STATUS" != "200" ]; then
  echo "❌ Request failed. Response:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  exit 1
fi

echo "✅ Request successful!"
echo ""

# Step 5: Validate response structure (T008)
echo "5️⃣  Validating response structure..."
echo ""

# Check required fields
HAS_SPORT=$(echo "$BODY" | jq -r 'has("sport")')
HAS_STEPS=$(echo "$BODY" | jq -r 'has("steps")')
SPORT_VALUE=$(echo "$BODY" | jq -r '.sport')
STEPS_COUNT=$(echo "$BODY" | jq -r '.steps | length')
FIRST_STEP_TYPE=$(echo "$BODY" | jq -r '.steps[0].type // empty')
FIRST_STEP_DURATION=$(echo "$BODY" | jq -r '.steps[0].duration.seconds // empty')

echo "Validation Results:"
echo "  ✓ Has 'sport' field: $HAS_SPORT"
echo "  ✓ Has 'steps' field: $HAS_STEPS"
echo "  ✓ Sport value: $SPORT_VALUE"
echo "  ✓ Steps count: $STEPS_COUNT"
echo "  ✓ First step type: $FIRST_STEP_TYPE"
echo "  ✓ First step duration (seconds): $FIRST_STEP_DURATION"
echo ""

if [ "$HAS_SPORT" != "true" ] || [ "$HAS_STEPS" != "true" ]; then
  echo "❌ Response structure validation failed!"
  exit 1
fi

if [ "$STEPS_COUNT" -eq 0 ]; then
  echo "⚠️  Warning: Steps array is empty"
fi

# Step 6: Display full response
echo "6️⃣  Full normalized workout response:"
echo "======================================"
echo "$BODY" | jq '.'
echo ""

echo "✅ Manual validation complete!"
echo ""
echo "Summary:"
echo "  - Endpoint: GET /api/coach/athletes/sessions/:sessionId/export/normalized"
echo "  - Status: $HTTP_STATUS"
echo "  - Structure: Valid"
echo "  - Session ID: $SESSION_ID"
echo ""

