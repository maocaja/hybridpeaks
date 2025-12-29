# ✅ Solución Correcta - Tipos JWT en NestJS

## ❌ Problema Original

El código usaba `as any` como workaround temporal para evitar errores de tipos de TypeScript:

```typescript
// ❌ MAL - Solución temporal con as any
this.jwtService.signAsync(payload as any, {
  secret: accessTokenSecret,
  expiresIn: 900,
})
```

## ✅ Solución Correcta Implementada

### 1. Configuración Apropiada del JwtModule

**Archivo**: `backend/src/auth/auth.module.ts`

```typescript
@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('app.jwt.secret'),
        signOptions: {
          expiresIn: 900, // 15 minutes in seconds
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

**Por qué funciona**:
- ✅ `JwtModule.registerAsync()` permite configuración dinámica
- ✅ Inyecta `ConfigService` para obtener el secret desde variables de entorno
- ✅ Define `signOptions` por defecto (incluye `expiresIn`)
- ✅ TypeScript entiende los tipos correctamente

### 2. Uso Correcto en AuthService

**Archivo**: `backend/src/auth/auth.service.ts`

```typescript
private async generateTokens(
  userId: string,
  email: string,
  role: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const payload = { sub: userId, email, role };

  const refreshTokenSecret = this.configService.get<string>(
    'app.jwt.refreshSecret',
  );

  if (!refreshTokenSecret) {
    throw new Error('JWT refresh secret not configured');
  }

  // ✅ Access token usa el secret por defecto del módulo
  const accessToken = await this.jwtService.signAsync(payload);

  // ✅ Refresh token usa un secret diferente
  const refreshToken = await this.jwtService.signAsync(payload, {
    secret: refreshTokenSecret,
    expiresIn: 604800, // 7 days in seconds
  });

  return {
    accessToken,
    refreshToken,
  };
}
```

**Por qué funciona**:
- ✅ **Access token**: Usa la configuración por defecto del módulo (no necesita pasar el secret)
- ✅ **Refresh token**: Sobrescribe el secret y expiresIn para tokens de larga duración
- ✅ **Sin `as any`**: Los tipos están correctamente inferidos
- ✅ **Limpio y mantenible**: Código profesional sin workarounds

---

## 🎯 Ventajas de esta Solución

### 1. Type Safety Completo
```typescript
// ✅ TypeScript valida los tipos correctamente
const token = await this.jwtService.signAsync(payload);
// No necesita 'as any'
```

### 2. Configuración Centralizada
- El secret del access token está en el módulo
- Fácil de cambiar en un solo lugar
- DRY (Don't Repeat Yourself)

### 3. Separación de Concerns
- **JwtModule**: Configuración del servicio JWT
- **AuthService**: Lógica de negocio (generar tokens)
- **ConfigService**: Manejo de variables de entorno

### 4. Facilita Testing
```typescript
// En tests, puedes sobrescribir JwtModule fácilmente
TestingModule.createTestingModule({
  imports: [
    JwtModule.register({
      secret: 'test-secret',
      signOptions: { expiresIn: 60 },
    }),
  ],
  // ...
})
```

---

## 📚 Explicación Técnica

### ¿Por qué fallaba antes?

El tipo de `JwtService.signAsync()` en versiones recientes de `@nestjs/jwt` es:

```typescript
signAsync(payload: string | Buffer | object, options?: JwtSignOptions): Promise<string>
```

Donde `JwtSignOptions` tiene:
```typescript
interface JwtSignOptions {
  secret?: string | Buffer;
  expiresIn?: number; // Solo números, no strings
  // ...otros
}
```

**Problema**: Cuando pasabas `expiresIn` como string (`'15m'`), TypeScript rechazaba el tipo.

### ¿Cómo lo resuelve la solución?

1. **JwtModule.registerAsync()** configura el servicio con valores por defecto
2. Cuando llamas `signAsync(payload)` sin opciones, usa los defaults
3. Cuando necesitas sobrescribir (refresh token), pasas opciones válidas
4. TypeScript infiere los tipos correctamente desde la configuración del módulo

---

## ✅ Verificación

### Compilación
```bash
cd backend
npm run build
# ✅ Compila sin errores ni warnings
```

### Sin "as any"
```bash
grep -r "as any" backend/src/auth/
# ✅ No results - código limpio
```

### TypeScript feliz
- ✅ Sin errores de tipos
- ✅ Autocompletado funciona
- ✅ Refactoring seguro

---

## 🎓 Lección Aprendida

### ❌ No hacer:
```typescript
// Nunca uses 'as any' como solución permanente
const token = await this.jwtService.signAsync(payload as any, options);
```

### ✅ Hacer:
1. Entender por qué TypeScript se queja
2. Buscar la forma correcta según la librería
3. Usar la API como está diseñada (JwtModule.registerAsync)
4. Mantener type safety completo

---

## 📖 Recursos

- [NestJS JWT Documentation](https://docs.nestjs.com/security/authentication#jwt-functionality)
- [JwtModule API](https://docs.nestjs.com/techniques/authentication#implementing-passport-jwt)

---

## ✅ Estado Final

**Código**: ✅ Limpio, sin workarounds  
**Tipos**: ✅ Completamente type-safe  
**Compilación**: ✅ Sin errores  
**Mantenibilidad**: ✅ Profesional  
**Best Practices**: ✅ Siguiendo patrones de NestJS  

**No más `as any` - Solución correcta implementada** 🎉

