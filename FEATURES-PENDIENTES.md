# 📋 Features Pendientes - HybridPeaks MVP

**Última actualización**: 2026-01-06

---

## 📊 Resumen Ejecutivo

### Features Completadas ✅
- **Feature 002**: Export Normalized Endpoint
- **Feature 003**: Wahoo Exporter Stub
- **Feature 004**: Athlete Device Connections (OAuth)
- **Feature 005**: Auto-Push Endurance Workouts
- **Feature 006**: Export Status Display & Preview

**Total completadas**: 5/6 features del MVP

---

## ⏳ Features Pendientes

### Feature 001: HybridPeaks MVP Baseline

**Estado**: ⏳ **DRAFT** (No completada)  
**Prioridad**: 🔴 **ALTA** (Es el baseline del MVP)

#### Descripción
Feature base que define la estructura completa del MVP de HybridPeaks. Incluye:
- Sistema de autenticación y roles (Coach/Athlete)
- Gestión de perfiles de atletas
- Creación y gestión de weekly plans
- Sesiones de entrenamiento (STRENGTH y ENDURANCE)
- Prescripciones de fuerza (%1RM, RPE, ABS)
- Prescripciones de endurance (normalizadas)
- Vista "Today" para atletas
- Dashboard para coaches

#### Estado Actual
- ✅ Especificación completa (`spec.md`)
- ✅ Plan de implementación (`plan.md`)
- ✅ Tasks definidos (`tasks.md`)
- ❌ **Implementación**: Parcial (algunos componentes existen pero no está completa)
- ❌ **Tests**: No completados
- ❌ **Documentación**: No hay `results.md`

#### Componentes que Faltan
Según el spec, necesitaría incluir:
- [ ] Sistema de autenticación completo (registro, login, JWT)
- [ ] Gestión de perfiles de atletas
- [ ] CRUD completo de weekly plans
- [ ] CRUD completo de sesiones
- [ ] Validación de prescripciones
- [ ] Vista "Today" completa para atletas
- [ ] Dashboard completo para coaches
- [ ] Tests end-to-end del flujo completo

#### Nota Importante
Muchos componentes de esta feature ya están implementados (auth, weekly plans, etc.) pero falta:
1. Consolidar todo bajo esta feature
2. Completar tests
3. Documentar resultados
4. Validar que cumple todos los requisitos del spec

---

## 🚀 Features Post-MVP (Futuras)

Estas features están fuera del alcance del MVP pero son parte de la visión a largo plazo:

### Feature 007: Import Activities from Devices
**Estado**: 📝 **NO DEFINIDA**  
**Prioridad**: 🟡 **MEDIA** (Post-MVP)

**Descripción tentativa**:
- Importar actividades ejecutadas desde Garmin/Wahoo
- Sincronizar datos de ejecución con sesiones planificadas
- Comparar plan vs ejecución

**Dependencias**: Feature 004 (Device Connections)

---

### Feature 008: Activity Analysis
**Estado**: 📝 **NO DEFINIDA**  
**Prioridad**: 🟡 **MEDIA** (Post-MVP)

**Descripción tentativa**:
- Análisis de adherencia (¿hizo lo que se programó?)
- Análisis de carga y control
- Eficiencia macro
- Tendencias semanales

**Dependencias**: Feature 007 (Import Activities)

---

### Feature 009: Advanced Analytics
**Estado**: 📝 **NO DEFINIDA**  
**Prioridad**: 🟢 **BAJA** (Post-MVP)

**Descripción tentativa**:
- Análisis técnico avanzado
- Biomecánica fina
- Comparación de streams
- Análisis de interferencia fuerza-endurance

**Dependencias**: Feature 008 (Activity Analysis)

---

## 📈 Estado del MVP

### Completitud del MVP

| Componente | Estado | Notas |
|------------|--------|-------|
| **Auth & Users** | ✅ Completo | JWT, roles, perfiles |
| **Weekly Plans** | ✅ Completo | CRUD funcional |
| **Sessions** | ✅ Completo | STRENGTH y ENDURANCE |
| **Prescriptions** | ✅ Completo | Normalización implementada |
| **Device Connections** | ✅ Completo | OAuth Garmin/Wahoo |
| **Auto-Push** | ✅ Completo | Export automático |
| **Status Display** | ✅ Completo | UI en Athlete PWA |
| **Tests** | ⚠️ Parcial | 69 tests pasando, faltan e2e completos |
| **Documentación** | ⚠️ Parcial | Features 002-006 documentadas |

### Lo que Falta para MVP Completo

1. **Feature 001 Consolidación**:
   - [ ] Validar que todos los componentes están implementados
   - [ ] Completar tests faltantes
   - [ ] Crear `results.md` con estado completo
   - [ ] Marcar como COMPLETED

2. **Tests E2E Completos**:
   - [ ] Flujo completo coach → atleta → dispositivo
   - [ ] Tests de integración de todas las features juntas
   - [ ] Tests de regresión

3. **Documentación Final**:
   - [ ] `results.md` para Feature 001
   - [ ] Guía de usuario completa
   - [ ] Guía de deployment

---

## 🎯 Recomendaciones

### Prioridad Inmediata

1. **Completar Feature 001**:
   - Revisar qué componentes ya están implementados
   - Identificar gaps
   - Completar lo faltante
   - Documentar resultados

2. **Tests E2E**:
   - Completar tests de integración
   - Validar flujo completo end-to-end

### Post-MVP

- Definir specs detallados para Features 007-009
- Priorizar según feedback de usuarios
- Planificar roadmap post-MVP

---

## 📝 Notas

- **Feature 001** es crítica porque es el baseline del MVP
- Muchos componentes ya están implementados pero falta consolidación
- Features 002-006 están completas y documentadas
- MVP está funcionalmente completo, falta documentación y validación final

---

**Última revisión**: 2026-01-06  
**Revisado por**: Auto (AI Assistant)

