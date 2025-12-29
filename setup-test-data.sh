#!/usr/bin/env bash
set -e

BASE_URL="http://localhost:3000/api"
COACH_EMAIL="coach@test.com"
ATHLETE_EMAIL="athlete@test.com"
PASSWORD="password123"

echo "🚀 Setting up HybridPeaks test data..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Try to login first, register if needed
echo -e "${BLUE}🔑 Step 1: Authenticating users...${NC}"

# Try coach login first
COACH_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$COACH_EMAIL\",\"password\":\"$PASSWORD\"}")

COACH_TOKEN=$(echo "$COACH_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4 || echo "")

if [ -z "$COACH_TOKEN" ]; then
  echo "ℹ️  Coach login failed, attempting registration..."
  COACH_REGISTER=$(curl -s -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$COACH_EMAIL\",\"password\":\"$PASSWORD\",\"role\":\"COACH\"}")
  
  if echo "$COACH_REGISTER" | grep -q "already exists\|duplicate\|Email already"; then
    echo "❌ Coach already exists with different password"
    echo "   Please delete user or reset password manually"
    exit 1
  fi
  
  # Retry login after registration
  COACH_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$COACH_EMAIL\",\"password\":\"$PASSWORD\"}")
  COACH_TOKEN=$(echo "$COACH_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4 || echo "")
  
  if [ -z "$COACH_TOKEN" ]; then
    echo "❌ Failed to authenticate coach after registration"
    exit 1
  fi
  echo "✅ Coach registered and authenticated"
else
  echo "✅ Coach authenticated (existing user)"
fi

# Try athlete login first
ATHLETE_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ATHLETE_EMAIL\",\"password\":\"$PASSWORD\"}")

