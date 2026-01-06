# 🧪 Guía de Pruebas: Fase 3 - Session Forms

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

### 2. Abrir Formulario de Sesión

#### Add Session Flow
- [ ] Seleccionar un atleta
- [ ] Seleccionar una semana
- [ ] Hacer clic en "+ Add Session" en cualquier día
- [ ] Verificar que se abre el modal "Select Session Type"
- [ ] Verificar que muestra dos opciones: "Strength" y "Endurance"

#### Type Selector
- [ ] Hacer clic en "Strength" → Verificar que se abre StrengthSessionForm
- [ ] Cerrar y volver a abrir, hacer clic en "Endurance" → Verificar que se abre EnduranceSessionForm
- [ ] Hacer clic en "Cancel" → Verificar que se cierra sin abrir formulario

### 3. Strength Session Form

#### Campos Básicos
- [ ] Campo "Session Title" está presente
- [ ] Campo "Session Title" es requerido (validación)
- [ ] Dejar título vacío y hacer submit → Verificar error

#### Exercise Picker
- [ ] Hacer clic en campo "Exercise" → Verificar que se abre dropdown
- [ ] Escribir en el campo de búsqueda → Verificar que filtra ejercicios
- [ ] Seleccionar un ejercicio → Verificar que se cierra dropdown y muestra el ejercicio
- [ ] Verificar que el ejercicio seleccionado se muestra correctamente

#### Exercise Fields
- [ ] Verificar que hay campos: Sets, Reps, Intensity Type, Target Value
- [ ] Cambiar "Sets" → Verificar que se actualiza
- [ ] Cambiar "Reps" → Verificar que se actualiza
- [ ] Cambiar "Intensity Type" → Verificar que cambia el label del target value
  - [ ] % 1RM → Label dice "% 1RM", max 100
  - [ ] RPE → Label dice "RPE", max 10
  - [ ] Absolute → Label dice "Weight (kg)", sin max
- [ ] Cambiar "Target Value" → Verificar que se actualiza
- [ ] Probar validación: Target Value > 100 para %1RM → Error
- [ ] Probar validación: Target Value > 10 para RPE → Error

#### Multiple Exercises
- [ ] Hacer clic en "+ Add Exercise" → Verificar que se agrega otro ejercicio
- [ ] Verificar que cada ejercicio tiene sus propios campos
- [ ] Hacer clic en "Remove" en un ejercicio → Verificar que se elimina
- [ ] Intentar eliminar el último ejercicio → Verificar que no se puede (debe quedar al menos 1)

#### Optional Fields
- [ ] Campo "Rest (seconds)" es opcional
- [ ] Campo "Tempo" es opcional
- [ ] Llenar campos opcionales → Verificar que se guardan

#### Submit
- [ ] Llenar todos los campos requeridos
- [ ] Hacer clic en "Save Session" → Verificar que se cierra el modal
- [ ] Verificar que aparece en console.log los datos del formulario
- [ ] Verificar que la fecha está incluida en los datos

### 4. Endurance Session Form

#### Campos Básicos
- [ ] Campo "Session Title" está presente y es requerido
- [ ] Selector "Sport" con opciones: BIKE, RUN, SWIM
- [ ] Campo "Objective" es opcional
- [ ] Campo "Notes" es opcional

#### Sport-Specific Fields
- [ ] Seleccionar "BIKE" → Verificar que aparece campo "Cadence"
- [ ] Seleccionar "RUN" → Verificar que NO aparece campo "Cadence"
- [ ] Seleccionar "SWIM" → Verificar que NO aparece campo "Cadence"
- [ ] Cambiar entre deportes → Verificar que los campos se actualizan correctamente

#### Workout Steps
- [ ] Verificar que hay al menos un step por defecto
- [ ] Hacer clic en "+ Add Step" → Verificar que se agrega otro step
- [ ] Cada step tiene campos:
  - [ ] Step Type (WARMUP, WORK, RECOVERY, COOLDOWN)
  - [ ] Duration Type (TIME, DISTANCE)
  - [ ] Duration Value
  - [ ] Target Type (None, Power, Heart Rate, Pace)
  - [ ] Zone (1-5)
  - [ ] Min/Max values
  - [ ] Note (opcional)

