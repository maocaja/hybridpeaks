# 🔧 Modo Desarrollo OAuth - Guía Rápida

## ✅ ¿Qué Hemos Implementado?

Hemos creado un **modo de desarrollo** que te permite trabajar con OAuth sin necesidad de credenciales reales de Garmin/Wahoo mientras esperas la aprobación.

---

## 🚀 Cómo Usar el Modo Desarrollo

### 1. Configurar Variables de Entorno

En tu archivo `.env` (en la raíz del proyecto), agrega:

```bash
DEV_MODE_OAUTH=true
```

**Eso es todo.** No necesitas configurar `GARMIN_CLIENT_ID`, `GARMIN_CLIENT_SECRET`, etc.

### 2. Iniciar el Backend

```bash
cd backend
npm run start:dev
```

El backend iniciará sin errores, incluso sin credenciales de Garmin/Wahoo.

### 3. Probar el Flujo OAuth

1. **Inicia el frontend** (Athlete PWA):
   ```bash
   cd athlete-pwa
   npm run dev
   ```

2. **Inicia sesión** como atleta

3. **Ve a "Device Connections"** y haz clic en "Connect Garmin"

4. **Verás una página mock** que simula la autorización de Garmin

5. **Haz clic en "Authorize GARMIN"** y se completará el flujo OAuth

6. **Verás la conexión** en la lista con estado "CONNECTED"

---

## 🎯 ¿Qué Funciona en Modo Desarrollo?

✅ **Flujo OAuth completo simulado**:
- Generación de URL de autorización
- Página mock de autorización
- Intercambio de código por tokens (simulado)
- Almacenamiento de tokens encriptados en la base de datos
- Refresh token automático (simulado)

✅ **UI completa**:
- Lista de conexiones
- Estado de conexión (CONNECTED, EXPIRED, etc.)
- Selección de provider primario
- Botones de conectar/reconectar

✅ **Backend completo**:
- Endpoints de OAuth funcionando
- Encriptación de tokens
- Gestión de conexiones
- Refresh automático de tokens

---

## ⚠️ ¿Qué NO Funciona en Modo Desarrollo?

❌ **Llamadas reales a APIs de Garmin/Wahoo**:
- No puedes exportar workouts reales
- No puedes obtener datos reales de actividades
- Los tokens mock no funcionan con las APIs reales

---

## 🔄 Migrar a Producción (Cuando Tengas Credenciales)

Cuando recibas las credenciales de Garmin/Wahoo:

1. **Lee la guía completa**: `backend/OAUTH-SETUP.md`
2. **Configura las variables** en `.env`:
   ```bash
   DEV_MODE_OAUTH=false
   GARMIN_CLIENT_ID=tu_client_id_real
   GARMIN_CLIENT_SECRET=tu_client_secret_real
   # ... etc
   ```
3. **Reinicia el backend**

El código es el mismo, solo cambia la configuración.

---

## 📝 Archivos Modificados

### Backend

- `backend/src/config/app.config.ts` - Agregado `devModeOAuth` y `athletePwaUrl`
- `backend/src/config/validation.schema.ts` - Agregado validación para `DEV_MODE_OAUTH`
- `backend/src/auth/devices/device-oauth.service.ts` - Lógica para detectar modo dev y usar mocks
- `backend/src/auth/devices/device-oauth-mock.service.ts` - Servicio mock completo (no usado actualmente, pero disponible)

### Frontend

- `athlete-pwa/src/App.tsx` - Página mock OAuth en `/mock-oauth`

### Documentación

- `backend/OAUTH-SETUP.md` - Guía completa de configuración
- `DEV-MODE-OAUTH.md` - Este archivo

---

## 🐛 Troubleshooting

### El backend dice "OAuth configuration is incomplete"

**Solución**: Asegúrate de tener `DEV_MODE_OAUTH=true` en tu `.env`

### La página mock no aparece

**Solución**: 
1. Verifica que el frontend esté corriendo en `http://localhost:5174`
2. Verifica que `ATHLETE_PWA_URL` en `.env` apunte a `http://localhost:5174`
3. Revisa la consola del navegador para errores

### Los tokens no se guardan

**Solución**: 
1. Verifica que la base de datos esté corriendo
2. Revisa los logs del backend para errores
3. Verifica que el atleta tenga un `AthleteProfile` creado

---

## 💡 Próximos Pasos

Mientras esperas las credenciales, puedes:

1. ✅ **Continuar con Feature 005** (Auto-push de workouts)
2. ✅ **Continuar con Feature 006** (Export status display)
3. ✅ **Mejorar la UI** de conexiones
4. ✅ **Escribir tests** adicionales
5. ✅ **Documentar** otros aspectos del sistema

---

## 📚 Referencias

- `backend/OAUTH-SETUP.md` - Guía completa de configuración OAuth
- `specs/004-garmin-oauth/` - Especificación de la feature

