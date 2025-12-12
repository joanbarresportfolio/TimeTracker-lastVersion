# SISTEMA DE CONTROL DE FICHAJES DE EMPLEADOS

**Aplicación Web y Móvil para la Gestión del Tiempo de Trabajo**

*Adaptado a la Nueva Normativa Española de Registro Horario Digital*

---

**Trabajo de Fin de Grado**

Grado en Ingeniería Informática

React · TypeScript · Node.js · PostgreSQL · React Native

Curso Académico 2024-2025

Diciembre 2025

---

## TABLA DE CONTENIDO

1. [MOTIVACIÓN Y JUSTIFICACIÓN DEL PROYECTO](#1-motivación-y-justificación-del-proyecto)
   - 1.1. [Contexto Legal en España](#11-contexto-legal-en-españa)
   - 1.2. [Nueva Normativa de Registro Horario Digital](#12-nueva-normativa-de-registro-horario-digital)
   - 1.3. [Requisitos Técnicos Exigidos por la Ley](#13-requisitos-técnicos-exigidos-por-la-ley)
   - 1.4. [Necesidad de una Solución Tecnológica](#14-necesidad-de-una-solución-tecnológica)

2. [INTRODUCCIÓN AL PROYECTO](#2-introducción-al-proyecto)
   - 2.1. [Descripción del Proyecto](#21-descripción-del-proyecto)
   - 2.2. [Información General](#22-información-general)
   - 2.3. [Objetivos del Proyecto](#23-objetivos-del-proyecto)
   - 2.4. [Alcance y Limitaciones](#24-alcance-y-limitaciones)

3. [CONTEXTUALIZACIÓN TÉCNICA](#3-contextualización-técnica)
   - 3.1. [Objetivos Concretos](#31-objetivos-concretos)
   - 3.2. [Tecnologías Utilizadas](#32-tecnologías-utilizadas)
   - 3.3. [Tecnologías Alternativas Evaluadas](#33-tecnologías-alternativas-evaluadas)
   - 3.4. [Justificación de Decisiones Tecnológicas](#34-justificación-de-decisiones-tecnológicas)

4. [PLANIFICACIÓN DEL PROYECTO](#4-planificación-del-proyecto)
   - 4.1. [Temporalización](#41-temporalización)
   - 4.2. [Metodología de Desarrollo](#42-metodología-de-desarrollo)
   - 4.3. [Gestión de Riesgos](#43-gestión-de-riesgos)

5. [DESARROLLO DEL PROYECTO](#5-desarrollo-del-proyecto)
   - 5.0. [Fase Previa: Configuración del Entorno](#50-fase-previa-configuración-del-entorno)
   - 5.1. [Fase de Concepción y Análisis](#51-fase-de-concepción-y-análisis)
   - 5.2. [Fase de Diseño](#52-fase-de-diseño)
   - 5.3. [Fase de Planificación Técnica](#53-fase-de-planificación-técnica)
   - 5.4. [Fase de Producción](#54-fase-de-producción)
   - 5.5. [Fase de Pruebas](#55-fase-de-pruebas)
   - 5.6. [Fase de Despliegue](#56-fase-de-despliegue)

6. [ARQUITECTURA DE LA APLICACIÓN](#6-arquitectura-de-la-aplicación)
   - 6.1. [Arquitectura General del Sistema](#61-arquitectura-general-del-sistema)
   - 6.2. [Arquitectura del Backend](#62-arquitectura-del-backend)
   - 6.3. [Arquitectura del Frontend](#63-arquitectura-del-frontend)
   - 6.4. [Arquitectura de la Aplicación Móvil](#64-arquitectura-de-la-aplicación-móvil)

7. [IMPLEMENTACIÓN DETALLADA](#7-implementación-detallada)
   - 7.1. [Sistema de Autenticación](#71-sistema-de-autenticación)
   - 7.2. [Sistema de Fichaje](#72-sistema-de-fichaje)
   - 7.3. [Gestión de Horarios](#73-gestión-de-horarios)
   - 7.4. [Generación de Informes](#74-generación-de-informes)
   - 7.5. [Geolocalización](#75-geolocalización)

8. [ESTRUCTURA VISUAL](#8-estructura-visual)
   - 8.1. [Interfaz Web](#81-interfaz-web)
   - 8.2. [Interfaz Móvil](#82-interfaz-móvil)

9. [GESTIÓN DE DATOS](#9-gestión-de-datos)
   - 9.1. [Modelo de Datos Completo](#91-modelo-de-datos-completo)
   - 9.2. [Gestión de Zonas Horarias](#92-gestión-de-zonas-horarias)
   - 9.3. [Integridad y Consistencia](#93-integridad-y-consistencia)

10. [SEGURIDAD](#10-seguridad)
    - 10.1. [Autenticación](#101-autenticación)
    - 10.2. [Autorización](#102-autorización)
    - 10.3. [Protección de Datos (RGPD)](#103-protección-de-datos-rgpd)

11. [TESTS Y VALIDACIÓN](#11-tests-y-validación)

12. [CUMPLIMIENTO NORMATIVO](#12-cumplimiento-normativo)

13. [ANÁLISIS Y VALORACIÓN](#13-análisis-y-valoración)
    - 13.1. [Conclusiones](#131-conclusiones)
    - 13.2. [Mejoras Propuestas](#132-mejoras-propuestas)

14. [BIBLIOGRAFÍA Y REFERENCIAS](#14-bibliografía-y-referencias)

15. [ANEXOS](#15-anexos)

---

# 1. MOTIVACIÓN Y JUSTIFICACIÓN DEL PROYECTO

El presente Trabajo de Fin de Grado surge como respuesta a una necesidad real y urgente del tejido empresarial español: la obligación legal de implementar sistemas de registro horario digital que cumplan con la nueva normativa laboral. Este capítulo analiza el contexto legal que motiva el desarrollo del proyecto y justifica la necesidad de crear una solución tecnológica específica.

## 1.1. Contexto Legal en España

Desde el año 2019, con la entrada en vigor del **Real Decreto-ley 8/2019, de 8 de marzo**, de medidas urgentes de protección social y de lucha contra la precariedad laboral en la jornada de trabajo, todas las empresas en España están obligadas a llevar un registro diario de la jornada laboral de sus trabajadores.

Esta normativa supuso un cambio significativo en la gestión del tiempo de trabajo, estableciendo la obligatoriedad de registrar la hora de inicio y fin de la jornada de cada empleado. La modificación afectó directamente al artículo 34.9 del Estatuto de los Trabajadores, que quedó redactado de la siguiente manera:

> **Real Decreto-ley 8/2019, de 8 de marzo**
>
> *"La empresa garantizará el registro diario de jornada, que deberá incluir el horario concreto de inicio y finalización de la jornada de trabajo de cada persona trabajadora, sin perjuicio de la flexibilidad horaria que se establece en este artículo."*
>
> — Artículo 34.9 del Estatuto de los Trabajadores (modificado por el RDL 8/2019)

Los objetivos principales de esta regulación fueron:

- **Combatir la precariedad laboral:** Evitar abusos en las jornadas de trabajo no remuneradas
- **Controlar las horas extraordinarias:** Garantizar su correcta contabilización y compensación
- **Proteger los derechos de los trabajadores:** Asegurar el cumplimiento de los límites de jornada establecidos en convenios colectivos
- **Facilitar la labor inspectora:** Proporcionar evidencias objetivas para las actuaciones de la Inspección de Trabajo

Sin embargo, la normativa de 2019 dejaba cierta flexibilidad en cuanto al método de registro, permitiendo sistemas tan diversos como hojas de papel firmadas, ficheros Excel, aplicaciones móviles o sistemas informáticos especializados. Esta ambigüedad, si bien facilitó la transición inicial, ha generado problemas de fraude, manipulación de registros y dificultades para las inspecciones de trabajo.

### 1.1.1. Problemática Detectada (2019-2024)

Durante los cinco años de vigencia de la normativa inicial, la Inspección de Trabajo y Seguridad Social ha detectado numerosas irregularidades:

- **Registros manipulados:** Hojas de papel rellenadas a posteriori con datos falsos
- **Ficheros Excel editables:** Modificaciones de horarios para ocultar horas extras
- **Falta de trazabilidad:** Imposibilidad de verificar cuándo se realizaron los registros
- **Fichaje por terceros:** Empleados que fichan por compañeros ausentes
- **Sistemas biométricos invasivos:** Uso desproporcionado de huella dactilar y reconocimiento facial sin base legal suficiente

## 1.2. Nueva Normativa de Registro Horario Digital

Ante las deficiencias detectadas en el cumplimiento de la normativa de 2019, el Gobierno de España ha impulsado una nueva regulación que introduce cambios sustanciales en los requisitos del registro horario. Esta nueva normativa, actualmente en tramitación parlamentaria (diciembre 2025), establece la **obligatoriedad del formato digital** para el registro de jornada.

### 1.2.1. Principales Novedades de la Nueva Ley

| Aspecto | Normativa 2019 | Nueva Normativa 2024-2025 |
|---------|----------------|---------------------------|
| Formato del registro | Libre (papel, Excel, digital) | **Digital obligatorio** |
| Métodos permitidos | Sin restricciones específicas | Solo sistemas electrónicos trazables |
| Acceso de la Inspección | Presencial, bajo solicitud | **Telemático en tiempo real** |
| Modificaciones | Sin control específico | Trazabilidad completa de cambios |
| Biometría | Permitida sin restricciones | **Restringida** (solo casos excepcionales) |
| Conservación | 4 años | 4 años (sin cambios) |
| Sanciones máximas | Hasta 6.250 € (grave) | Hasta **225.018 €** (muy grave) |

### 1.2.2. Cronología de la Nueva Normativa

- **Marzo 2019:** Entrada en vigor del Real Decreto-ley 8/2019. Obligación de registro horario para todas las empresas.
- **2020-2023:** Periodo de adaptación. La Inspección de Trabajo detecta numerosas irregularidades: registros manipulados, falta de control, uso de métodos no fiables.
- **2024:** El Ministerio de Trabajo anuncia la reforma para exigir el registro digital obligatorio. Se inicia la tramitación del anteproyecto de ley.
- **Diciembre 2025:** La normativa se encuentra en trámite parlamentario. Se prevé su aprobación de forma independiente a la reducción de jornada.
- **2026 (previsto):** Entrada en vigor tras un periodo de adaptación de 5-6 meses desde la publicación en el BOE.

### 1.2.3. Ámbito de Aplicación

La nueva normativa de registro horario digital se aplica a:

- **Todas las empresas**, sin importar tamaño o sector:
  - Grandes empresas y multinacionales
  - PYMES (pequeñas y medianas empresas)
  - Microempresas
  - Autónomos con empleados a su cargo
- **Todos los sectores de actividad:** industria, comercio, hostelería, servicios, construcción, transporte, tecnología, etc.
- **Todos los tipos de trabajadores:** contratos indefinidos, temporales, a tiempo parcial, en prácticas, teletrabajadores, trabajadores itinerantes.

> **Exclusiones:** Quedan excluidos de la obligación los autónomos sin empleados a su cargo y los becarios (aunque estos últimos deben llevar un control de horas de beca, pero sin las formalidades del registro laboral).

## 1.3. Requisitos Técnicos Exigidos por la Ley

La nueva normativa establece requisitos técnicos específicos que deben cumplir los sistemas de registro horario digital. Estos requisitos son fundamentales para garantizar la validez legal del registro y evitar sanciones.

### 1.3.1. Requisitos Obligatorios del Sistema

| Requisito | Descripción | Cumplimiento en Este Proyecto |
|-----------|-------------|-------------------------------|
| Formato digital | El sistema debe ser electrónico (software, app, terminal) | ✓ Aplicación web y móvil |
| Trazabilidad | Identificación inequívoca del empleado, fecha y hora exactas | ✓ UUID de usuario, timestamps en UTC |
| Inmutabilidad | Evitar modificaciones no autorizadas, registrar cambios | ✓ Entradas clock_entries inmutables |
| Accesibilidad | Trabajadores, representantes e Inspección deben poder consultar | ✓ Historial visible para empleados |
| Conservación | Registros guardados durante 4 años mínimo | ✓ Base de datos PostgreSQL persistente |
| Registro de pausas | Pausas y descansos que afecten al cómputo horario | ✓ break_start y break_end implementados |
| Fichaje personal | Al inicio y fin de jornada, por el propio trabajador | ✓ Login individual requerido para fichar |
| Interoperabilidad | Compatible con sistemas de la Administración | ✓ Exportación Excel estándar |
| Servidores en UE | Cumplimiento RGPD, datos en territorio europeo | ✓ PostgreSQL en servidores europeos |

### 1.3.2. Métodos NO Permitidos

> **Métodos prohibidos por la nueva normativa:**
> - **Hojas de papel:** Partes de firma, libros de registro físicos
> - **Excel u hojas de cálculo:** Por ser fácilmente manipulables
> - **Sistemas biométricos:** Huella dactilar, reconocimiento facial (salvo casos excepcionales muy justificados)
> - **Geolocalización permanente:** El seguimiento GPS fuera de la jornada laboral está prohibido
> - **Fichaje con móvil personal obligatorio:** La empresa debe proporcionar los medios necesarios

### 1.3.3. Métodos Permitidos

> **Métodos válidos según la nueva normativa:**
> - **Software de control horario:** Aplicaciones SaaS, cloud, on-premise
> - **Aplicaciones móviles:** Apps iOS/Android proporcionadas por la empresa
> - **Terminales físicos:** Tablets, quioscos digitales, terminales de fichaje
> - **Tarjetas electrónicas:** Con código único e identificación del empleado
> - **Códigos QR:** Escaneados con dispositivos de la empresa
> - **Acceso web:** Plataformas online con login individual

### 1.3.4. Régimen Sancionador

El incumplimiento de la normativa de registro horario conlleva sanciones económicas significativas:

| Tipo de Infracción | Ejemplos | Sanción |
|--------------------|----------|---------|
| Leve | Defectos formales menores en el registro | 60 € - 625 € |
| Grave | No disponer de sistema de registro, no conservar registros 4 años | 625 € - 6.250 € |
| Muy Grave | Falsificación de registros, exceso reiterado de horas extras, negativa a facilitar acceso a Inspección | 6.251 € - 225.018 € |

Según datos de la Inspección de Trabajo (2024), se impusieron **20,2 millones de euros en sanciones** por incumplimiento del registro horario, afectando a más de 21.000 trabajadores.

## 1.4. Necesidad de una Solución Tecnológica

Ante el panorama normativo descrito, la necesidad de contar con una solución tecnológica adecuada es evidente. Este proyecto nace precisamente para dar respuesta a esta demanda del mercado.

### 1.4.1. Beneficios para las Empresas

1. **Cumplimiento legal garantizado:** El sistema está diseñado siguiendo todos los requisitos técnicos de la nueva normativa.
2. **Reducción de costes:** Evita sanciones que pueden alcanzar los 225.000 € y automatiza procesos manuales.
3. **Transparencia:** Los empleados tienen acceso a su historial de fichajes, reduciendo conflictos laborales.
4. **Optimización de recursos:** Los informes automáticos facilitan la gestión de RRHH.
5. **Preparación para inspecciones:** Los datos están siempre disponibles y pueden exportarse en formatos estándar.

### 1.4.2. Beneficios para los Trabajadores

1. **Control de su tiempo:** Visibilidad total sobre sus horas trabajadas.
2. **Garantía de derechos:** Las horas extras quedan registradas fehacientemente.
3. **Facilidad de uso:** Fichaje rápido desde móvil o web.
4. **Conciliación:** Mejor control favorece el respeto a los horarios pactados.

### 1.4.3. Justificación Académica

Desde el punto de vista académico, este proyecto permite:

- Aplicar conocimientos de desarrollo full-stack (frontend, backend, base de datos)
- Trabajar con tecnologías modernas demandadas en el mercado laboral
- Desarrollar una aplicación móvil nativa con React Native
- Implementar sistemas de autenticación y autorización
- Gestionar datos complejos con relaciones entre entidades
- Resolver problemas reales como la gestión de zonas horarias
- Generar documentación técnica profesional

---

# 2. INTRODUCCIÓN AL PROYECTO

## 2.1. Descripción del Proyecto

El Sistema de Control de Fichajes de Empleados es una **solución integral de gestión del tiempo de trabajo** desarrollada para satisfacer las necesidades de empresas de cualquier tamaño que buscan cumplir con la normativa española de registro horario de manera eficiente y moderna.

El proyecto se compone de dos aplicaciones principales que trabajan de forma coordinada:

### 2.1.1. Aplicación Web (Panel de Administración)

La aplicación web está diseñada para los administradores y responsables de recursos humanos. Proporciona un panel de control completo con las siguientes funcionalidades:

- **Dashboard:** Visión general del estado de la plantilla en tiempo real, con estadísticas de empleados presentes, ausentes, en pausa y total de horas trabajadas.
- **Gestión de empleados:** Alta, baja y modificación de empleados, asignación a departamentos y roles.
- **Control de fichajes:** Visualización de los fichajes del día, con posibilidad de registrar entradas manuales y ver ubicaciones en mapa.
- **Planificación de horarios:** Calendario anual para asignar turnos a los empleados, con soporte para turnos continuos y partidos.
- **Gestión de incidencias:** Registro de ausencias, permisos, vacaciones y otras incidencias laborales.
- **Generación de informes:** Exportación de datos a Excel con desglose por empleado y período.
- **Configuración:** Gestión de departamentos, roles empresariales y tipos de incidencia.

### 2.1.2. Aplicación Móvil (Para Empleados)

La aplicación móvil está orientada a los empleados y les permite gestionar sus fichajes de forma autónoma:

- **Fichaje rápido:** Registro de entrada, salida e inicio/fin de pausas con un solo toque.
- **Geolocalización:** Captura opcional de ubicación GPS al fichar.
- **Consulta de horarios:** Visualización de los turnos asignados.
- **Historial:** Acceso al historial de fichajes propios.
- **Perfil:** Gestión de datos personales y cierre de sesión.

## 2.2. Información General

El proyecto se ha desarrollado siguiendo las mejores prácticas de ingeniería de software, utilizando herramientas profesionales y metodologías ágiles.

| Característica | Descripción |
|----------------|-------------|
| Tipo de proyecto | Aplicación Full-Stack (Web + Móvil) |
| Arquitectura | Monorepo con código compartido |
| Entorno de desarrollo | Visual Studio Code |
| Lenguaje principal | TypeScript (100% del código) |
| Base de datos | PostgreSQL |
| Frontend Web | React 18 + Vite + Tailwind CSS |
| Frontend Móvil | React Native + Expo SDK 52 |
| Backend | Node.js + Express |
| ORM | Drizzle ORM |
| Validación | Zod (esquemas compartidos) |
| Estado del servidor | TanStack Query v5 |
| Autenticación Web | Sesiones (express-session) |
| Autenticación Móvil | JWT (jsonwebtoken) |
| Despliegue | Railway (backend) + Vercel (frontend) |

## 2.3. Objetivos del Proyecto

### 2.3.1. Objetivo Principal

Desarrollar una solución completa y profesional para la gestión del tiempo de trabajo que cumpla con todos los requisitos de la nueva normativa española de registro horario digital, proporcionando a las empresas una herramienta fiable, segura y fácil de usar.

### 2.3.2. Objetivos Específicos

1. **Digitalizar el proceso de fichaje:**
   - Eliminar los sistemas manuales de registro (papel, Excel)
   - Proporcionar un sistema trazable e inmutable
   - Reducir errores humanos y posibilidades de fraude

2. **Proporcionar visibilidad en tiempo real:**
   - Dashboard con estado actual de la plantilla
   - Alertas de anomalías (empleados sin fichar, exceso de horas)
   - Estadísticas y métricas de productividad

3. **Facilitar la movilidad laboral:**
   - Aplicación móvil nativa para iOS y Android
   - Fichaje desde cualquier ubicación con conexión a internet
   - Geolocalización opcional para verificación

4. **Automatizar la generación de informes:**
   - Exportación a Excel con formato profesional
   - Desglose por empleado, fecha y concepto
   - Cálculo automático de horas extras y pausas

5. **Garantizar la seguridad de los datos:**
   - Autenticación robusta con sesiones y JWT
   - Contraseñas encriptadas con bcrypt
   - Cumplimiento RGPD

## 2.4. Alcance y Limitaciones

### 2.4.1. Funcionalidades Incluidas

- Autenticación de usuarios (administradores y empleados)
- Gestión completa de empleados (CRUD)
- Gestión de departamentos y roles empresariales
- Registro de fichajes (entrada, salida, pausas)
- Geolocalización de fichajes (opcional)
- Planificación de horarios con calendario anual
- Gestión de incidencias laborales
- Dashboard con estadísticas en tiempo real
- Generación de informes en Excel
- Visualización de ubicaciones en mapa
- Modo claro/oscuro
- Interfaz responsive
- Aplicación móvil nativa

### 2.4.2. Limitaciones Actuales

- No incluye integración con sistemas de nóminas
- No incluye notificaciones push (pendiente de implementación)
- No incluye reconocimiento biométrico (no recomendado por AEPD)
- No incluye fichaje offline (requiere conexión a internet)
- No incluye multi-idioma (actualmente solo español)

---

# 3. CONTEXTUALIZACIÓN TÉCNICA

## 3.1. Objetivos Concretos

Para alcanzar los objetivos generales del proyecto, se definieron objetivos concretos medibles que sirvieron como guía durante todo el proceso de desarrollo.

### 3.1.1. Objetivos Funcionales

| ID | Objetivo | Prioridad | Estado |
|----|----------|-----------|--------|
| OF-01 | Implementar sistema de autenticación seguro con roles diferenciados | Alta | ✓ Completado |
| OF-02 | Desarrollar funcionalidad de fichaje con registro temporal preciso | Alta | ✓ Completado |
| OF-03 | Crear módulo de gestión de empleados con CRUD completo | Alta | ✓ Completado |
| OF-04 | Implementar gestión de departamentos y roles empresariales | Media | ✓ Completado |
| OF-05 | Desarrollar sistema de planificación de horarios | Alta | ✓ Completado |
| OF-06 | Crear calendario anual para asignación de turnos | Media | ✓ Completado |
| OF-07 | Implementar módulo de incidencias | Media | ✓ Completado |
| OF-08 | Desarrollar geolocalización en fichajes móviles | Media | ✓ Completado |
| OF-09 | Implementar generación de informes Excel | Alta | ✓ Completado |
| OF-10 | Crear dashboard con estadísticas en tiempo real | Media | ✓ Completado |
| OF-11 | Implementar visualización de ubicaciones en mapa | Baja | ✓ Completado |
| OF-12 | Desarrollar aplicación móvil completa | Alta | ✓ Completado |

### 3.1.2. Objetivos Técnicos

| ID | Objetivo | Estado |
|----|----------|--------|
| OT-01 | Utilizar TypeScript en todo el proyecto para tipado estático | ✓ Completado |
| OT-02 | Implementar arquitectura modular (routes, services, storages) | ✓ Completado |
| OT-03 | Gestionar fechas en UTC, mostrar en zona horaria española | ✓ Completado |
| OT-04 | Diseñar API RESTful siguiendo mejores prácticas | ✓ Completado |
| OT-05 | Implementar validación en frontend y backend con Zod | ✓ Completado |
| OT-06 | Crear interfaces responsive para cualquier dispositivo | ✓ Completado |
| OT-07 | Optimizar consultas de base de datos | ✓ Completado |
| OT-08 | Implementar modo claro/oscuro | ✓ Completado |

## 3.2. Tecnologías Utilizadas

### 3.2.1. Frontend Web

#### React 18
React es la biblioteca de JavaScript más popular para la construcción de interfaces de usuario. La versión 18 introduce mejoras significativas como Concurrent Rendering, Automatic Batching y mejoras en Suspense.

#### TypeScript
TypeScript añade tipado estático a JavaScript, proporcionando detección de errores en tiempo de desarrollo, mejor autocompletado y documentación implícita del código.

#### Vite
Vite es el build tool de nueva generación que ofrece arranque instantáneo del servidor de desarrollo, Hot Module Replacement ultrarrápido y build optimizado para producción.

#### Tailwind CSS
Framework de CSS utility-first que permite desarrollo rápido, diseño consistente mediante design tokens y bundle CSS mínimo.

#### Shadcn/UI + Radix UI
Colección de componentes accesibles y personalizables con accesibilidad WCAG incorporada.

#### TanStack Query v5
Biblioteca para gestión del estado del servidor con caché automático, revalidación en segundo plano y gestión de estados de carga.

### 3.2.2. Frontend Móvil

#### Expo SDK 52
Framework que simplifica el desarrollo con React Native, proporcionando desarrollo sin necesidad de Xcode o Android Studio, acceso simplificado a APIs nativas y sistema de builds en la nube.

#### Expo Router
Sistema de navegación basado en el sistema de archivos con navegación por tabs y stacks integrada.

### 3.2.3. Backend

#### Node.js
Entorno de ejecución de JavaScript del lado del servidor con modelo de I/O no bloqueante, ideal para APIs.

#### Express
Framework web minimalista y flexible con middleware system para procesamiento de peticiones.

#### Drizzle ORM
ORM moderno con enfoque "type-safe", sintaxis SQL-like intuitiva y generación automática de esquemas Zod.

### 3.2.4. Base de Datos

#### PostgreSQL
Sistema de gestión de base de datos relacional ACID compliant con soporte para tipos de datos avanzados y funciones de fecha/hora con zonas horarias.

## 3.3. Tecnologías Alternativas Evaluadas

| Categoría | Alternativas | Elección | Justificación |
|-----------|--------------|----------|---------------|
| Frontend | Vue.js, Angular, Svelte | React | Mayor ecosistema, integración con React Native |
| Móvil | Flutter, Ionic, NativeScript | React Native + Expo | Código compartido con web, rendimiento nativo |
| Backend | NestJS, Fastify, Hono | Express | Simplicidad, madurez, documentación extensa |
| ORM | Prisma, TypeORM, Sequelize | Drizzle | Mejor rendimiento, tipado más estricto |
| Base de Datos | MySQL, MongoDB, SQLite | PostgreSQL | Robustez, características avanzadas |

## 3.4. Justificación de Decisiones Tecnológicas

### 3.4.1. ¿Por qué TypeScript?

La decisión de utilizar TypeScript en todo el proyecto se fundamenta en:

- **Seguridad de tipos:** Detecta errores en tiempo de compilación
- **Productividad:** Autocompletado y documentación inline
- **Mantenibilidad:** Código más fácil de entender y refactorizar
- **Compartición de tipos:** Mismos interfaces en frontend y backend

### 3.4.2. ¿Por qué Drizzle en lugar de Prisma?

| Aspecto | Drizzle | Prisma |
|---------|---------|--------|
| Rendimiento | Queries SQL directas | Capa de abstracción adicional |
| Bundle size | ~50KB | ~2MB |
| Integración Zod | Nativa | Requiere biblioteca externa |

---

# 4. PLANIFICACIÓN DEL PROYECTO

## 4.1. Temporalización

El proyecto se desarrolló siguiendo un enfoque iterativo, dividido en fases bien definidas.

### 4.1.1. Cronograma Detallado

| Fase | Duración | Actividades | Entregables |
|------|----------|-------------|-------------|
| Fase 0: Preparación | 1 semana | Configuración entorno, estructura proyecto, BD | Proyecto base funcional |
| Fase 1: Concepción | 1 semana | Análisis requisitos, casos de uso, modelo datos | Documentación de requisitos |
| Fase 2: Diseño | 2 semanas | Diseño BD, API, mockups UI | Esquemas y diseños aprobados |
| Fase 3: Planificación | 1 semana | División módulos, priorización tareas | Backlog priorizado |
| Fase 4: Producción | 8 semanas | Desarrollo backend, frontend web, app móvil | Aplicación funcional |
| Fase 5: Pruebas | 2 semanas | Testing, corrección bugs, optimización | Aplicación estable |
| Fase 6: Despliegue | 1 semana | Publicación web, compilación APK | Aplicación desplegada |

### 4.1.2. Diagrama de Gantt

```
Semana:     1    2    3    4    5    6    7    8    9   10   11   12   13   14   15   16
            |    |    |    |    |    |    |    |    |    |    |    |    |    |    |    |
Fase 0:     ████
Fase 1:          ████
Fase 2:               ████████
Fase 3:                         ████
Fase 4:                              ████████████████████████████████████████
  - Backend:                         ████████████
  - Frontend Web:                              ████████████████
  - App Móvil:                                               ████████████
Fase 5:                                                                       ████████
Fase 6:                                                                                ████
```

## 4.2. Metodología de Desarrollo

Se aplicó una metodología ágil adaptada, combinando principios de Scrum con prácticas de desarrollo iterativo.

### 4.2.1. Principios Aplicados

- **Iteraciones cortas:** Sprints de 1-2 semanas con objetivos definidos
- **Entrega continua:** Cada iteración produce una versión funcional
- **Priorización MoSCoW:** Must have, Should have, Could have, Won't have
- **Feedback continuo:** Revisiones frecuentes y ajustes del plan

### 4.2.2. Herramientas de Desarrollo

- **Editor de código:** Visual Studio Code con extensiones para TypeScript, ESLint, Prettier
- **Control de versiones:** Git con flujo de ramas feature/develop/main
- **Gestión de tareas:** Tablero Kanban con columnas To Do, In Progress, Done
- **Documentación:** Markdown para documentación técnica

## 4.3. Gestión de Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Problemas de rendimiento con consultas complejas | Media | Alto | Optimización de queries, índices en BD |
| Errores en gestión de zonas horarias | Alta | Alto | Almacenamiento en UTC, conversión consistente |
| Incompatibilidades en app móvil | Media | Medio | Uso de Expo para abstracción |
| Cambios en la normativa | Baja | Medio | Arquitectura flexible, seguimiento de novedades |

---

# 5. DESARROLLO DEL PROYECTO

## 5.0. Fase Previa: Configuración del Entorno

### 5.0.1. Configuración del Entorno de Desarrollo

El desarrollo se realizó utilizando **Visual Studio Code** como editor principal, configurado con las siguientes extensiones:

- **ESLint:** Análisis estático de código
- **Prettier:** Formateo automático de código
- **TypeScript Vue Plugin:** Soporte mejorado para TypeScript
- **Tailwind CSS IntelliSense:** Autocompletado de clases
- **PostgreSQL:** Gestión de base de datos
- **REST Client:** Pruebas de API

### 5.0.2. Estructura del Proyecto

Se estableció una estructura monorepo con código compartido:

```
proyecto/
├── client/                 # Frontend Web (React + Vite)
├── server/                 # Backend (Express)
├── shared/                 # Código compartido (esquemas)
├── mobile-app/             # Aplicación Móvil (Expo)
├── docs/                   # Documentación
├── package.json            # Dependencias raíz
├── tsconfig.json           # Configuración TypeScript
├── vite.config.ts          # Configuración Vite
└── drizzle.config.ts       # Configuración Drizzle
```

### 5.0.3. Configuración de Base de Datos

Se configuró la conexión a PostgreSQL mediante Drizzle ORM:

```typescript
// server/db.ts
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import * as schema from "@shared/schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
```

## 5.1. Fase de Concepción y Análisis

### 5.1.1. Análisis de Requisitos Detallado

Se realizó un análisis exhaustivo de los requisitos del sistema, considerando tanto las necesidades funcionales como los requisitos legales de la normativa española.

#### Requisitos Funcionales Detallados

**RF-01: Autenticación de Usuarios**
- El sistema debe permitir el inicio de sesión con email y contraseña
- Las contraseñas deben almacenarse con hash bcrypt (factor 10)
- El sistema debe soportar sesiones para web y JWT para móvil
- Debe existir la posibilidad de cerrar sesión

**RF-02: Gestión de Empleados**
- Crear empleados con: número de empleado, nombre, apellidos, email, departamento, rol
- El número de empleado debe ser único
- Editar cualquier campo de un empleado existente
- Eliminar empleados con eliminación en cascada de datos relacionados

**RF-03: Registro de Fichajes**
- Registrar entrada (clock_in) con timestamp
- Registrar salida (clock_out) con timestamp
- Registrar inicio de pausa (break_start)
- Registrar fin de pausa (break_end)
- Opcionalmente capturar coordenadas GPS

### 5.1.2. Casos de Uso Principales

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CASOS DE USO PRINCIPALES                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  EMPLEADO                            ADMINISTRADOR                          │
│  ────────                            ──────────────                         │
│  • Iniciar sesión                    • Todos los del empleado, más:         │
│  • Registrar entrada                 • Gestionar empleados (CRUD)           │
│  • Registrar salida                  • Gestionar departamentos              │
│  • Iniciar pausa                     • Gestionar roles                      │
│  • Finalizar pausa                   • Asignar horarios                     │
│  • Ver mis horarios                  • Registrar incidencias                │
│  • Ver mi historial                  • Generar informes                     │
│  • Cerrar sesión                     • Ver dashboard                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 5.2. Fase de Diseño

### 5.2.1. Diseño del Modelo de Datos

El modelo de datos se diseñó para cumplir con los requisitos funcionales y legales:

```
                    ┌─────────────────┐
                    │   DEPARTMENTS   │
                    ├─────────────────┤
                    │ id (PK)         │
                    │ name            │
                    │ description     │
                    └────────┬────────┘
                             │ 1
                             │ *
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ ROLES_ENTERPRISE│    │      USERS      │    │  INCIDENTS_TYPE │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ id (PK)         │    │ id (PK)         │    │ id (PK)         │
│ name (UNIQUE)   │◄───│ departmentId(FK)│    │ name            │
│ description     │    │ roleId (FK)     │    │ description     │
└─────────────────┘    │ numEmployee(UQ) │    │ color           │
                       │ firstName       │    └────────┬────────┘
                       │ lastName        │             │
                       │ email (UNIQUE)  │             │
                       │ password        │    ┌─────────────────┐
                       │ isAdmin         │    │    INCIDENTS    │
                       │ isActive        │    ├─────────────────┤
                       └────────┬────────┘    │ id (PK)         │
                                │             │ idUser (FK)     │
           ┌────────────────────┼───────────► │ incidentTypeId  │
           │                    │             │ description     │
           ▼                    ▼             │ date            │
┌─────────────────┐    ┌─────────────────┐    └─────────────────┘
│   SCHEDULES     │    │  CLOCK_ENTRIES  │
├─────────────────┤    ├─────────────────┤    ┌─────────────────┐
│ id (PK)         │    │ id (PK)         │    │  DAILY_WORKDAY  │
│ idUser (FK)     │    │ userId (FK)     │    ├─────────────────┤
│ date            │    │ entryType       │    │ id (PK)         │
│ startTime       │    │ timestamp       │    │ idUser (FK)     │
│ endTime         │    │ latitude        │    │ date            │
│ startBreak      │    │ longitude       │    │ clockIn         │
│ endBreak        │    │ source          │    │ clockOut        │
└─────────────────┘    └─────────────────┘    │ totalHours      │
                                              └─────────────────┘
```

### 5.2.2. Diseño de la API REST

| Recurso | Método | Endpoint | Descripción |
|---------|--------|----------|-------------|
| Auth | POST | /api/auth/login | Iniciar sesión |
| Auth | POST | /api/auth/logout | Cerrar sesión |
| Auth | GET | /api/auth/me | Usuario actual |
| Users | GET | /api/users | Listar empleados |
| Users | POST | /api/users | Crear empleado |
| Users | PATCH | /api/users/:id | Actualizar empleado |
| Users | DELETE | /api/users/:id | Eliminar empleado |
| Clock | POST | /api/clock-entries | Registrar fichaje |
| Schedules | POST | /api/schedules/batch | Crear horarios en bloque |
| Reports | GET | /api/reports/excel | Generar informe Excel |

## 5.3. Fase de Planificación Técnica

Se definió la arquitectura técnica del sistema, incluyendo la estructura de directorios, patrones de diseño y convenciones de código.

### 5.3.1. Arquitectura por Capas

- **Routes (Controladores):** Reciben las peticiones HTTP y validan datos de entrada
- **Services:** Contienen la lógica de negocio compleja
- **Storages:** Encapsulan el acceso a la base de datos

## 5.4. Fase de Producción

### 5.4.1. Desarrollo del Backend

El backend se implementó siguiendo la arquitectura de tres capas definida en la fase de diseño.

#### Implementación de Storages

```typescript
// server/storages/userStorage.ts
import { db } from "../db";
import { users, InsertUser, User } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";

export const userStorage = {
  async getAll(): Promise<User[]> {
    return db.select().from(users).where(eq(users.isActive, true));
  },

  async getById(id: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, id), eq(users.isActive, true)));
    return user;
  },

  async create(data: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const [user] = await db
      .insert(users)
      .values({ ...data, password: hashedPassword })
      .returning();
    return user;
  }
};
```

#### Implementación de Rutas

```typescript
// server/routes/userRoutes.ts
import { Router } from "express";
import { requireAdmin } from "../middleware/auth";
import { userStorage } from "../storages/userStorage";
import { insertUserSchema } from "@shared/schema";

const router = Router();

router.get("/", requireAdmin, async (req, res) => {
  const users = await userStorage.getAll();
  const sanitizedUsers = users.map(({ password, ...user }) => user);
  res.json(sanitizedUsers);
});

router.post("/", requireAdmin, async (req, res) => {
  const validatedData = insertUserSchema.parse(req.body);
  const newUser = await userStorage.create(validatedData);
  res.status(201).json(newUser);
});

export default router;
```

### 5.4.2. Desarrollo del Frontend Web

El frontend web se desarrolló con React y TanStack Query para la gestión del estado del servidor.

```tsx
// Ejemplo de uso de TanStack Query
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

function EmployeeList() {
  const queryClient = useQueryClient();
  
  const { data: employees, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });
  
  const deleteMutation = useMutation({
    mutationFn: (id: string) => 
      apiRequest(`/api/users/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    }
  });
  
  if (isLoading) return <Skeleton />;
  
  return (
    <Table>
      {employees?.map(employee => (
        <TableRow key={employee.id}>
          <TableCell>{employee.firstName}</TableCell>
          <TableCell>
            <Button onClick={() => deleteMutation.mutate(employee.id)}>
              Eliminar
            </Button>
          </TableCell>
        </TableRow>
      ))}
    </Table>
  );
}
```

### 5.4.3. Desarrollo de la Aplicación Móvil

La aplicación móvil se desarrolló con React Native y Expo, implementando las funcionalidades de fichaje y geolocalización.

```typescript
// mobile-app/src/services/location.ts
import * as Location from 'expo-location';

export async function getCurrentLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
}
```

## 5.5. Fase de Pruebas

Se realizaron pruebas manuales exhaustivas de todas las funcionalidades, incluyendo:

- Pruebas de autenticación (login/logout)
- Pruebas de CRUD de empleados, departamentos, roles
- Pruebas de fichaje desde web y móvil
- Pruebas de geolocalización
- Pruebas de generación de informes Excel
- Pruebas de gestión de zonas horarias

## 5.6. Fase de Despliegue

El despliegue se realizó utilizando servicios cloud profesionales:

- **Backend:** Railway (Node.js + PostgreSQL)
- **Frontend:** Vercel (optimizado para React/Vite)
- **Base de datos:** Neon PostgreSQL (serverless)
- **Aplicación móvil:** Expo EAS Build para compilación de APK/IPA

### 5.6.1. Configuración de Despliegue

Se configuraron las variables de entorno necesarias en cada servicio:

- `DATABASE_URL`: Conexión a PostgreSQL
- `SESSION_SECRET`: Secreto para sesiones web
- `JWT_SECRET`: Secreto para tokens móviles
- `NODE_ENV`: production

---

# 6. ARQUITECTURA DE LA APLICACIÓN

## 6.1. Arquitectura General del Sistema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ARQUITECTURA DEL SISTEMA                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────┐        ┌─────────────┐        ┌─────────────┐            │
│   │   Cliente   │        │   Cliente   │        │   Cliente   │            │
│   │     Web     │        │    Móvil    │        │    Admin    │            │
│   │  (React)    │        │(React Native│        │   (Web)     │            │
│   └──────┬──────┘        └──────┬──────┘        └──────┬──────┘            │
│          │                      │                      │                    │
│          └──────────────────────┼──────────────────────┘                    │
│                                 │                                           │
│                         ┌───────▼───────┐                                   │
│                         │   API REST    │                                   │
│                         │  (Express)    │                                   │
│                         └───────┬───────┘                                   │
│                                 │                                           │
│              ┌──────────────────┼──────────────────┐                       │
│              │                  │                  │                        │
│       ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐               │
│       │   Routes    │    │  Services   │    │  Storages   │               │
│       │ (Endpoints) │    │  (Lógica)   │    │    (BD)     │               │
│       └─────────────┘    └─────────────┘    └──────┬──────┘               │
│                                                     │                       │
│                                              ┌──────▼──────┐               │
│                                              │ PostgreSQL  │               │
│                                              │  (Neon)     │               │
│                                              └─────────────┘               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 6.2. Arquitectura del Backend

El backend sigue una arquitectura de tres capas que separa responsabilidades:

### 6.2.1. Capa de Rutas (Routes)
- Recibe peticiones HTTP
- Valida datos de entrada con Zod
- Devuelve respuestas JSON
- Maneja errores de forma consistente

### 6.2.2. Capa de Servicios (Services)
- Contiene lógica de negocio compleja
- Coordina operaciones entre múltiples storages
- Calcula horas trabajadas, pausas, etc.
- Genera informes Excel

### 6.2.3. Capa de Almacenamiento (Storages)
- Encapsula operaciones CRUD
- Utiliza Drizzle ORM
- Maneja transacciones de base de datos

## 6.3. Arquitectura del Frontend

El frontend web sigue una arquitectura basada en componentes con gestión de estado mediante TanStack Query.

```
client/src/
├── components/
│   ├── ui/                 # Componentes Shadcn/UI
│   ├── app-sidebar.tsx     # Sidebar principal
│   └── theme-toggle.tsx    # Toggle tema oscuro
├── pages/
│   ├── dashboard.tsx       # Panel de control
│   ├── employees.tsx       # Gestión empleados
│   ├── time-tracking.tsx   # Control fichajes
│   ├── schedules.tsx       # Horarios
│   ├── incidents.tsx       # Incidencias
│   └── reports.tsx         # Informes
├── hooks/
│   └── use-toast.ts
├── lib/
│   ├── queryClient.ts
│   └── utils.ts
└── App.tsx
```

## 6.4. Arquitectura de la Aplicación Móvil

La aplicación móvil utiliza Expo Router para navegación basada en archivos:

```
mobile-app/app/
├── _layout.tsx          # Layout raíz (providers)
├── index.tsx            # Redirección inicial
├── login.tsx            # Pantalla de login
└── (tabs)/              # Grupo de tabs (autenticado)
    ├── _layout.tsx      # Layout de tabs
    ├── index.tsx        # Dashboard / Fichar
    ├── schedules.tsx    # Mis horarios
    ├── history.tsx      # Historial
    └── profile.tsx      # Mi perfil
```

---

# 7. IMPLEMENTACIÓN DETALLADA

## 7.1. Sistema de Autenticación

Se implementaron dos sistemas de autenticación para cubrir las necesidades de web y móvil:

### 7.1.1. Autenticación Web (Sesiones)

```typescript
// server/middleware/auth.ts
export const requireAuth = async (req, res, next) => {
  if (req.session?.userId) {
    const user = await userStorage.getById(req.session.userId);
    if (user && user.isActive) {
      req.user = { id: user.id, email: user.email, isAdmin: user.isAdmin };
      return next();
    }
  }
  res.status(401).json({ message: "No autorizado" });
};
```

### 7.1.2. Autenticación Móvil (JWT)

```typescript
// Verificación de JWT
const authHeader = req.headers.authorization;
if (authHeader?.startsWith("Bearer ")) {
  const token = authHeader.substring(7);
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = decoded;
  return next();
}
```

## 7.2. Sistema de Fichaje

El sistema de fichaje registra eventos individuales que luego se consolidan en jornadas diarias.

### 7.2.1. Tipos de Fichaje

- `clock_in`: Entrada al trabajo
- `clock_out`: Salida del trabajo
- `break_start`: Inicio de pausa
- `break_end`: Fin de pausa

### 7.2.2. Almacenamiento de Timestamps

Todos los timestamps se almacenan en UTC para evitar problemas de zonas horarias:

```typescript
// Al registrar un fichaje
const timestamp = new Date(); // UTC automáticamente
await clockEntryStorage.create({
  userId: req.user.id,
  entryType: 'clock_in',
  timestamp: timestamp,
  source: 'mobile',
  latitude: location?.latitude,
  longitude: location?.longitude
});
```

## 7.3. Gestión de Horarios

El sistema permite planificar horarios de trabajo con soporte para turnos continuos y partidos.

### 7.3.1. Estructura del Horario

```typescript
interface Schedule {
  id: string;
  idUser: string;
  date: string;          // YYYY-MM-DD
  startTime: string;     // HH:MM
  endTime: string;       // HH:MM
  startBreak?: string;   // HH:MM (opcional)
  endBreak?: string;     // HH:MM (opcional)
}
```

### 7.3.2. Creación en Bloque

Se implementó un endpoint para crear horarios en bloques de fechas:

```typescript
router.post("/batch", requireAdmin, async (req, res) => {
  const { userId, startDate, endDate, schedule } = req.body;
  
  const dates = eachDayOfInterval({
    start: parseISO(startDate),
    end: parseISO(endDate)
  });
  
  const schedules = dates.map(date => ({
    idUser: userId,
    date: format(date, 'yyyy-MM-dd'),
    ...schedule
  }));
  
  await scheduleStorage.createMany(schedules);
  res.status(201).json({ created: schedules.length });
});
```

## 7.4. Generación de Informes

Los informes se generan en formato Excel utilizando la biblioteca ExcelJS:

### 7.4.1. Estructura del Informe

- Una hoja por empleado
- Columnas: Día, Horario asignado, Fichaje real, Pausas, Horas trabajadas, Diferencia, Incidencias
- Conversión de timestamps a hora española

### 7.4.2. Optimización de Consultas

Se optimizaron las consultas para evitar el problema N+1:

```typescript
// Consulta batch en lugar de consulta por día
const clockEntries = await db.select()
  .from(clock_entries)
  .where(and(
    eq(clock_entries.userId, userId),
    between(clock_entries.timestamp, startDate, endDate)
  ));
```

## 7.5. Geolocalización

La geolocalización se captura opcionalmente al fichar desde la aplicación móvil:

```typescript
// Solicitar permisos y obtener ubicación
const { status } = await Location.requestForegroundPermissionsAsync();
if (status === 'granted') {
  const location = await Location.getCurrentPositionAsync();
  // Incluir en el fichaje
  await clockIn({
    latitude: location.coords.latitude,
    longitude: location.coords.longitude
  });
}
```

---

# 8. ESTRUCTURA VISUAL

## 8.1. Interfaz Web

### 8.1.1. Diseño General

La interfaz web sigue un diseño moderno con sidebar de navegación y área principal de contenido:

- **Sidebar izquierdo:** Navegación principal con iconos
- **Header:** Título de página y acciones globales
- **Área principal:** Contenido de la página actual
- **Tema:** Soporte para modo claro y oscuro

### 8.1.2. Páginas Principales

| Página | Descripción | Componentes Principales |
|--------|-------------|-------------------------|
| Dashboard | Panel de control con estadísticas | Cards con métricas, gráficos |
| Empleados | Gestión de empleados | Tabla, formularios, diálogos |
| Fichajes | Control de fichajes del día | Lista, mapa, formulario manual |
| Horarios | Planificación de turnos | Calendario anual, formularios |
| Incidencias | Gestión de incidencias | Tabla, filtros, formularios |
| Informes | Generación de informes | Selectores, botón descarga |

## 8.2. Interfaz Móvil

### 8.2.1. Diseño General

La aplicación móvil utiliza navegación por pestañas en la parte inferior:

- **Tab 1 - Fichar:** Botones de fichaje y estado actual
- **Tab 2 - Horarios:** Calendario con turnos asignados
- **Tab 3 - Historial:** Lista de fichajes anteriores
- **Tab 4 - Perfil:** Datos del usuario y logout

### 8.2.2. Pantalla de Fichaje

La pantalla principal muestra:

- Estado actual (trabajando, en pausa, fuera de jornada)
- Hora de última acción
- Botones de acción según estado
- Indicador de geolocalización

---

# 9. GESTIÓN DE DATOS

## 9.1. Modelo de Datos Completo

### 9.1.1. Tablas Principales

| Tabla | Descripción | Campos Clave |
|-------|-------------|--------------|
| users | Empleados del sistema | id, numEmployee, firstName, lastName, email, password, isAdmin |
| departments | Departamentos de la empresa | id, name, description |
| roles_enterprise | Roles empresariales | id, name, description |
| clock_entries | Eventos de fichaje | id, userId, entryType, timestamp, latitude, longitude, source |
| daily_workday | Resumen diario de jornada | id, idUser, date, clockIn, clockOut, totalHours |
| schedules | Horarios planificados | id, idUser, date, startTime, endTime, startBreak, endBreak |
| incidents | Incidencias laborales | id, idUser, incidentTypeId, date, description |
| incidents_type | Tipos de incidencia | id, name, description, color |

## 9.2. Gestión de Zonas Horarias

La gestión de zonas horarias es crítica para un sistema de fichaje. Se implementó la siguiente estrategia:

### 9.2.1. Principio Fundamental

> **Almacenar en UTC, mostrar en hora local.**
>
> Todos los timestamps se almacenan en UTC en la base de datos. La conversión a hora española (Europe/Madrid) se realiza únicamente en el momento de mostrar los datos al usuario o generar informes.

### 9.2.2. Implementación

```typescript
// server/utils/timezone.ts
import { format, toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'Europe/Madrid';

export function formatSpanishTime(date: Date): string {
  const zonedDate = toZonedTime(date, TIMEZONE);
  return format(zonedDate, 'HH:mm', { timeZone: TIMEZONE });
}

export function getSpanishDate(date: Date): string {
  const zonedDate = toZonedTime(date, TIMEZONE);
  return format(zonedDate, 'yyyy-MM-dd', { timeZone: TIMEZONE });
}
```

### 9.2.3. Consideraciones

- El cambio horario (verano/invierno) se maneja automáticamente
- Las consultas SQL utilizan `AT TIME ZONE 'Europe/Madrid'`
- Los informes Excel muestran siempre hora española

## 9.3. Integridad y Consistencia

### 9.3.1. Restricciones de Integridad

- **Unicidad:** numEmployee, email (users), name (roles_enterprise)
- **Foreign Keys:** Todas las relaciones con ON DELETE CASCADE
- **NOT NULL:** Campos obligatorios definidos en el esquema

### 9.3.2. Eliminación en Cascada

Al eliminar un empleado, se eliminan en cascada:

1. Entradas de fichaje (clock_entries)
2. Incidencias (incidents)
3. Horarios (schedules)
4. Jornadas diarias (daily_workday)

---

# 10. SEGURIDAD

## 10.1. Autenticación

### 10.1.1. Almacenamiento de Contraseñas

Las contraseñas se almacenan utilizando bcrypt con un factor de coste de 10:

```typescript
import bcrypt from 'bcryptjs';

// Al crear usuario
const hashedPassword = await bcrypt.hash(plainPassword, 10);

// Al verificar login
const isValid = await bcrypt.compare(inputPassword, storedHash);
```

### 10.1.2. Tokens JWT

Los tokens JWT para la aplicación móvil incluyen:

- ID del usuario
- Email
- Rol (isAdmin)
- Expiración: 7 días

## 10.2. Autorización

### 10.2.1. Roles del Sistema

| Rol | Descripción | Permisos |
|-----|-------------|----------|
| Empleado | Usuario estándar | Fichar, ver sus horarios, ver su historial |
| Administrador | Acceso completo | Todos los permisos, gestión de empleados, informes |

### 10.2.2. Middleware de Autorización

```typescript
export const requireAdmin = async (req, res, next) => {
  await requireAuth(req, res, () => {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ 
        message: "Acceso denegado. Se requiere rol de administrador." 
      });
    }
    next();
  });
};
```

## 10.3. Protección de Datos (RGPD)

### 10.3.1. Principios Aplicados

- **Minimización:** Solo se recogen datos estrictamente necesarios
- **Finalidad:** Datos usados exclusivamente para control horario
- **Consentimiento:** Geolocalización opcional con permiso explícito
- **Acceso:** Empleados pueden consultar sus propios datos
- **Seguridad:** Contraseñas hasheadas, conexiones HTTPS
- **Localización:** Datos almacenados en servidores de la UE

### 10.3.2. Derechos de los Usuarios

- **Acceso:** Consulta de historial de fichajes
- **Rectificación:** Solicitud de corrección de datos erróneos
- **Supresión:** Mediante el administrador del sistema
- **Portabilidad:** Exportación de datos en formato Excel

---

# 11. TESTS Y VALIDACIÓN

## 11.1. Estrategia de Testing

Se aplicó una estrategia de testing manual exhaustivo complementada con validación automática:

### 11.1.1. Validación de Datos

Toda la entrada de datos se valida utilizando esquemas Zod:

```typescript
// shared/schema.ts
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true
}).extend({
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  email: z.string().email("Email inválido"),
  numEmployee: z.string().min(1, "El número de empleado es obligatorio")
});
```

### 11.1.2. Pruebas Manuales

| Área | Casos de Prueba | Resultado |
|------|-----------------|-----------|
| Autenticación | Login correcto, login incorrecto, logout, sesión expirada | ✓ Pasado |
| Empleados | Crear, editar, eliminar, listar, buscar | ✓ Pasado |
| Fichajes | Entrada, salida, pausas, geolocalización | ✓ Pasado |
| Horarios | Crear individual, crear en bloque, calendario | ✓ Pasado |
| Informes | Generación Excel, conversión horaria | ✓ Pasado |
| Móvil | Todas las funcionalidades de la app | ✓ Pasado |

## 11.2. Validación de Requisitos

Se verificó el cumplimiento de todos los requisitos funcionales y técnicos definidos en la fase de análisis.

---

# 12. CUMPLIMIENTO NORMATIVO

## 12.1. Verificación de Requisitos Legales

El sistema cumple con todos los requisitos de la nueva normativa española de registro horario digital:

| Requisito Legal | Implementación | Estado |
|-----------------|----------------|--------|
| Formato digital obligatorio | Aplicación web y móvil | ✓ Cumple |
| Trazabilidad completa | UUID único, timestamps precisos, source del fichaje | ✓ Cumple |
| Inmutabilidad de registros | Entradas clock_entries no modificables | ✓ Cumple |
| Acceso para trabajadores | App móvil con historial personal | ✓ Cumple |
| Acceso para Inspección | Exportación Excel | ✓ Cumple |
| Conservación 4 años | Base de datos persistente | ✓ Cumple |
| Registro de pausas | break_start y break_end | ✓ Cumple |
| Fichaje personal | Login individual requerido | ✓ Cumple |
| Servidores en UE | PostgreSQL en servidores europeos | ✓ Cumple |
| No biometría | No usa huella ni reconocimiento facial | ✓ Cumple |
| Geolocalización no permanente | Solo captura en momento del fichaje | ✓ Cumple |

---

# 13. ANÁLISIS Y VALORACIÓN

## 13.1. Conclusiones

El desarrollo del Sistema de Control de Fichajes de Empleados ha sido un proyecto completo que ha permitido crear una solución profesional para una necesidad real del mercado español.

### 13.1.1. Objetivos Cumplidos

- ✓ Sistema de autenticación seguro con roles diferenciados
- ✓ Gestión completa de empleados, departamentos y roles
- ✓ Registro de fichajes con entrada, salida y pausas
- ✓ Geolocalización opcional en fichajes móviles
- ✓ Planificación de horarios con calendario anual
- ✓ Gestión de incidencias laborales
- ✓ Dashboard con estadísticas en tiempo real
- ✓ Generación de informes en Excel
- ✓ Aplicación móvil nativa funcional
- ✓ Cumplimiento de la normativa de registro horario digital

### 13.1.2. Lecciones Aprendidas

1. **Gestión de zonas horarias:** Es fundamental decidir desde el inicio cómo se manejarán las fechas. El almacenamiento en UTC con conversión a zona local es la mejor práctica.
2. **Tipado estático:** TypeScript ha sido invaluable para detectar errores y facilitar refactorizaciones.
3. **Arquitectura modular:** La separación en capas facilita enormemente el mantenimiento.
4. **Validación compartida:** Usar Zod en frontend y backend garantiza consistencia.
5. **Componentes reutilizables:** Shadcn/UI acelera significativamente el desarrollo.

## 13.2. Mejoras Propuestas

### 13.2.1. Mejoras a Corto Plazo

- Notificaciones push para recordatorios de fichaje
- Fichaje offline con sincronización posterior
- Aprobación de fichajes manuales por supervisor
- Alertas de anomalías (olvidos de fichaje, exceso de horas)

### 13.2.2. Mejoras a Medio Plazo

- Integración con sistemas de nóminas
- Multi-idioma (inglés, catalán, euskera, gallego)
- Roles intermedios (supervisor, responsable de departamento)
- Planificación de vacaciones y ausencias

### 13.2.3. Mejoras a Largo Plazo

- Versión PWA para funcionamiento offline
- API pública para integraciones de terceros
- Aplicación de escritorio para terminales de fichaje
- Análisis predictivo de absentismo

---

# 14. BIBLIOGRAFÍA Y REFERENCIAS

## 14.1. Normativa Legal

- Real Decreto-ley 8/2019, de 8 de marzo, de medidas urgentes de protección social y de lucha contra la precariedad laboral en la jornada de trabajo
- Estatuto de los Trabajadores, Artículo 34.9 (modificado)
- Anteproyecto de Ley de Registro Horario Digital 2024-2025
- Reglamento General de Protección de Datos (RGPD) - Reglamento (UE) 2016/679

## 14.2. Documentación Técnica

- **React:** https://react.dev
- **TypeScript:** https://www.typescriptlang.org/docs/
- **Expo:** https://docs.expo.dev
- **Drizzle ORM:** https://orm.drizzle.team
- **TanStack Query:** https://tanstack.com/query/latest
- **Shadcn/UI:** https://ui.shadcn.com
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Express:** https://expressjs.com
- **PostgreSQL:** https://www.postgresql.org/docs/
- **Zod:** https://zod.dev
- **date-fns:** https://date-fns.org

## 14.3. Recursos sobre la Normativa

- Protime - Ley de registro horario digital 2025
- Factorial - Nueva Ley de Control Horario
- Kelio - Nueva ley control horario trabajadores 2025
- Sesame HR - Control horario novedades 2025

---

# 15. ANEXOS

## 15.1. Estructura Completa del Proyecto

```
proyecto/
├── client/                         # Frontend Web
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                 # Componentes Shadcn/UI (40+)
│   │   │   ├── app-sidebar.tsx
│   │   │   └── theme-toggle.tsx
│   │   ├── pages/
│   │   │   ├── dashboard.tsx
│   │   │   ├── employees.tsx
│   │   │   ├── time-tracking.tsx
│   │   │   ├── schedules.tsx
│   │   │   ├── incidents.tsx
│   │   │   ├── reports.tsx
│   │   │   ├── settings.tsx
│   │   │   └── login.tsx
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── index.html
│
├── server/
│   ├── routes/                     # 13 archivos de rutas
│   ├── storages/                   # 10 archivos de storage
│   ├── services/                   # 9 archivos de servicios
│   ├── middleware/
│   ├── utils/
│   ├── db.ts
│   └── index.ts
│
├── shared/
│   └── schema.ts                   # Esquemas compartidos
│
├── mobile-app/
│   ├── app/
│   │   ├── (tabs)/
│   │   └── login.tsx
│   ├── components/
│   ├── services/
│   └── types/
│
└── docs/
    └── memoria-proyecto.md
```

## 15.2. Variables de Entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| DATABASE_URL | Conexión a PostgreSQL | postgresql://user:pass@host:5432/db |
| SESSION_SECRET | Secreto para sesiones web | random-string-32-characters |
| JWT_SECRET | Secreto para tokens JWT | another-random-string-32-chars |
| NODE_ENV | Entorno de ejecución | development \| production |

## 15.3. Comandos de Desarrollo

```bash
# Desarrollo
npm run dev              # Iniciar servidor de desarrollo

# Base de datos
npm run db:push          # Aplicar cambios de esquema
npm run db:studio        # Abrir Drizzle Studio

# Móvil
cd mobile-app
npx expo start           # Iniciar Expo
eas build --platform android --profile production  # Compilar APK
```

---

<div align="center">

## FIN DEL DOCUMENTO

**Sistema de Control de Fichajes de Empleados**

Trabajo de Fin de Grado

Curso Académico 2024-2025

*Desarrollado para cumplir con la nueva normativa española de registro horario digital obligatorio*

</div>
