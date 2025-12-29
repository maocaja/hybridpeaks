# Guía de Pruebas - HybridPeaks

Esta guía te ayuda a probar todos los endpoints y flujos del sistema.

## 🚀 Inicio Rápido

### 1. Levantar el stack completo

```bash
./dev.sh
```

Esto levanta:
- Backend: `http://localhost:3000/api`
- Coach Web: `http://localhost:5173`
- Athlete PWA: `http://localhost:5174`

### 2. Configurar datos de prueba (Automático)

**Opción A: Script automatizado (Recomendado)**

```bash
./setup-test-data.sh
```

Este script crea automáticamente:
- ✅ Usuarios (coach y athlete)
- ✅ Invitación y vinculación
- ✅ Ejercicios (Back Squat, Deadlift, Zone 2 Bike, Zone 2 Run)
- ✅ Benchmarks (FTP, HR Max, HR Rest, 1RM)
- ✅ Plan semanal con 4 sesiones

**Si los usuarios ya existen**, limpia primero:
```bash
# Opción 1: Prisma Studio (recomendado)
cd backend && npx prisma studio
# Luego elimina: coach@test.com y athlete@test.com

# Opción 2: SQL directo
# DELETE FROM users WHERE email IN ('coach@test.com', 'athlete@test.com');
```

**Opción B: Crear usuarios manualmente**

```bash
# Crear coach
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "coach@test.com",
    "password": "password123",
    "role": "COACH"
  }'

# Crear athlete
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "athlete@test.com",
    "password": "password123",
    "role": "ATHLETE"
  }'
```

### 3. Obtener tokens

```bash
# Token del coach
COACH_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"coach@test.com","password":"password123"}' \
  | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

# Token del athlete
ATHLETE_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"athlete@test.com","password":"password123"}' \
  | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

echo "Coach token: $COACH_TOKEN"
echo "Athlete token: $ATHLETE_TOKEN"
```

---

## 📋 Flujos de Prueba Completos

### Flujo 1: Coach invita y gestiona atleta

```bash
# 1. Coach invita atleta
INVITE_RESPONSE=$(curl -s -X POST http://localhost:3000/api/coach/athletes/invite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $COACH_TOKEN" \
  -d '{"email":"athlete@test.com"}')

INVITE_TOKEN=$(echo $INVITE_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo "Invitation token: $INVITE_TOKEN"

# 2. Athlete acepta invitación
curl -X POST http://localhost:3000/api/athlete/invitations/accept \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ATHLETE_TOKEN" \
  -d "{\"token\":\"$INVITE_TOKEN\"}"

# 3. Coach lista sus atletas
curl -X GET http://localhost:3000/api/coach/athletes \
  -H "Authorization: Bearer $COACH_TOKEN"
```

### Flujo 2: Coach crea ejercicios

```bash
# Crear ejercicio de fuerza
curl -X POST http://localhost:3000/api/exercises \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $COACH_TOKEN" \
  -d '{
    "name": "Back Squat",
    "type": "STRENGTH",
    "modality": "GYM",
    "description": "Barbell back squat",
    "primaryMuscles": ["Quadriceps", "Glutes"]
  }'

# Crear ejercicio de resistencia
curl -X POST http://localhost:3000/api/exercises \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $COACH_TOKEN" \
  -d '{
    "name": "Zone 2 Bike",
    "type": "ENDURANCE",
    "modality": "BIKE",
    "description": "Aerobic base building"
  }'

# Listar ejercicios
curl -X GET "http://localhost:3000/api/exercises?type=STRENGTH" \
  -H "Authorization: Bearer $COACH_TOKEN"
```

### Flujo 3: Coach establece benchmarks del atleta

```bash
# Obtener ID del atleta
ATHLETE_ID=$(curl -s -X GET http://localhost:3000/api/coach/athletes \
  -H "Authorization: Bearer $COACH_TOKEN" \
  | grep -o '"userId":"[^"]*' | head -1 | cut -d'"' -f4)

# Establecer FTP
curl -X POST "http://localhost:3000/api/coach/athletes/$ATHLETE_ID/benchmarks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $COACH_TOKEN" \
  -d '{
    "key": "FTP",
    "value": 250,
    "unit": "watts",
    "measuredAt": "2025-12-29T00:00:00Z"
  }'

# Establecer 1RM de Squat
curl -X POST "http://localhost:3000/api/coach/athletes/$ATHLETE_ID/benchmarks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $COACH_TOKEN" \
  -d '{
    "key": "ONE_RM",
    "context": "Back Squat",
    "value": 140,
    "unit": "kg",
    "measuredAt": "2025-12-29T00:00:00Z"
  }'
```