ATHLETE_TOKEN=$(echo "$ATHLETE_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4 || echo "")

if [ -z "$ATHLETE_TOKEN" ]; then
  echo "ℹ️  Athlete login failed, attempting registration..."
  ATHLETE_REGISTER=$(curl -s -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ATHLETE_EMAIL\",\"password\":\"$PASSWORD\",\"role\":\"ATHLETE\"}")
  
  if echo "$ATHLETE_REGISTER" | grep -q "already exists\|duplicate\|Email already"; then
    echo "❌ Athlete already exists with different password"
    echo "   Please delete user or reset password manually"
    exit 1
  fi
  
  # Retry login after registration
  ATHLETE_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ATHLETE_EMAIL\",\"password\":\"$PASSWORD\"}")
  ATHLETE_TOKEN=$(echo "$ATHLETE_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4 || echo "")
  
  if [ -z "$ATHLETE_TOKEN" ]; then
    echo "❌ Failed to authenticate athlete after registration"
    exit 1
  fi
  echo "✅ Athlete registered and authenticated"
else
  echo "✅ Athlete authenticated (existing user)"
fi
echo ""

# 3. Coach invites athlete (or skip if already linked)
echo -e "${BLUE}📧 Step 3: Coach inviting athlete...${NC}"
INVITE_RESPONSE=$(curl -s -X POST "$BASE_URL/coach/athletes/invite" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $COACH_TOKEN" \
  -d "{\"email\":\"$ATHLETE_EMAIL\"}")

INVITE_TOKEN=$(echo "$INVITE_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4 || echo "")
if [ -z "$INVITE_TOKEN" ]; then
  if echo "$INVITE_RESPONSE" | grep -q "already in your roster\|already linked"; then
    echo "ℹ️  Athlete already linked to coach. Skipping invitation..."
  else
    echo "❌ Failed to create invitation. Response: $INVITE_RESPONSE"
    echo "   Continuing anyway..."
  fi
else
  echo "✅ Invitation created"
  
  # 4. Athlete accepts invitation
  echo -e "${BLUE}✅ Step 4: Athlete accepting invitation...${NC}"
  ACCEPT_RESPONSE=$(curl -s -X POST "$BASE_URL/athlete/invitations/accept" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ATHLETE_TOKEN" \
    -d "{\"token\":\"$INVITE_TOKEN\"}")
  
  if echo "$ACCEPT_RESPONSE" | grep -q "error\|Error\|ERROR"; then
    echo "⚠️  Warning: $ACCEPT_RESPONSE"
  else
    echo "✅ Invitation accepted"
  fi
fi
echo ""

# 5. Get athlete ID
echo -e "${BLUE}👤 Step 5: Getting athlete ID...${NC}"
ATHLETES_LIST=$(curl -s -X GET "$BASE_URL/coach/athletes" \
  -H "Authorization: Bearer $COACH_TOKEN")

# Extract athlete ID - the endpoint returns id which is the userId
if command -v jq &> /dev/null; then
  ATHLETE_ID=$(echo "$ATHLETES_LIST" | jq -r '.[0].id // empty' 2>/dev/null || echo "")
else
  # Fallback to grep if jq is not available
  ATHLETE_ID=$(echo "$ATHLETES_LIST" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4 || echo "")
fi

if [ -z "$ATHLETE_ID" ]; then
  echo "⚠️  Could not extract athlete ID. Response: $ATHLETES_LIST"
  echo "   Continuing anyway (benchmarks and plans will be skipped)..."
else
  echo "✅ Athlete ID: $ATHLETE_ID"
fi
echo ""

# 6. Create exercises
echo -e "${BLUE}💪 Step 6: Creating exercises...${NC}"

# Back Squat
SQUAT_RESPONSE=$(curl -s -X POST "$BASE_URL/exercises" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $COACH_TOKEN" \
  -d '{
    "name": "Back Squat",
    "type": "STRENGTH",
    "modality": "GYM",
    "description": "Barbell back squat",
    "primaryMuscles": ["Quadriceps", "Glutes", "Core"]
  }')

SQUAT_ID=$(echo "$SQUAT_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4 || echo "")
if [ -n "$SQUAT_ID" ]; then
  echo "✅ Back Squat created (ID: $SQUAT_ID)"
else
  echo "⚠️  Back Squat may already exist"
fi

# Deadlift
DEADLIFT_RESPONSE=$(curl -s -X POST "$BASE_URL/exercises" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $COACH_TOKEN" \
  -d '{
    "name": "Deadlift",
    "type": "STRENGTH",
    "modality": "GYM",
    "description": "Conventional deadlift",
    "primaryMuscles": ["Hamstrings", "Glutes", "Back", "Core"]
  }')

DEADLIFT_ID=$(echo "$DEADLIFT_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4 || echo "")
if [ -n "$DEADLIFT_ID" ]; then
  echo "✅ Deadlift created (ID: $DEADLIFT_ID)"
else
  echo "⚠️  Deadlift may already exist"
fi

# Zone 2 Bike
BIKE_RESPONSE=$(curl -s -X POST "$BASE_URL/exercises" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $COACH_TOKEN" \
  -d '{
    "name": "Zone 2 Bike",
    "type": "ENDURANCE",
    "modality": "BIKE",
    "description": "Aerobic base building ride"
  }')

BIKE_ID=$(echo "$BIKE_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4 || echo "")
if [ -n "$BIKE_ID" ]; then
  echo "✅ Zone 2 Bike created (ID: $BIKE_ID)"
else
  echo "⚠️  Zone 2 Bike may already exist"
fi

# Zone 2 Run
RUN_RESPONSE=$(curl -s -X POST "$BASE_URL/exercises" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $COACH_TOKEN" \
  -d '{
    "name": "Zone 2 Run",
    "type": "ENDURANCE",
    "modality": "RUN",
    "description": "Aerobic base building run"
  }')

RUN_ID=$(echo "$RUN_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4 || echo "")
if [ -n "$RUN_ID" ]; then
  echo "✅ Zone 2 Run created (ID: $RUN_ID)"
else
  echo "⚠️  Zone 2 Run may already exist"
fi
echo ""

# 7. Set benchmarks
echo -e "${BLUE}📊 Step 7: Setting athlete benchmarks...${NC}"

if [ -n "$ATHLETE_ID" ]; then
  # FTP
  curl -s -X POST "$BASE_URL/coach/athletes/$ATHLETE_ID/benchmarks" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $COACH_TOKEN" \
    -d '{
      "key": "FTP",
      "value": 250,
      "unit": "watts",
      "measuredAt": "2025-12-29T00:00:00Z"
    }' > /dev/null
  echo "✅ FTP set: 250 watts"

  # HR Max
  curl -s -X POST "$BASE_URL/coach/athletes/$ATHLETE_ID/benchmarks" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $COACH_TOKEN" \
    -d '{
      "key": "HR_MAX",
      "value": 185,
      "unit": "bpm",
      "measuredAt": "2025-12-29T00:00:00Z"
    }' > /dev/null
  echo "✅ HR Max set: 185 bpm"

  # HR Rest
  curl -s -X POST "$BASE_URL/coach/athletes/$ATHLETE_ID/benchmarks" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $COACH_TOKEN" \
    -d '{
      "key": "HR_REST",
      "value": 45,
      "unit": "bpm",
      "measuredAt": "2025-12-29T00:00:00Z"
    }' > /dev/null
  echo "✅ HR Rest set: 45 bpm"

  # 1RM Back Squat
  if [ -n "$SQUAT_ID" ]; then
    curl -s -X POST "$BASE_URL/coach/athletes/$ATHLETE_ID/benchmarks" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $COACH_TOKEN" \
      -d "{
        \"key\": \"ONE_RM\",
        \"context\": \"Back Squat\",
        \"value\": 140,
        \"unit\": \"kg\",
        \"measuredAt\": \"2025-12-29T00:00:00Z\"
      }" > /dev/null
    echo "✅ 1RM Back Squat set: 140 kg"
  fi

  # 1RM Deadlift
  if [ -n "$DEADLIFT_ID" ]; then
    curl -s -X POST "$BASE_URL/coach/athletes/$ATHLETE_ID/benchmarks" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $COACH_TOKEN" \
      -d "{
        \"key\": \"ONE_RM\",
        \"context\": \"Deadlift\",
        \"value\": 180,
        \"unit\": \"kg\",
        \"measuredAt\": \"2025-12-29T00:00:00Z\"
      }" > /dev/null
    echo "✅ 1RM Deadlift set: 180 kg"
  fi
else
  echo "⚠️  Skipping benchmarks (athlete ID not found)"
fi
echo ""

# 8. Create weekly plan with sessions
echo -e "${BLUE}📅 Step 8: Creating weekly training plan...${NC}"

# Calculate next Monday
TODAY=$(date +%Y-%m-%d)
NEXT_MONDAY=$(date -v+Mon +%Y-%m-%d 2>/dev/null || date -d "next monday" +%Y-%m-%d 2>/dev/null || echo "2025-12-30")

if [ -n "$ATHLETE_ID" ] && [ -n "$SQUAT_ID" ]; then
  PLAN_RESPONSE=$(curl -s -X POST "$BASE_URL/coach/athletes/$ATHLETE_ID/weekly-plans" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $COACH_TOKEN" \
    -d "{
      \"weekStart\": \"$NEXT_MONDAY\",
      \"notes\": \"Week 1 - Base building phase\",
      \"sessions\": [
        {
          \"date\": \"$NEXT_MONDAY\",
          \"type\": \"STRENGTH\",
          \"title\": \"Lower Body Strength\",
          \"prescription\": {
            \"items\": [
              {
                \"exerciseId\": \"$SQUAT_ID\",
                \"exerciseNameSnapshot\": \"Back Squat\",
                \"sets\": 4,
                \"reps\": 8,
                \"targetLoadType\": \"PERCENT_1RM\",
                \"targetValue\": 80,
                \"restSeconds\": 180
              }
            ]
          }
        },
        {
          \"date\": \"$(date -v+1d -j -f '%Y-%m-%d' '$NEXT_MONDAY' +%Y-%m-%d 2>/dev/null || date -d \"$NEXT_MONDAY +1 day\" +%Y-%m-%d 2>/dev/null || echo \"$NEXT_MONDAY\")\",
          \"type\": \"ENDURANCE\",
          \"title\": \"Zone 2 Bike\",
          \"prescription\": {
            \"modality\": \"BIKE\",
            \"warmup\": \"10 min easy spin\",
            \"intervals\": [
              {
                \"durationSeconds\": 3600,
                \"targetType\": \"POWER\",
                \"targetZoneOrValue\": \"65-75% FTP (163-188W)\"
              }
            ],
            \"cooldown\": \"10 min easy spin\"
          }
        },
        {
          \"date\": \"$(date -v+2d -j -f '%Y-%m-%d' '$NEXT_MONDAY' +%Y-%m-%d 2>/dev/null || date -d \"$NEXT_MONDAY +2 days\" +%Y-%m-%d 2>/dev/null || echo \"$NEXT_MONDAY\")\",
          \"type\": \"STRENGTH\",
          \"title\": \"Upper Body Strength\",
          \"prescription\": {
            \"items\": [
              {
                \"exerciseId\": \"$DEADLIFT_ID\",
                \"exerciseNameSnapshot\": \"Deadlift\",
                \"sets\": 3,
                \"reps\": 5,
                \"targetLoadType\": \"PERCENT_1RM\",
                \"targetValue\": 85,
                \"restSeconds\": 240
              }
            ]
          }
        },
        {
          \"date\": \"$(date -v+3d -j -f '%Y-%m-%d' '$NEXT_MONDAY' +%Y-%m-%d 2>/dev/null || date -d \"$NEXT_MONDAY +3 days\" +%Y-%m-%d 2>/dev/null || echo \"$NEXT_MONDAY\")\",
          \"type\": \"ENDURANCE\",
          \"title\": \"Zone 2 Run\",
          \"prescription\": {
            \"modality\": \"RUN\",
            \"warmup\": \"5 min easy jog\",
            \"intervals\": [
              {
                \"durationSeconds\": 2700,
                \"targetType\": \"HR\",
                \"targetZoneOrValue\": \"Zone 2 (65-75% HR Max)\"
              }
            ],
            \"cooldown\": \"5 min easy walk\"
          }
        }
      ]
    }")

  PLAN_ID=$(echo "$PLAN_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4 || echo "")
  if [ -n "$PLAN_ID" ]; then
    echo "✅ Weekly plan created (ID: $PLAN_ID)"
    echo "   Week starts: $NEXT_MONDAY"
    echo "   Sessions: 4 (2 strength, 2 endurance)"
  else
    echo "⚠️  Plan may already exist or error occurred"
    echo "   Response: $PLAN_RESPONSE" | head -c 200
  fi
else
  echo "⚠️  Skipping plan creation (missing athlete ID or exercise ID)"
fi
echo ""

# Summary
echo -e "${GREEN}✅ Test data setup complete!${NC}"
echo ""
echo -e "${YELLOW}📋 Summary:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Coach Email:    $COACH_EMAIL"
echo "Athlete Email:  $ATHLETE_EMAIL"
echo "Password:       $PASSWORD"
echo ""
if [ -n "$ATHLETE_ID" ]; then
  echo "Athlete ID:     $ATHLETE_ID"
fi
if [ -n "$SQUAT_ID" ]; then
  echo "Back Squat ID:  $SQUAT_ID"
fi
if [ -n "$PLAN_ID" ]; then
  echo "Weekly Plan ID: $PLAN_ID"
fi
echo ""
echo -e "${YELLOW}🔗 Quick Links:${NC}"
echo "Coach Web:      http://localhost:5173"
echo "Athlete PWA:    http://localhost:5174"
echo "Backend API:    http://localhost:3000/api"
echo ""
echo -e "${YELLOW}🧪 Test Commands:${NC}"
echo "# View today's sessions (athlete):"
echo "curl -H \"Authorization: Bearer $ATHLETE_TOKEN\" $BASE_URL/athlete/today"
echo ""
echo "# View athlete roster (coach):"
echo "curl -H \"Authorization: Bearer $COACH_TOKEN\" $BASE_URL/coach/athletes"
echo ""
echo -e "${GREEN}Happy testing! 🚀${NC}"

