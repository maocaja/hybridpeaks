# 🔐 Configuración de OAuth para Garmin/Wahoo

## 📋 Estado Actual

**⚠️ Modo Desarrollo Activo**: Actualmente estamos usando `DEV_MODE_OAUTH=true` para trabajar sin credenciales reales mientras esperamos la aprobación de Garmin/Wahoo.

---

## 🚀 Cuando Lleguen las Credenciales

### Paso 1: Obtener Credenciales de Garmin

1. **Registrar aplicación en Garmin Developer Portal**:
   - Visita: https://developer.garmin.com/connect-iq/connect-iq-basics/oauth/
   - Crea una nueva aplicación OAuth
   - Obtén `CLIENT_ID` y `CLIENT_SECRET`

2. **Configurar Redirect URI**:
   - En el portal de Garmin, configura el redirect URI:
     ```
     http://localhost:3000/api/athlete/garmin/callback  (desarrollo)
     https://tu-dominio.com/api/athlete/garmin/callback (producción)
     ```

3. **Obtener URLs de API**:
   - Auth URL: `https://connect.garmin.com/oauthConfirm`
   - Token URL: `https://connectapi.garmin.com/oauth-service/oauth/token`
   - API Base URL: `https://connectapi.garmin.com`

### Paso 2: Configurar Variables de Entorno

Edita el archivo `.env` en la raíz del proyecto:

```bash
# Desactivar modo desarrollo
DEV_MODE_OAUTH=false

# Garmin OAuth Configuration
GARMIN_CLIENT_ID=tu_client_id_real_aqui
GARMIN_CLIENT_SECRET=tu_client_secret_real_aqui
GARMIN_REDIRECT_URI=http://localhost:3000/api/athlete/garmin/callback
GARMIN_AUTH_URL=https://connect.garmin.com/oauthConfirm
GARMIN_TOKEN_URL=https://connectapi.garmin.com/oauth-service/oauth/token
GARMIN_API_BASE_URL=https://connectapi.garmin.com

# Generar clave de encriptación (32 bytes en hex)
# Usa: openssl rand -hex 32
GARMIN_TOKEN_ENCRYPTION_KEY=tu_clave_de_64_caracteres_hex_aqui

# Wahoo OAuth Configuration (cuando esté disponible)
WAHOO_CLIENT_ID=tu_wahoo_client_id
WAHOO_CLIENT_SECRET=tu_wahoo_client_secret
WAHOO_REDIRECT_URI=http://localhost:3000/api/athlete/wahoo/callback
WAHOO_AUTH_URL=https://api.wahooligan.com/oauth/authorize
WAHOO_TOKEN_URL=https://api.wahooligan.com/oauth/token
WAHOO_API_BASE_URL=https://api.wahooligan.com
WAHOO_TOKEN_ENCRYPTION_KEY=tu_clave_wahoo_de_64_caracteres_hex_aqui
```

### Paso 3: Generar Clave de Encriptación

Las claves de encriptación deben ser de **32 bytes (64 caracteres hexadecimales)**:

```bash
# Generar clave para Garmin
openssl rand -hex 32

# Generar clave diferente para Wahoo
openssl rand -hex 32
```

**⚠️ IMPORTANTE**: Guarda estas claves de forma segura. Si las pierdes, no podrás descifrar los tokens almacenados.

### Paso 4: Reiniciar el Backend

```bash
# Detener el backend actual
pkill -f "nest start"

# Reiniciar con nuevas variables
cd backend
npm run start:dev
```

### Paso 5: Verificar Configuración

El backend debería iniciar sin errores. Los logs mostrarán:

```
✅ Application is running on: http://localhost:3000/api
✅ Environment: development
```

Si hay errores, verifica:
- Todas las variables están configuradas
- `DEV_MODE_OAUTH=false` (o eliminada)
- Las claves de encriptación tienen 64 caracteres hexadecimales

---

## 🔧 Modo Desarrollo (Actual)

### Cómo Funciona

Cuando `DEV_MODE_OAUTH=true`:

1. **No requiere credenciales reales**: Puedes trabajar sin `CLIENT_ID` o `CLIENT_SECRET`
2. **Simula el flujo OAuth completo**: 
   - Genera URLs mock de autorización
   - Simula el intercambio de código por tokens
   - Almacena tokens mock encriptados en la base de datos
3. **Página mock en frontend**: Muestra una página de autorización simulada en `/mock-oauth`

### Ventajas

- ✅ Puedes desarrollar y probar sin esperar aprobación de Garmin/Wahoo
- ✅ El flujo completo funciona igual que en producción
- ✅ Los tokens se almacenan y encriptan igual que en producción
- ✅ Puedes probar la UI de conexiones sin credenciales reales

### Limitaciones

- ❌ No se pueden hacer llamadas reales a las APIs de Garmin/Wahoo
- ❌ Los tokens mock no funcionan para exportar workouts reales
- ❌ Necesitas cambiar a modo producción para probar con APIs reales

---

## 📝 Checklist de Migración

Cuando tengas las credenciales:

- [ ] Obtener `GARMIN_CLIENT_ID` y `GARMIN_CLIENT_SECRET`
- [ ] Configurar redirect URI en portal de Garmin
- [ ] Generar `GARMIN_TOKEN_ENCRYPTION_KEY` (64 caracteres hex)
- [ ] Actualizar `.env` con todas las variables
- [ ] Cambiar `DEV_MODE_OAUTH=false` (o eliminar la variable)
- [ ] Reiniciar backend
- [ ] Probar conexión OAuth en frontend
- [ ] Verificar que los tokens se almacenan correctamente
- [ ] Probar refresh token (esperar 1 hora o modificar `expiresAt` en DB)

---

## 🐛 Troubleshooting

### Error: "OAuth configuration is incomplete"

**Causa**: Faltan variables de entorno o `DEV_MODE_OAUTH` no está configurado.

**Solución**: 
- Verifica que todas las variables estén en `.env`
- O configura `DEV_MODE_OAUTH=true` para modo desarrollo

### Error: "Invalid encrypted token format"

**Causa**: La clave de encriptación cambió o es incorrecta.

**Solución**: 
- Usa la misma clave que se usó para encriptar los tokens
- Si cambias la clave, los tokens existentes no se podrán descifrar

### Error: "Failed to exchange authorization code"

**Causa**: 
- Credenciales incorrectas
- Redirect URI no coincide con el configurado en Garmin
- Código de autorización expirado o ya usado

**Solución**:
- Verifica `CLIENT_ID` y `CLIENT_SECRET`
- Asegúrate que `REDIRECT_URI` coincida exactamente con el portal de Garmin
- Intenta una nueva conexión (el código OAuth es de un solo uso)

---

## 📚 Referencias

- [Garmin Connect IQ OAuth Documentation](https://developer.garmin.com/connect-iq/connect-iq-basics/oauth/)
- [Garmin Connect API Documentation](https://developer.garmin.com/connect-iq/api-docs/)

---

## 💡 Notas Adicionales

- **Seguridad**: Nunca commitees el archivo `.env` al repositorio
- **Producción**: Usa un gestor de secretos (AWS Secrets Manager, HashiCorp Vault, etc.)
- **Rotación**: Considera rotar las claves de encriptación periódicamente
- **Testing**: Los tests unitarios e integración usan mocks, no requieren credenciales reales