#### Target Configuration
- [ ] Seleccionar "None" en Target Type → Verificar que campos de target se ocultan
- [ ] Seleccionar "Power" (solo BIKE) → Verificar campos de power
- [ ] Seleccionar "Heart Rate" → Verificar campos de HR
- [ ] Seleccionar "Pace" (solo RUN/SWIM) → Verificar campos de pace
- [ ] Cambiar Sport mientras hay target configurado → Verificar que se ajusta

#### Cadence (BIKE only)
- [ ] Seleccionar BIKE
- [ ] Verificar campos "Cadence Min" y "Cadence Max"
- [ ] Llenar valores → Verificar que se guardan
- [ ] Validación: Min >= Max → Error

#### Validation
- [ ] Título vacío → Error
- [ ] Duration < 1 → Error
- [ ] Zone < 1 o > 5 → Error
- [ ] Min >= Max en target range → Error
- [ ] Min >= Max en cadence → Error

#### Submit
- [ ] Llenar todos los campos requeridos
- [ ] Hacer clic en "Save Session" → Verificar que se cierra
- [ ] Verificar console.log con datos del formulario

### 5. Edit Session Flow

#### Abrir Formulario de Edición
- [ ] Si hay sesiones en el calendario, hacer clic en una sesión
- [ ] Verificar que se abre el formulario correspondiente (Strength o Endurance)
- [ ] Verificar que los campos están pre-llenados con los datos de la sesión

#### Editar y Guardar
- [ ] Modificar algún campo
- [ ] Hacer clic en "Save Session"
- [ ] Verificar que se cierra el modal
- [ ] Verificar console.log con datos actualizados

### 6. Delete Session

- [ ] Hacer hover sobre una sesión → Verificar que aparecen botones edit/delete
- [ ] Hacer clic en botón delete (🗑️)
- [ ] Verificar que aparece confirmación
- [ ] Confirmar → Verificar console.log
- [ ] Cancelar → Verificar que no se elimina

### 7. UX/UI

#### Modals
- [ ] Hacer clic fuera del modal → Se cierra
- [ ] Presionar Escape → Se cierra
- [ ] Hacer clic en "X" → Se cierra
- [ ] Hacer clic en "Cancel" → Se cierra

#### Responsive
- [ ] Desktop: Formularios se ven bien
- [ ] Tablet: Formularios se adaptan
- [ ] Mobile: Formularios son usables

#### Loading States
- [ ] Exercise picker muestra "Loading..." mientras carga
- [ ] Exercise picker muestra "No exercises found" si no hay resultados

### 8. Validación Completa

#### Strength Form
- [ ] Todos los campos requeridos validados
- [ ] Mensajes de error claros
- [ ] Validación en tiempo real (opcional, pero deseable)

#### Endurance Form
- [ ] Todos los campos requeridos validados
- [ ] Validación específica por deporte
- [ ] Mensajes de error claros

---

## ✅ Criterios de Éxito

La Fase 3 se considera exitosa si:

1. ✅ Los formularios se abren correctamente desde "Add Session"
2. ✅ Los formularios se pueden llenar completamente
3. ✅ La validación previene envíos inválidos
4. ✅ Los datos se capturan correctamente (console.log)
5. ✅ Los formularios se pueden cerrar de múltiples formas
6. ✅ El exercise picker funciona con búsqueda
7. ✅ Se pueden agregar múltiples ejercicios/steps
8. ✅ Los campos opcionales funcionan correctamente
9. ✅ La edición de sesiones funciona
10. ✅ No hay errores en la consola (excepto 404 esperados)

---

## 🐛 Problemas Conocidos / Limitaciones

### Por Implementar en Fase 4
- ❌ Los datos NO se guardan en el backend aún (solo console.log)
- ❌ No hay actualización optimista en el calendario
- ❌ No hay manejo de errores del backend
- ❌ El botón "Save Plan" no tiene funcionalidad

### Notas
- Los datos se muestran en console.log para verificación
- La validación es client-side únicamente
- Los formularios están listos para conectarse al backend en Fase 4

---

## 📝 Notas de Prueba

**Datos de prueba recomendados**:
- Crear al menos 5 ejercicios de STRENGTH en la base de datos
- Probar con diferentes combinaciones de sets/reps/intensity
- Probar con diferentes deportes en endurance
- Probar con múltiples steps en endurance

---

## 🚀 Siguiente Paso

Una vez que la Fase 3 esté validada, proceder con **Fase 4: Integration & Save Flow** para conectar los formularios con el backend y guardar los datos.

