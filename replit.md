# Employee Time Tracking System

## Overview

This is a comprehensive, full-stack employee time tracking and management system with web and mobile interfaces. Its purpose is to streamline organizational tasks such as managing employee records, tracking work hours via clock-in/clock-out, scheduling shifts, handling workplace incidents, and generating detailed reports. The system is designed for modern organizations seeking efficient and accurate workforce management with real-time updates and full CRUD capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **UI Library**: Radix UI components with shadcn/ui for accessible design
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for RESTful API
- **Database ORM**: Drizzle ORM for type-safe operations
- **Validation**: Zod schemas shared between client and server
- **Modular Architecture**: Separation of concerns with distinct layers:
  - **Storage Layer** (`server/storages/`) - Data access (CRUD operations)
  - **Service Layer** (`server/services/`) - Business logic and calculations
  - **Route Layer** (`server/routes/`) - HTTP request handlers
- **API Design**: RESTful endpoints with proper error handling
- **Authentication**: JWT for mobile, session-based for web

### Database Design
- **Primary Database**: PostgreSQL with Neon serverless driver
- **ORM**: Drizzle with a schema-first approach
- **Schema Language**: All tables and columns use consistent English naming conventions
- **Key Entities**: `users`, `departments`, `roles_enterprise`, `schedules`, `clock_entries`, `daily_workday`, `incidents`, `incidents_type`
- **Architecture Pattern**: Event-based time tracking (`clock_entries`) with daily workday consolidation (`daily_workday`).
- **Critical Constraints**:
  - One workday per user per day (unique index on `id_user`, `date`)
  - `schedules.idDailyWorkday` is optional (nullable) - schedules can exist independently
  - `daily_workday.date` is required (NOT NULL, format: YYYY-MM-DD)

### Development Architecture
- **Monorepo Structure**: Shared schemas and types between frontend and backend
- **Type Safety**: End-to-end TypeScript with shared Zod schema definitions
- **Hot Reload**: Vite HMR for frontend, tsx for backend
- **Path Aliases**: Consistent import paths using `@` aliases
- **Modular Code Organization**:
  - `server/storages/` - 10 files (one per database table)
  - `server/routes/` - 13 files (one per entity/feature)
  - `server/services/` - 9 files (business logic services)

### Core Features
- **Time Tracking**: Event-based clock-in/clock-out, break start/end.
- **Break Management**: Comprehensive break management integrated into the mobile app.
- **Daily Workday Calculation**: Automatic calculation of hours worked, breaks, and overtime from `clock_entries`.
- **Scheduling**: Management of planned work shifts for employees.
- **Incident Management**: Reporting and tracking of workplace incidents.
- **Reporting**: Generation of detailed reports (implied by overview).
- **Mobile App**: Dedicated mobile application with dashboard, schedules, incidents, and history.
- **Internationalization**: Full migration of backend schema and codebase to English.

### Mobile App Integration
- **Authentication**: JWT-based authentication via `Authorization: Bearer <token>` header
- **Clock Entry Endpoints** (Employee-accessible):
  - `POST /api/clock-entries` - Create new clock entry (clock_in, clock_out, break_start, break_end)
    - Accepts optional `timestamp` field for precise event timing (prevents midnight date skew)
    - Server generates timestamp if not provided
  - `GET /api/clock-entries/today` - Get today's daily workday and clock entries for authenticated employee
- **Field Naming**: Mobile app uses English fields (`entryType`, `source`, `timestamp`) matching backend schema
- **Break Support**: Schedules include optional `startBreak` and `endBreak` nullable fields
- **Type Consistency**: Mobile types (`mobile-app/src/types/schema.ts`) match backend schema types
- **Timestamp Handling**: Clock entry creation uses precise timestamps to prevent cross-midnight session issues and timezone drift

## External Dependencies

### Database and ORM
- **@neondatabase/serverless**: Neon serverless PostgreSQL driver
- **drizzle-orm**: Type-safe ORM
- **drizzle-kit**: Database migrations

### Frontend Libraries
- **@tanstack/react-query**: Server state management
- **@radix-ui/react-***: Accessible UI component primitives
- **react-hook-form**: Form state management
- **wouter**: Lightweight routing library
- **date-fns**: Date manipulation
- **lucide-react**: Icon library

### UI and Styling
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Type-safe component variants
- **clsx**: Conditional class name utility
- **tailwind-merge**: Tailwind class merging utility

### Development Tools
- **vite**: Build tool and development server
- **typescript**: Type checking
- **@vitejs/plugin-react**: React support for Vite

### Validation and Schemas
- **zod**: Runtime type validation and schema definition
- **drizzle-zod**: Drizzle and Zod integration