### Flujo 4: Coach crea plan semanal

```bash
# Obtener ID del ejercicio (ajusta según tu ejercicio creado)
EXERCISE_ID="<ID_DEL_EJERCICIO>"  # Reemplaza con el ID real

# Crear plan semanal con sesiones
curl -X POST "http://localhost:3000/api/coach/athletes/$ATHLETE_ID/weekly-plans" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $COACH_TOKEN" \
  -d '{
    "weekStart": "2025-12-30",
    "notes": "Week 1 - Base building",
    "sessions": [
      {
        "date": "2025-12-30",
        "type": "STRENGTH",
        "title": "Lower Body Strength",
        "prescription": {
          "items": [
            {
              "exerciseId": "'"$EXERCISE_ID"'",
              "exerciseNameSnapshot": "Back Squat",
              "sets": 4,
              "reps": 8,
              "targetLoadType": "PERCENT_1RM",
              "targetValue": 80,
              "restSeconds": 180
            }
          ]
        }
      },
      {
        "date": "2025-12-31",
        "type": "ENDURANCE",
        "title": "Zone 2 Bike",
        "prescription": {
          "modality": "BIKE",
          "warmup": "10 min easy",
          "intervals": [
            {
              "durationSeconds": 3600,
              "targetType": "POWER",
              "targetZoneOrValue": "65-75% FTP"
            }
          ],
          "cooldown": "10 min easy"
        }
      }
    ]
  }'
```

### Flujo 5: Athlete ve y ejecuta sesiones

```bash
# Athlete ve sesiones de hoy
curl -X GET http://localhost:3000/api/athlete/today \
  -H "Authorization: Bearer $ATHLETE_TOKEN"

# Athlete ve resumen semanal
curl -X GET "http://localhost:3000/api/athlete/week-summary?weekStart=2025-12-30" \
  -H "Authorization: Bearer $ATHLETE_TOKEN"

# Athlete marca sesión como completada
SESSION_ID="<ID_DE_LA_SESION>"  # Reemplaza con el ID real
curl -X PATCH "http://localhost:3000/api/athlete/sessions/$SESSION_ID/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ATHLETE_TOKEN" \
  -d '{"status":"COMPLETED"}'

# Athlete registra log de sesión
curl -X POST "http://localhost:3000/api/athlete/sessions/$SESSION_ID/log" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ATHLETE_TOKEN" \
  -d '{
    "summary": {
      "completed": true,
      "rpe": 7,
      "notes": "Felt good, completed all sets"
    }
  }'
```

### Flujo 6: Coach monitorea atleta

```bash
# Coach ve sesiones del atleta en un rango
curl -X GET "http://localhost:3000/api/coach/athletes/$ATHLETE_ID/sessions?from=2025-12-30&to=2026-01-05" \
  -H "Authorization: Bearer $COACH_TOKEN"

# Coach ve resumen semanal del atleta
curl -X GET "http://localhost:3000/api/coach/athletes/$ATHLETE_ID/week-summary?weekStart=2025-12-30" \
  -H "Authorization: Bearer $COACH_TOKEN"

# Coach ve log de una sesión específica
curl -X GET "http://localhost:3000/api/coach/athletes/$ATHLETE_ID/sessions/$SESSION_ID/log" \
  -H "Authorization: Bearer $COACH_TOKEN"
```

---

## 🧪 Pruebas en el Frontend

### Coach Web (`http://localhost:5173`)

1. **Login:**
   - Email: `coach@test.com`
   - Password: `password123`

2. **Funcionalidades disponibles:**
   - Login/Logout
   - (Interfaz completa pendiente de implementación)

### Athlete PWA (`http://localhost:5174`)

1. **Login:**
   - Email: `athlete@test.com`
   - Password: `password123`

2. **Funcionalidades disponibles:**
   - ✅ Login/Logout
   - ✅ Vista "Today" - Ver sesiones del día
   - ✅ Vista "This Week" - Ver sesiones restantes de la semana
   - ✅ Marcar sesión como COMPLETED/MISSED
   - ✅ Registrar log de sesión (RPE, notas)
   - ✅ Cola offline con sincronización automática
   - ✅ Badges "Pending sync" para acciones offline

---

## 📝 Script de Prueba Completo

