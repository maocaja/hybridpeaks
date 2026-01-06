# 🧪 Guía de Pruebas: Fase 4 - Integration & Save Flow

**Fecha**: 2026-01-06  
**Estado**: ✅ Listo para probar

---

## 📋 Checklist de Pruebas

### 1. Preparación

- [ ] Backend corriendo en `http://localhost:3000`
- [ ] Frontend corriendo en `http://localhost:5173`
- [ ] Usuario coach autenticado
- [ ] Al menos un atleta vinculado
- [ ] Al menos un ejercicio de STRENGTH en la base de datos

### 2. Crear Nuevo Plan (Sin Plan Existente)

#### Flujo Completo
- [ ] Seleccionar un atleta
- [ ] Seleccionar una semana que NO tenga plan
- [ ] Verificar que el calendario está vacío
- [ ] Hacer clic en "+ Add Session" en cualquier día
- [ ] Seleccionar tipo de sesión (Strength o Endurance)
- [ ] Llenar el formulario completamente
- [ ] Hacer clic en "Save Session"
- [ ] Verificar que:
  - [ ] El modal se cierra
  - [ ] La sesión aparece en el calendario inmediatamente (optimistic update)
  - [ ] El botón "Save Plan" se habilita
  - [ ] Aparece indicador "• Unsaved changes"

#### Guardar Plan
- [ ] Hacer clic en "Save Plan"
- [ ] Verificar que:
  - [ ] El botón muestra loading state
  - [ ] Se muestra mensaje de éxito "Plan saved successfully!"
  - [ ] El indicador "Unsaved changes" desaparece
  - [ ] El botón cambia a "Plan Saved" (deshabilitado)
  - [ ] La sesión persiste después de recargar la página

### 3. Agregar Múltiples Sesiones

- [ ] Agregar 2-3 sesiones de Strength en diferentes días
- [ ] Agregar 1-2 sesiones de Endurance en diferentes días
- [ ] Verificar que todas aparecen en el calendario
- [ ] Verificar que el indicador "Unsaved changes" está presente
- [ ] Guardar el plan
- [ ] Verificar que todas las sesiones se guardan correctamente

### 4. Editar Sesión Existente

#### Desde Sesión Guardada
- [ ] Hacer clic en una sesión existente (guardada)
- [ ] Verificar que el formulario se abre con datos pre-llenados
- [ ] Modificar algún campo (ej: cambiar sets de 3 a 4)
- [ ] Guardar la sesión
- [ ] Verificar que:
  - [ ] El modal se cierra
  - [ ] La sesión se actualiza en el calendario
  - [ ] Aparece "Unsaved changes"
- [ ] Guardar el plan
- [ ] Verificar que los cambios persisten

#### Desde Sesión Draft (No Guardada)
- [ ] Agregar una nueva sesión (sin guardar plan)
- [ ] Hacer clic en la sesión draft
- [ ] Modificar campos
- [ ] Guardar
- [ ] Verificar que se actualiza correctamente

### 5. Eliminar Sesión

#### Eliminar Sesión Guardada
- [ ] Hacer hover sobre una sesión guardada
- [ ] Hacer clic en botón delete (🗑️)
- [ ] Confirmar en el diálogo
- [ ] Verificar que:
  - [ ] La sesión desaparece del calendario
  - [ ] Aparece "Unsaved changes"
- [ ] Guardar el plan
- [ ] Verificar que la sesión se elimina del backend

#### Eliminar Sesión Draft
- [ ] Agregar una sesión (sin guardar)
- [ ] Eliminarla
- [ ] Verificar que desaparece inmediatamente
- [ ] Guardar el plan
- [ ] Verificar que no se crea en el backend

### 6. Actualizar Plan Existente

#### Modificar Plan Guardado
- [ ] Seleccionar atleta y semana con plan existente
- [ ] Verificar que las sesiones se cargan correctamente
- [ ] Agregar una nueva sesión
- [ ] Modificar una sesión existente
- [ ] Eliminar una sesión existente
- [ ] Guardar el plan
- [ ] Verificar que todos los cambios se aplican correctamente

### 7. Estados y Feedback

#### Loading States
- [ ] Al guardar plan, el botón muestra spinner
- [ ] El botón está deshabilitado durante el guardado
- [ ] No se pueden hacer otras acciones durante el guardado

