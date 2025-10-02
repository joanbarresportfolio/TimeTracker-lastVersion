# Employee Time Tracking System

## Overview

This is a comprehensive employee time tracking and management system built as a full-stack application with both web and mobile interfaces. The system allows organizations to manage employee records, track work hours with clock-in/clock-out functionality, manage schedules and shifts, handle workplace incidents, and generate detailed reports. The application features modern, responsive interfaces with real-time updates and comprehensive CRUD operations for all major entities.

## Recent Changes (October 2, 2025)

### Database Restructure with Spanish Schema
- **New Table Structure**: Completely restructured database with Spanish table names:
  - `empleado`: Employee records (replaces old `usuarios` table)
  - `horario_planificado`: Scheduled work hours by date
  - `fichaje`: Individual clock records (entrada/salida/pausa_inicio/pausa_fin)
  - `jornada_diaria`: Daily work summary with automatic calculations
- **Database Trigger**: Implemented PostgreSQL trigger that automatically updates `jornada_diaria` after each `fichaje` insert:
  - Calculates `hora_inicio` (first entrada of the day)
  - Calculates `hora_fin` (last salida of the day)
  - Automatically computes `horas_trabajadas` (worked hours minus breaks)
  - Tracks `horas_pausas` (total break time)
  - Updates `estado` (abierta/cerrada based on whether salida exists)
- **Data Migration**: Successfully migrated all existing employee data from old schema to new Spanish structure
- **Storage Layer**: Completely rewrote storage.ts to use new tables while maintaining API backward compatibility:
  - Maps between Spanish database structure and English API types
  - Implements individual clock records (separate entrada and salida fichajes)
  - Uses database trigger for automatic hour calculations instead of manual computation
- **Clock-in/Clock-out**: Updated to use new fichaje system:
  - Clock-in creates fichaje with tipo_registro='entrada'
  - Clock-out creates fichaje with tipo_registro='salida'  
  - Trigger automatically updates jornada_diaria with calculated totals

### Previous Changes (October 1, 2025)
- **JWT Authentication**: Implemented JWT token-based authentication in backend to support mobile app alongside session-based auth for web app
- **Mobile App Integration**: Added History screen, navigation, and proper API configuration
- **Authentication Fix**: Updated middleware to support both session and token authentication methods
- **CORS Configuration**: Added CORS middleware for cross-origin requests from mobile app

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