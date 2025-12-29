# 🚀 Backend HybridPeaks - Guía Completa

## ✅ Estado del Proyecto

**Milestone 0.1 - Core Auth & Config**: ✅ **COMPLETADO**

### ¿Qué está implementado?

- ✅ Configuración con NestJS ConfigModule + validación Joi
- ✅ Base de datos PostgreSQL + Prisma ORM
- ✅ Modelo User con roles (COACH, ATHLETE)
- ✅ Autenticación JWT (access + refresh tokens)
- ✅ Password hashing con Argon2
- ✅ Rate limiting en endpoints auth
- ✅ Seguridad baseline (helmet, CORS, validación global)
- ✅ **Tipos correctos sin workarounds (`as any`)**

---

## 📋 Prerequisitos

### 1. Node.js & npm
```bash
node --version  # v18 o superior
npm --version   # v9 o superior
```

### 2. PostgreSQL

**Opción A: Docker (Recomendado)**
```bash
cd /Users/mauricio/dev/hybridpeaks
docker-compose up -d
# PostgreSQL corriendo en localhost:5432
```

**Opción B: Local (Homebrew)**
```bash
brew install postgresql@15
brew services start postgresql@15
createdb hybridpeaks_dev
```

---

## 🔧 Configuración Inicial

### 1. Instalar Dependencias
```bash
cd /Users/mauricio/dev/hybridpeaks/backend
npm install
```

### 2. Configurar Variables de Entorno
```bash
cp .env.example .env
```

**Edita `.env`** con tus valores:
```env
PORT=3000
DATABASE_URL="postgresql://user:password@localhost:5432/hybridpeaks_dev?schema=public"
JWT_SECRET="tu-secreto-super-seguro-aqui"
JWT_REFRESH_SECRET="tu-secreto-refresh-super-seguro-aqui"
JWT_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"
THROTTLE_TTL=60000
THROTTLE_LIMIT=5
```

⚠️ **IMPORTANTE**: En producción usa secrets fuertes y seguros.

### 3. Ejecutar Migraciones de Base de Datos
```bash
# Aplicar migraciones
npx prisma migrate dev --name init

# Generar el cliente Prisma
npx prisma generate
```

**Nota sobre Prisma**: Este proyecto usa **Prisma 6.19.1**. Prisma 7 tiene breaking changes que complican el setup MVP, por lo que se decidió usar la versión 6 estable.

---

## 🏃 Ejecutar el Backend

### Modo Desarrollo
```bash
npm run start:dev
```

### Modo Producción
```bash
npm run build
npm run start:prod
```

El servidor estará corriendo en **http://localhost:3000**

---

## 🧪 Probar los Endpoints

### 1. Registrar Usuario

**COACH**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "coach@hybridpeaks.com",
    "password": "SecurePass123!",
    "role": "COACH"
  }'
```

**ATHLETE**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "athlete@hybridpeaks.com",
    "password": "SecurePass123!",
    "role": "ATHLETE"
  }'
```

**Respuesta esperada**:
```json
{
  "user": {
    "id": "uuid-del-usuario",
    "email": "coach@hybridpeaks.com",
    "role": "COACH"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "coach@hybridpeaks.com",
    "password": "SecurePass123!"
  }'
```

**Respuesta esperada**:
```json
{
  "user": {
    "id": "uuid-del-usuario",
    "email": "coach@hybridpeaks.com",
    "role": "COACH"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 3. Obtener Usuario Actual (Protegido)

```bash
# Reemplaza <TU_ACCESS_TOKEN> con el token de login/register
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <TU_ACCESS_TOKEN>"
```

**Respuesta esperada**:
```json
{
  "id": "uuid-del-usuario",
  "email": "coach@hybridpeaks.com",
  "role": "COACH",
  "createdAt": "2025-12-28T...",
  "updatedAt": "2025-12-28T..."
}
```

### 4. Refresh Token

```bash
# Reemplaza <TU_REFRESH_TOKEN> con el refreshToken
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<TU_REFRESH_TOKEN>"
  }'
