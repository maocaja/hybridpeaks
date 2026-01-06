# 🧪 Guía de Pruebas: Fase 2 - Core Components

**Fecha**: 2026-01-06  
**Estado**: ✅ Listo para probar

---

## 📋 Checklist de Pruebas

### 1. Preparación del Entorno

- [ ] Backend corriendo en `http://localhost:3000`
- [ ] Coach Web corriendo en `http://localhost:5173` (o puerto configurado)
- [ ] Usuario coach autenticado
- [ ] Al menos un atleta vinculado al coach

### 2. Acceso a la Feature

- [ ] Navegar a `http://localhost:5173`
- [ ] Iniciar sesión como coach
- [ ] Hacer clic en el tab **"Plans"**
- [ ] Verificar que se muestra el nuevo `PlanningScreen`

### 3. AthleteSelector Component

#### Funcionalidad Básica
- [ ] El dropdown muestra "Select athlete..." cuando no hay selección
- [ ] Al hacer clic, se abre el dropdown con lista de atletas
- [ ] Los atletas se muestran con su email
- [ ] Al seleccionar un atleta, el dropdown se cierra
- [ ] El atleta seleccionado se muestra en el trigger

#### Búsqueda
- [ ] Al escribir en el campo de búsqueda, se filtran los atletas
- [ ] La búsqueda funciona por email
- [ ] Si no hay coincidencias, muestra "No athletes match..."
- [ ] Al limpiar la búsqueda, se muestran todos los atletas

#### Estados
- [ ] Mientras carga, muestra "Loading athletes..." con spinner
- [ ] Si hay error, muestra mensaje de error
- [ ] Si no hay atletas, muestra "No athletes found..."

#### UX
- [ ] Al hacer clic fuera del dropdown, se cierra
- [ ] El atleta seleccionado tiene checkmark (✓)
- [ ] El atleta seleccionado tiene fondo destacado

### 4. WeekSelector Component

#### Funcionalidad Básica
- [ ] Muestra el próximo lunes por defecto
- [ ] Muestra el rango de semana (e.g., "Jan 6 - Jan 12, 2026")
- [ ] El date picker permite seleccionar una fecha

#### Validación
- [ ] Si seleccionas una fecha que no es lunes, automáticamente ajusta al lunes anterior
- [ ] El rango de semana se actualiza correctamente

#### Navegación
- [ ] Botón "←" navega a la semana anterior
- [ ] Botón "→" navega a la semana siguiente
- [ ] El rango de semana se actualiza al navegar

### 5. WeeklyCalendar Component

#### Layout
- [ ] Muestra 7 columnas (Lunes a Domingo) en desktop
- [ ] Cada columna tiene el nombre del día (Mon, Tue, etc.)
- [ ] Cada columna tiene el número del día (1, 2, etc.)
- [ ] El día actual está destacado (borde naranja)

#### Empty State
- [ ] Si no hay sesiones, cada día muestra "+ Add Session"
- [ ] Al hacer clic en "+ Add Session", se ejecuta el handler (console.log por ahora)

#### Con Sesiones
- [ ] Si hay sesiones, se muestran como cards en el día correspondiente
- [ ] Las sesiones se agrupan correctamente por fecha
- [ ] Múltiples sesiones en el mismo día se apilan verticalmente

#### Responsive
- [ ] En tablet (1024px), muestra 4 columnas
- [ ] En mobile (768px), muestra 2 columnas
- [ ] En mobile pequeño (480px), muestra 1 columna

### 6. SessionCard Component

#### Visual
- [ ] Muestra badge de tipo (STRENGTH o ENDURANCE)
- [ ] Badge STRENGTH es rojo
- [ ] Badge ENDURANCE es azul
- [ ] Muestra el título de la sesión
- [ ] Muestra detalles resumidos:
  - Strength: "3 exercises, 12 sets"
  - Endurance: "60 min"