Crea un archivo `test-flow.sh`:

```bash
#!/usr/bin/env bash
set -e

BASE_URL="http://localhost:3000/api"

# 1. Registrar usuarios
echo "📝 Creating users..."
COACH_EMAIL="coach@test.com"
ATHLETE_EMAIL="athlete@test.com"
PASSWORD="password123"

curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$COACH_EMAIL\",\"password\":\"$PASSWORD\",\"role\":\"COACH\"}" > /dev/null

curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ATHLETE_EMAIL\",\"password\":\"$PASSWORD\",\"role\":\"ATHLETE\"}" > /dev/null

# 2. Obtener tokens
echo "🔑 Getting tokens..."
COACH_TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$COACH_EMAIL\",\"password\":\"$PASSWORD\"}" \
  | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

ATHLETE_TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ATHLETE_EMAIL\",\"password\":\"$PASSWORD\"}" \
  | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

echo "✅ Tokens obtained"

# 3. Coach invita atleta
echo "📧 Coach inviting athlete..."
INVITE_RESPONSE=$(curl -s -X POST "$BASE_URL/coach/athletes/invite" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $COACH_TOKEN" \
  -d "{\"email\":\"$ATHLETE_EMAIL\"}")

INVITE_TOKEN=$(echo $INVITE_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo "✅ Invitation token: $INVITE_TOKEN"

# 4. Athlete acepta
echo "✅ Athlete accepting invitation..."
curl -s -X POST "$BASE_URL/athlete/invitations/accept" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ATHLETE_TOKEN" \
  -d "{\"token\":\"$INVITE_TOKEN\"}" > /dev/null

echo "✅ Test flow completed!"
echo ""
echo "Coach token: $COACH_TOKEN"
echo "Athlete token: $ATHLETE_TOKEN"
```

Ejecuta: `chmod +x test-flow.sh && ./test-flow.sh`

---

## 🎯 Endpoints Disponibles

### Autenticación
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/refresh` - Refrescar token
- `GET /api/auth/me` - Obtener perfil

### Coach
- `POST /api/coach/athletes/invite` - Invitar atleta
- `GET /api/coach/athletes` - Listar atletas
- `POST /api/coach/athletes/:athleteId/benchmarks` - Crear benchmark
- `GET /api/coach/athletes/:athleteId/benchmarks` - Listar benchmarks
- `GET /api/coach/athletes/:athleteId/sessions` - Ver sesiones del atleta
- `GET /api/coach/athletes/:athleteId/sessions/:sessionId/log` - Ver log de sesión
- `GET /api/coach/athletes/:athleteId/week-summary` - Resumen semanal del atleta

### Athlete
- `POST /api/athlete/invitations/accept` - Aceptar invitación
- `GET /api/athlete/today` - Sesiones de hoy
- `GET /api/athlete/sessions` - Sesiones en rango de fechas
- `GET /api/athlete/week-summary` - Resumen semanal propio
- `PATCH /api/athlete/sessions/:sessionId/status` - Actualizar estado
- `POST /api/athlete/sessions/:sessionId/log` - Registrar log
- `GET /api/athlete/sessions/:sessionId/log` - Ver log propio
- `GET /api/athlete/benchmarks` - Ver benchmarks propios

### Exercises
- `POST /api/exercises` - Crear ejercicio (COACH)
- `GET /api/exercises` - Listar ejercicios (COACH + ATHLETE)

### Weekly Plans
- `POST /api/coach/athletes/:athleteId/weekly-plans` - Crear plan (COACH)
- `GET /api/coach/athletes/:athleteId/weekly-plans` - Ver plan (COACH)
- `PUT /api/coach/weekly-plans/:planId` - Actualizar plan (COACH)

---

## 💡 Tips de Prueba

1. **Usa variables de entorno** para tokens:
   ```bash
   export COACH_TOKEN="..."
   export ATHLETE_TOKEN="..."
   ```

2. **Guarda IDs importantes**:
   ```bash
   export ATHLETE_ID="..."
   export SESSION_ID="..."
   export EXERCISE_ID="..."
   ```

3. **Verifica respuestas** con `jq`:
   ```bash
   curl ... | jq .
   ```

4. **Prueba offline** en Athlete PWA:
   - Desactiva internet
   - Marca sesiones como COMPLETED
   - Deberías ver badges "Pending sync"
   - Reactiva internet → se sincroniza automáticamente

---

¡Happy testing! 🚀

