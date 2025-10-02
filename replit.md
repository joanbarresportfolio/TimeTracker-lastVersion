# Employee Time Tracking System

## Overview

This is a comprehensive employee time tracking and management system built as a full-stack application with both web and mobile interfaces. The system allows organizations to manage employee records, track work hours with clock-in/clock-out functionality, manage schedules and shifts, handle workplace incidents, and generate detailed reports. The application features modern, responsive interfaces with real-time updates and comprehensive CRUD operations for all major entities.

## Recent Changes

### October 2, 2025 - Event-Based Fichajes System Migration

**MAJOR RESTRUCTURING**: Migrated from single time entry records to event-based fichaje system with automatic jornada consolidation.

#### Database Changes
- **fichajes table**: Now stores individual events (entrada, salida, pausa_inicio, pausa_fin) instead of paired clock-in/clock-out
  - Primary key: `id_registro` (varchar with UUID)
  - Fields: `id_empleado`, `tipo_registro`, `timestamp_registro`, `origen`, `observaciones`, `id_turno`
  - Each fichaje is a single timestamped event, not a complete workday record
  - **NEW**: Bidirectional linking with horarios_planificados via `id_turno` for automatic shift association
  
- **jornada_diaria table**: NEW - Consolidated daily work summary
  - Auto-calculated from fichajes events
  - Fields: `id_jornada`, `id_empleado`, `fecha`, `hora_inicio`, `hora_fin`, `horas_trabajadas`, `horas_pausas`, `horas_extra`, `estado`
  - Updated transactionally with each fichaje insertion

- **horarios_planificados table**: Structure updated
  - Renamed: `id_horario` → `id_turno`, `id_usuario` → `id_empleado`, `hora_inicio_programada` → `hora_inicio_prevista`, `hora_fin_programada` → `hora_fin_prevista`
  - Added: `tipo_turno` ('manana', 'tarde', 'noche'), `estado` ('programado', 'cancelado', 'modificado')

#### Backend Implementation
- **server/storage.ts**: 
  - Added `fichajesService` with functions: crearFichaje, obtenerFichajes, obtenerJornadas, obtenerJornadaActual, obtenerUltimoFichaje
  - **NEW**: `crearFichaje` now automatically assigns `id_turno` by looking up the planned schedule for the fichaje date
  - Implemented `calcularYActualizarJornada()` that recalculates jornada_diaria transactionally on each fichaje
  - Logic pairs entrada↔salida events and pausa_inicio↔pausa_fin to calculate worked hours and break time
  - Added compatibility adapter `obtenerTimeEntriesDesdeJornadas()` to support legacy API
  - **Fixed**: All mapping functions updated to use new Spanish field names (idEmpleado, idTurno, horaInicioPrevista, etc.)
  - **Fixed**: `createBulkDateSchedules` now works correctly with updated field names

- **server/routes.ts**: 
  - Added new routes: POST `/api/fichajes`, GET `/api/fichajes/:employeeId`, GET `/api/jornadas/:employeeId`, GET `/api/jornadas/:employeeId/actual`, GET `/api/fichajes/:employeeId/ultimo`
  - Updated GET `/api/time-entries` to use jornada_diaria adapter for backwards compatibility
  - Legacy time-entries routes maintained but adapted to work with new event system

- **server/seed.ts**: 
  - Updated to create fichajes as individual entrada/salida events
  - Uses fichajesService to ensure jornadas are auto-calculated during seeding

#### CORS Configuration
- Simplified CORS to allow all origins in development (origin: true)
- Resolves compatibility issues with Replit's multi-port architecture

#### Migration Status
- ✅ Database schema migrated and populated
- ✅ Backend logic implemented with automatic jornada calculation
- ✅ API routes created and adapted
- ✅ Seed data working with new structure
- ✅ **Automatic id_turno assignment implemented**
- ✅ **Bulk schedule assignment fixed**
- ⏳ Frontend web app - needs adaptation to use new APIs
- ⏳ Mobile app - needs adaptation to use new APIs

#### Known Edge Cases to Monitor
- Multiple planned shifts on the same date (currently picks first match)
- Cancelled schedules should be excluded from automatic assignment
- Timezone handling in date extraction (toISOString may cause UTC/local mismatches)

### October 1, 2025 - Mobile App Integration

### Mobile App Integration
- **JWT Authentication**: Implemented JWT token-based authentication in backend to support mobile app alongside session-based auth for web app
- **History Screen**: Created HistoryScreen component for mobile app to display time entry history with filtering capabilities
- **Navigation Integration**: Integrated History screen into mobile app navigation stack
- **API Configuration**: Configured mobile app to connect to correct backend server URL (workspace.joanbarresportf.repl.co in production, localhost in development)
- **Authentication Fix**: Updated middleware (requireAuth, requireAdmin, requireEmployeeAccess) to support both session and token authentication methods
- **CORS Configuration**: Added CORS middleware to backend server to allow cross-origin requests from Expo web app running on different subdomain
- **Expo Web Fix**: Fixed mobile app web version to correctly detect Replit environment and use appropriate backend URL

### Mobile App Features
- Dashboard with clock-in/clock-out functionality
- Schedules viewing
- Incidents reporting
- Time entry history with date filtering
- Real-time status updates
- Full web compatibility with Expo web platform

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript for type safety and better development experience
- **UI Library**: Radix UI components with shadcn/ui for consistent, accessible design system
- **Styling**: Tailwind CSS with custom design tokens and CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation for type-safe form validation
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for RESTful API development
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Validation**: Zod schemas shared between client and server for consistent validation
- **Storage**: In-memory storage implementation with interface for easy database migration
- **API Design**: RESTful endpoints with proper HTTP status codes and error handling

### Database Design
- **Primary Database**: PostgreSQL (configured but currently using in-memory storage)
- **ORM**: Drizzle with schema-first approach
- **Key Entities**:
  - Employees: Core employee information with departments and positions
  - Time Entries: Clock-in/clock-out records with calculated hours
  - Schedules: Recurring weekly schedule definitions
  - Incidents: Workplace incidents and attendance issues

### Development Architecture
- **Monorepo Structure**: Shared schemas and types between frontend and backend
- **Hot Reload**: Vite HMR for frontend, tsx for backend development
- **Type Safety**: End-to-end TypeScript with shared schema definitions
- **Path Aliases**: Consistent import paths using @ aliases

## External Dependencies

### Database and ORM
- **@neondatabase/serverless**: Neon serverless PostgreSQL driver
- **drizzle-orm**: Type-safe ORM with PostgreSQL dialect
- **drizzle-kit**: Database migrations and schema management

### Frontend Libraries
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/react-***: Accessible UI component primitives
- **react-hook-form**: Form state management
- **@hookform/resolvers**: Form validation resolvers
- **wouter**: Lightweight routing library
- **date-fns**: Date manipulation and formatting
- **lucide-react**: Icon library

### UI and Styling
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Type-safe component variants
- **clsx**: Conditional class name utility
- **tailwind-merge**: Tailwind class merging utility

### Development Tools
- **vite**: Build tool and development server
- **typescript**: Type checking and compilation
- **@vitejs/plugin-react**: React support for Vite
- **@replit/vite-plugin-runtime-error-modal**: Development error overlay
- **@replit/vite-plugin-cartographer**: Replit-specific development features

### Validation and Schemas
- **zod**: Runtime type validation and schema definition
- **drizzle-zod**: Integration between Drizzle schemas and Zod validation

### Session Management
- **connect-pg-simple**: PostgreSQL session store (configured for future use)