# EmergencyConnect - Emergency Response Coordination Platform

## Overview
EmergencyConnect is a comprehensive emergency response coordination platform designed to facilitate real-time communication and coordination between patients, ambulance services, and hospitals during medical emergencies. The platform aims to streamline emergency response workflows by providing role-based dashboards, real-time tracking, automated dispatch capabilities, and efficient resource management. Its core purpose is to connect all vital stakeholders in a medical emergency for faster and more organized interventions, ultimately improving patient outcomes.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
### Core Design Principles
- **Monorepo Structure**: Client, server, and shared code are co-located for streamlined development.
- **TypeScript Throughout**: Ensures end-to-end type safety from database interactions to the user interface.
- **Serverless Database Integration**: Leverages Neon PostgreSQL for scalability and reduced infrastructure overhead.
- **Real-time Communication**: Utilizes WebSockets for immediate updates across all connected users.
- **Role-based Architecture**: Clear separation of concerns and access control based on user roles (patient, ambulance, hospital).
- **Component-based UI**: Modular and reusable components built with a consistent design system for a cohesive user experience.

### Frontend
- **Framework**: React 18 with TypeScript for robust and scalable UI development.
- **Build Tool**: Vite for fast development and optimized production builds.
- **UI Framework**: Tailwind CSS for utility-first styling, complemented by shadcn/ui components for accessible UI primitives.
- **State Management**: TanStack Query manages server state and caching for efficient data handling.
- **Routing**: Wouter provides lightweight client-side routing.
- **Real-time**: Socket.IO integration for reliable live data updates with automatic reconnection.

### Backend
- **Runtime**: Node.js with Express for building a flexible and performant server.
- **Database**: PostgreSQL, accessed via Drizzle ORM for type-safe database operations, hosted on Neon for serverless capabilities.
- **Authentication**: JWT-based authentication combined with bcrypt for secure password hashing.
- **Real-time**: Socket.IO server for enhanced real-time communication with automatic reconnection and transport fallback.
- **API Design**: RESTful API with robust role-based access control.

### Key Features & Implementations
- **User Management**: Role-based system for patients, ambulance personnel, and hospitals, including secure authentication and authorization.
- **Emergency Request System**: Automated dispatching of ambulances based on location, configurable priority levels, and real-time status tracking. Includes geographic matching for hospital and ambulance assignment.
- **Real-time Communication**: Socket.IO-driven live updates with enhanced connection stability, in-app chat for all parties, status broadcasting, and real-time location tracking for ambulances.
- **Hospital Management**: Comprehensive bed management (general and ICU), capacity monitoring, visibility into incoming ambulances, and efficient resource allocation. Includes detailed ward and bed status tracking.
- **Ambulance Operations**: Automated dispatch, GPS tracking with route optimization, status management, and direct communication with hospitals and dispatch.

## External Dependencies
- **@neondatabase/serverless**: For connecting to Neon's serverless PostgreSQL database.
- **drizzle-orm**: Type-safe ORM for database interactions.
- **@tanstack/react-query**: For server state management and data fetching in the frontend.
- **@radix-ui/react-***: Provides accessible and unstyled UI component primitives.
- **bcryptjs**: Used for password hashing and security.
- **jsonwebtoken**: For JWT-based authentication.
- **socket.io**: Implements enhanced real-time communication with automatic reconnection and transport fallback.
- **socket.io-client**: Client-side Socket.IO implementation for reliable real-time features.
- **ws**: Legacy WebSocket support maintained for backward compatibility.
- **TypeScript**: Core language for development.
- **Tailwind CSS**: Utility-first CSS framework for styling.
- **Vite**: Frontend build tool.
- **ESBuild**: JavaScript bundler used in production builds.