```

**Respuesta esperada**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 🔐 Seguridad Implementada

### ✅ Password Hashing
- Algoritmo: **Argon2** (recomendado por OWASP)
- No se almacenan passwords en texto plano
- Hashing automático en registro

### ✅ JWT Tokens
- **Access Token**: 15 minutos (corta vida)
- **Refresh Token**: 7 días (larga vida)
- Secrets separados para cada tipo
- Firma HMAC SHA-256

### ✅ Rate Limiting
- Endpoints `/auth/*`: **5 requests / minuto**
- Previene ataques de fuerza bruta
- Basado en IP

### ✅ Validación de Inputs
- DTOs con `class-validator`
- Validación global con `ValidationPipe`
- Whitelisting de propiedades
- Transformación automática de tipos

### ✅ Security Headers
- Helmet.js habilitado
- CORS configurado (solo frontends permitidos)
- Sin información sensible en errores

### ✅ Roles & Autorización
- Enum: `COACH` | `ATHLETE`
- Roles almacenados en JWT payload
- Guard JWT protege rutas

---

## 📁 Estructura del Código

```
backend/
├── prisma/
│   ├── schema.prisma        # Esquema de base de datos
│   └── migrations/          # Migraciones SQL
├── src/
│   ├── auth/                # Módulo de autenticación
│   │   ├── dto/            # Data Transfer Objects
│   │   ├── guards/         # Guards (JwtAuthGuard)
│   │   ├── strategies/     # Passport strategies (JWT)
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.module.ts
│   ├── config/              # Configuración
│   │   ├── app.config.ts   # Variables de entorno
│   │   └── validation.schema.ts  # Validación Joi
│   ├── prisma/              # Servicio Prisma
│   │   ├── prisma.service.ts
│   │   └── prisma.module.ts
│   ├── app.module.ts        # Módulo raíz
│   └── main.ts              # Entry point
├── .env                     # Variables de entorno (NO commitear)
├── .env.example             # Template de .env
└── package.json
```

---

## 🔍 Troubleshooting

### ❌ Error: "Cannot connect to database"

**Solución**:
```bash
# Verifica que PostgreSQL esté corriendo
docker ps  # Si usas Docker
# O
pg_isready  # Si es local

# Verifica la DATABASE_URL en .env
cat .env | grep DATABASE_URL
```

### ❌ Error: "JWT secrets not configured"

**Solución**:
```bash
# Verifica que JWT_SECRET y JWT_REFRESH_SECRET existan en .env
cat .env | grep JWT
```

### ❌ Error: "Prisma Client could not be imported"

**Solución**:
```bash
npx prisma generate
npm run build
```

### ❌ Error: "Port 3000 already in use"

**Solución**:
```bash
# Cambia el puerto en .env
echo "PORT=3001" >> .env

# O mata el proceso en el puerto
lsof -ti:3000 | xargs kill -9
```

---

## 🎯 Próximos Pasos (Roadmap)

### Milestone 0.2 - Coach Exercise Library
- [ ] Modelo Exercise (strength + endurance)
- [ ] CRUD endpoints para ejercicios
- [ ] Filtros y búsqueda
- [ ] Permisos: solo COACH puede crear/editar

### Milestone 0.3 - Weekly Planning
- [ ] Modelo TrainingWeek, Session, Block
- [ ] CRUD endpoints para planes
- [ ] Validación de métricas (%1RM, FTP, zonas HR)

### Milestone 0.4 - Athlete Today View
- [ ] Endpoint GET /sessions/today
- [ ] Filtrar por atleta autenticado
- [ ] Incluir bloques y ejercicios

### Milestone 0.5 - Workout Logging
- [ ] Endpoints POST /logs (strength/endurance)
- [ ] Validación de estructura
- [ ] Link con sesiones planificadas

### Milestone 0.6 - Basic Progress & AI Summary
- [ ] Endpoint GET /dashboard/progress
- [ ] Cálculo de adherencia semanal
- [ ] Integración con OpenAI (weekly summary)

---

## 🧠 Solución Técnica: Tipos JWT

Ver [`SOLUCION-CORRECTA-JWT.md`](./SOLUCION-CORRECTA-JWT.md) para detalles sobre cómo se resolvió el problema de tipos de TypeScript con JWT sin usar `as any`.

**TL;DR**:
- ✅ Usar `JwtModule.registerAsync()` con configuración dinámica
- ✅ Access token usa el secret por defecto del módulo
- ✅ Refresh token sobrescribe con su propio secret
- ✅ Sin workarounds temporales (`as any`)

---

## 📚 Recursos

- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

---

## ✅ Checklist de Verificación

Antes de pasar al siguiente Milestone, verifica:

- [ ] PostgreSQL está corriendo
- [ ] Migraciones aplicadas (`npx prisma migrate deploy`)
- [ ] Backend inicia sin errores (`npm run start:dev`)
- [ ] Endpoint `/auth/register` funciona (crear COACH y ATHLETE)
- [ ] Endpoint `/auth/login` devuelve tokens
- [ ] Endpoint `/auth/me` requiere token (401 sin él, 200 con él)
- [ ] Endpoint `/auth/refresh` renueva tokens
- [ ] No hay warnings de TypeScript (`npm run build`)
- [ ] Variables de entorno configuradas (`.env` existe y es válido)

---

**¿Todo listo?** 🎉

**Próximo comando**: `/speckit.implement` para comenzar Milestone 0.2

---

*Última actualización: 28 de diciembre, 2025*

