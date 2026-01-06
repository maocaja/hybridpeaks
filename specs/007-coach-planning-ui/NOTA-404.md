# 📝 Nota sobre el Error 404

## ⚠️ El 404 en la Consola es Normal

Cuando no existe un plan semanal para un atleta y semana específica, el backend retorna un **404 Not Found**. Esto es **comportamiento esperado** y **correcto**.

### ¿Por qué aparece en la consola?

El navegador **siempre** muestra los errores HTTP (incluyendo 404) en la consola, incluso cuando el código los maneja correctamente. Esto es solo un **log informativo** del navegador.

### ¿Cómo lo estamos manejando?

El código está configurado para:

1. **Capturar el 404** en `useWeeklyPlan.ts`
2. **Retornar `null`** en lugar de lanzar error
3. **Mostrar el calendario vacío** cuando `weeklyPlan === null`
4. **No reintentar** la petición en caso de 404

### Comportamiento Esperado

- ✅ **404 (sin plan)**: Muestra calendario vacío con botones "+ Add Session"
- ✅ **200 (con plan)**: Muestra las sesiones en el calendario
- ❌ **Otros errores**: Muestra mensaje de error con botón "Retry"

### Código Relevante

```typescript
// useWeeklyPlan.ts
try {
  return await apiFetch<WeeklyPlan>(`/api/coach/athletes/${athleteId}/weekly-plans?weekStart=${weekStart}`)
} catch (error: any) {
  // If plan doesn't exist (404), return null instead of throwing
  if (error?.status === 404) {
    return null
  }
  throw error
}
```

```typescript
// PlanningScreen.tsx
const sessions = useMemo(() => {
  // If weeklyPlan is null, it means no plan exists (404), which is fine - show empty calendar
  if (weeklyPlan === null) return []
  return weeklyPlan?.sessions || []
}, [weeklyPlan])
```

### Conclusión

**El 404 en la consola es normal y esperado**. El código lo maneja correctamente y muestra el calendario vacío. No es un error que necesite corrección.

