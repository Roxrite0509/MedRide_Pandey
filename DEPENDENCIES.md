# EmergencyConnect - Dependencies & Requirements

## System Requirements
- Node.js 20.x or higher
- PostgreSQL database (Neon serverless recommended)
- TypeScript 5.6+

## Core Dependencies (from package.json)

### Frontend Framework & Build Tools
- React 18.3.1 - Modern React with hooks and concurrent features
- TypeScript 5.6.3 - Type safety and development experience
- Vite 5.4.19 - Fast build tool and development server
- Wouter 3.3.5 - Lightweight client-side routing

### UI Components & Styling
- Tailwind CSS 3.4.17 - Utility-first CSS framework
- @radix-ui/react-* - Accessible UI component primitives
- Lucide React 0.453.0 - Icon library
- Framer Motion 11.13.1 - Animation library

### Backend Framework & Server
- Express 4.21.2 - Web application framework
- tsx 4.20.3 - TypeScript execution for Node.js
- ws 8.18.0 - WebSocket server for real-time communication
- uws 200.0.0 - Ultra-fast WebSocket implementation

### Database & ORM
- @neondatabase/serverless 0.10.4 - Serverless PostgreSQL driver
- Drizzle ORM 0.39.1 - Type-safe SQL ORM
- Drizzle Kit 0.30.4 - Database migrations and schema management
- Drizzle Zod 0.7.0 - Zod integration for type validation

### Authentication & Security
- bcryptjs 3.0.2 - Password hashing
- jsonwebtoken 9.0.2 - JWT token handling
- passport 0.7.0 - Authentication middleware
- passport-local 1.0.0 - Local authentication strategy
- express-session 1.18.1 - Session management

### State Management & Data Fetching
- @tanstack/react-query 5.60.5 - Server state management and caching
- Zod 3.24.2 - Runtime type validation
- React Hook Form 7.55.0 - Form handling and validation

### Maps & Location Services
- googlemaps 1.12.0 - Google Maps integration for hospital/ambulance tracking

## Environment Variables Required
- DATABASE_URL - PostgreSQL connection string (auto-configured in Replit)
- JWT_SECRET - Secret key for JWT token signing (optional, defaults to fallback)
- NODE_ENV - Environment (development/production)

## Installation Commands
```bash
npm install
npm run db:push  # Initialize database schema
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
```

## Database Setup
1. PostgreSQL database provisioned automatically in Replit
2. DATABASE_URL environment variable set automatically
3. Run `npm run db:push` to create tables
4. Application auto-seeds with test data on first run

## Test Credentials (from seeding)
- Patient: username=patient1, password=password123
- Apollo Hospital: username=apollo_admin, password=password123
- CARE CHL Hospital: username=chl_admin, password=password123
- Bombay Hospital: username=bombay_admin, password=password123
- Ambulance: username=ambulance1, password=password123

## Security Features
- JWT-based authentication
- bcrypt password hashing
- Role-based access control (patient/ambulance/hospital)
- CORS protection
- Session management
- SQL injection protection via Drizzle ORM

## Real-time Features
- WebSocket server for live updates
- Real-time ambulance location tracking
- Live emergency request status updates
- Hospital bed availability monitoring
- Cross-role communication system