#### Success States
- [ ] Mensaje de éxito aparece después de guardar
- [ ] El mensaje desaparece después de unos segundos (o al hacer otra acción)
- [ ] El botón cambia a "Plan Saved" (deshabilitado)

#### Error States
- [ ] Si el guardado falla, se muestra mensaje de error
- [ ] El mensaje de error es claro y descriptivo
- [ ] Los cambios locales NO se pierden (se mantienen en draft)
- [ ] Se puede intentar guardar nuevamente

#### Unsaved Changes Indicator
- [ ] Aparece cuando hay cambios sin guardar
- [ ] Desaparece después de guardar exitosamente
- [ ] Se resetea cuando se cambia de atleta/semana

### 8. Validación de Datos

#### Strength Session
- [ ] Intentar guardar sin título → Error
- [ ] Intentar guardar sin ejercicio seleccionado → Error
- [ ] Intentar guardar con sets < 1 → Error
- [ ] Intentar guardar con reps < 1 → Error
- [ ] Intentar guardar con %1RM > 100 → Error
- [ ] Intentar guardar con RPE > 10 → Error

#### Endurance Session
- [ ] Intentar guardar sin título → Error
- [ ] Intentar guardar con duration < 1 → Error
- [ ] Intentar guardar con zone < 1 o > 5 → Error
- [ ] Intentar guardar con min >= max → Error

### 9. Persistencia

#### Recargar Página
- [ ] Crear y guardar un plan
- [ ] Recargar la página (F5)
- [ ] Verificar que el plan se carga correctamente
- [ ] Verificar que todas las sesiones están presentes

#### Cambiar de Semana/Atleta
- [ ] Crear plan para atleta A, semana 1
- [ ] Cambiar a atleta B, semana 1
- [ ] Verificar que se carga el plan correcto (o vacío si no existe)
- [ ] Volver a atleta A, semana 1
- [ ] Verificar que el plan se carga correctamente

### 10. Edge Cases

#### Plan Vacío
- [ ] Crear un plan sin sesiones
- [ ] Intentar guardar → Verificar que el botón está deshabilitado
- [ ] Agregar una sesión
- [ ] Verificar que el botón se habilita

#### Múltiples Cambios Rápidos
- [ ] Agregar sesión
- [ ] Inmediatamente modificar otra sesión
- [ ] Inmediatamente eliminar otra sesión
- [ ] Guardar
- [ ] Verificar que todos los cambios se aplican correctamente

#### Cambios Sin Guardar
- [ ] Hacer cambios (agregar/modificar sesiones)
- [ ] Cambiar de atleta o semana
- [ ] Verificar que se muestra advertencia (si está implementada) o se pierden los cambios
- [ ] Volver a la semana original
- [ ] Verificar que los cambios se perdieron (o se mantienen según diseño)

---

## ✅ Criterios de Éxito

La Fase 4 se considera exitosa si:

1. ✅ Se pueden crear nuevos planes con sesiones
2. ✅ Se pueden actualizar planes existentes
3. ✅ Se pueden agregar, editar y eliminar sesiones
4. ✅ Los cambios se guardan correctamente en el backend
5. ✅ Los datos persisten después de recargar
6. ✅ Los estados de loading/success/error funcionan correctamente
7. ✅ El indicador de "unsaved changes" funciona
8. ✅ La validación previene guardados inválidos
9. ✅ No hay errores en la consola (excepto 404 esperados)
10. ✅ La UX es fluida y responsive

---

## 🐛 Problemas Conocidos / Limitaciones

### Por Implementar en Fase 5
- ❌ Advertencia al cambiar de semana/atleta con cambios sin guardar
- ❌ Auto-save (opcional)
- ❌ Mejoras de UI/UX adicionales

### Notas
- Los cambios se guardan solo cuando se hace clic en "Save Plan"
- Si cambias de atleta/semana con cambios sin guardar, se pierden (por diseño actual)

---

## 📝 Notas de Prueba

**Datos de prueba recomendados**:
- Crear un plan completo con 6-8 sesiones (mix de Strength y Endurance)
- Probar edición de diferentes tipos de sesiones
- Probar eliminación de sesiones
- Probar guardado y recarga

---

## 🚀 Siguiente Paso

Una vez que la Fase 4 esté validada, proceder con **Fase 5: Polish & Testing** para refinar la UI y agregar tests.

