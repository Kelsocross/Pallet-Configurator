# Pallet Configurator

## Overview

A browser-based pallet calculator and configurator web application for project managers in logistics and shipping. The app allows users to define carton/box measurements, configure pallets with multiple box sizes, and generate optimized pallet configurations that respect footprint and height constraints for LTL shipping. Features include 3D visualization of pallet stacking using Three.js, mixed-box optimization algorithms, and PDF export of configuration summaries.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: React useState hooks with TanStack React Query for server state
- **Styling**: Tailwind CSS v4 with shadcn/ui component library (New York style)
- **3D Visualization**: React Three Fiber (@react-three/fiber) with Three.js and Drei helpers
- **Build Tool**: Vite with custom plugins for Replit integration

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript compiled with tsx
- **API Pattern**: RESTful endpoints prefixed with `/api`
- **Session Management**: In-memory storage (MemStorage class) with interface for future database integration

### Data Layer
- **ORM**: Drizzle ORM configured for PostgreSQL
- **Schema Location**: `shared/schema.ts` - shared between client and server
- **Validation**: Zod schemas with drizzle-zod integration
- **Current Storage**: In-memory Map-based storage (no database provisioned yet)

### Project Structure
```
├── client/           # React frontend
│   ├── src/
│   │   ├── components/   # UI components (shadcn/ui + custom pallet components)
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom React hooks
│   │   └── lib/          # Utilities, types, calculator logic
├── server/           # Express backend
│   ├── index.ts      # Server entry point
│   ├── routes.ts     # API route definitions
│   ├── storage.ts    # Data storage interface
│   └── vite.ts       # Vite dev server integration
├── shared/           # Shared code between client/server
│   └── schema.ts     # Drizzle schema and Zod types
└── migrations/       # Drizzle database migrations
```

### Key Design Decisions

1. **Monorepo Structure**: Client and server share types via `shared/` directory, ensuring type safety across the stack.

2. **Calculator Logic Client-Side**: Pallet optimization calculations run in the browser (`client/src/lib/calculator.ts`), minimizing server load and enabling instant feedback.

3. **Mixed-Box Packing Algorithm**: Uses a height-map grid approach with primary footprints per unit type. Each box type is locked to one column until that column reaches max height, ensuring smaller boxes stack vertically in their own columns rather than spreading across the pallet.

4. **3D Rendering**: Three.js with React Three Fiber provides interactive 3D visualization of box placement on pallets with proper coordinate system (X=length, Z=width, Y=vertical).

5. **Unit System Flexibility**: Supports both inches and millimeters with real-time conversion between systems.

6. **PDF Generation**: Client-side PDF export using jsPDF for configuration summaries with optional layer detail views.

7. **Simplified Unit Input**: Box dimensions are entered directly as external dimensions (L x W x H) with optional weight field.

## External Dependencies

### Frontend Libraries
- **@react-three/fiber & drei**: 3D visualization framework
- **@tanstack/react-query**: Server state management
- **shadcn/ui (Radix primitives)**: Accessible UI component library
- **jsPDF**: Client-side PDF generation
- **class-variance-authority & clsx**: Utility-first CSS composition

### Backend Libraries
- **express**: HTTP server framework
- **drizzle-orm & drizzle-kit**: Database ORM and migration tools
- **connect-pg-simple**: PostgreSQL session storage (prepared for future use)
- **zod**: Runtime type validation

### Database
- **PostgreSQL**: Configured via `DATABASE_URL` environment variable
- **Note**: Database not yet provisioned; currently using in-memory storage

### Build & Development
- **Vite**: Frontend build tool with HMR
- **tsx**: TypeScript execution for Node.js
- **esbuild**: Server bundling for production