#### Interacciones
- [ ] Al hacer hover, aparecen botones de editar (✏️) y eliminar (🗑️)
- [ ] Al hacer clic en la card, se ejecuta el handler (console.log)
- [ ] Al hacer clic en editar, se ejecuta el handler de editar
- [ ] Al hacer clic en eliminar, se ejecuta el handler de eliminar

### 7. PlanningScreen Integration

#### Estados Iniciales
- [ ] Sin atleta seleccionado: muestra "Please select an athlete..."
- [ ] Con atleta seleccionado pero sin plan: muestra el calendario vacío
- [ ] Con atleta y semana seleccionados: carga el plan

#### Carga de Datos
- [ ] Mientras carga, muestra spinner y "Loading plan..."
- [ ] Si hay error, muestra mensaje de error con botón "Retry"
- [ ] Si el plan existe, muestra las sesiones en el calendario

#### Controles
- [ ] AthleteSelector funciona correctamente
- [ ] WeekSelector funciona correctamente
- [ ] Botón "Save Plan" aparece cuando hay plan (placeholder por ahora)

### 8. Integración con Backend

#### API Calls
- [ ] Al seleccionar atleta, se hace request a `/api/coach/athletes`
- [ ] Al seleccionar semana, se hace request a `/api/coach/athletes/:id/weekly-plans?weekStart=...`
- [ ] Los requests incluyen el token de autenticación
- [ ] Los errores se manejan correctamente

#### React Query
- [ ] Los datos se cachean correctamente
- [ ] Al cambiar de atleta/semana, se invalidan los caches apropiados
- [ ] No hay requests duplicados innecesarios

### 9. Responsive Design

#### Desktop (> 1024px)
- [ ] Calendar muestra 7 columnas
- [ ] Controles están en una fila horizontal
- [ ] Todo se ve bien espaciado

#### Tablet (768px - 1024px)
- [ ] Calendar muestra 4 columnas
- [ ] Controles se adaptan

#### Mobile (< 768px)
- [ ] Calendar muestra 2 o 1 columna
- [ ] Controles se apilan verticalmente
- [ ] Dropdowns funcionan correctamente

### 10. Accesibilidad

- [ ] Los botones tienen `aria-label` apropiados
- [ ] Los modales tienen `role="dialog"` y `aria-modal="true"`
- [ ] La navegación por teclado funciona
- [ ] Los colores tienen suficiente contraste

---

## 🐛 Problemas Conocidos / Limitaciones

### Por Implementar en Fase 3
- ❌ Los handlers de "Add Session", "Edit Session", "Delete Session" solo hacen `console.log`
- ❌ El botón "Save Plan" no tiene funcionalidad aún
- ❌ No hay formularios para crear/editar sesiones

### Notas
- Los datos se cargan automáticamente al seleccionar atleta y semana
- Si no hay plan para la semana, el calendario se muestra vacío (esto es correcto)

---

## ✅ Criterios de Éxito

La Fase 2 se considera exitosa si:

1. ✅ Todos los componentes se renderizan correctamente
2. ✅ La navegación entre atletas y semanas funciona
3. ✅ El calendario muestra sesiones existentes correctamente
4. ✅ Los estados (loading, error, empty) se manejan bien
5. ✅ El diseño es responsive
6. ✅ No hay errores en la consola del navegador
7. ✅ No hay errores en la consola del backend

---

## 📝 Notas de Prueba

**Usuario de prueba recomendado**: Un coach con al menos 2-3 atletas vinculados y al menos un plan semanal creado.

**Datos de prueba**:
- Crear un plan semanal con sesiones de STRENGTH y ENDURANCE
- Distribuir las sesiones en diferentes días de la semana
- Probar con semanas pasadas, actuales y futuras

---

## 🚀 Siguiente Paso

Una vez que la Fase 2 esté validada, proceder con **Fase 3: Session Forms**.

