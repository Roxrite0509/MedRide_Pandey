# EmergencyConnect - Local Development Setup Guide
*Updated: July 12, 2025*

## System Requirements
- **Node.js**: 20.x or higher
- **npm**: 10.x or higher  
- **PostgreSQL**: 16.x or higher
- **Git**: Latest version

## Quick Start Commands

### 1. Install Node.js 20 (Recommended: via nvm)
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
source ~/.bashrc

# Install and use Node.js 20
nvm install 20
nvm use 20
nvm alias default 20
```

### 2. Alternative: Install via Package Manager (Ubuntu/Debian)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. Install PostgreSQL (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 4. Project Setup
```bash
git clone <your-repo-url>
cd emergency-connect
npm install
cp .env.example .env
# Update .env with your database credentials
npm run db:push
npm run dev
```

## Package Update Status (July 12, 2025)

### 🚨 Critical Dependency Conflict Identified

**Issue:** The automatic package updates created a dependency conflict:
- Zod was updated to v4.0.5
- drizzle-zod v0.8.2 requires Zod ^3.25.1
- This breaks the build and prevents tsx from running

**Immediate Solution Required:**
1. Revert Zod to v3.25.1 for compatibility
2. Update drizzle-zod to a version supporting Zod v4 (when available)
3. Apply package updates incrementally with testing

**Recommended Update Strategy:**
```bash
# Safe minor updates first
npm update --save-exact @radix-ui/react-*
npm update --save-exact @types/*
npm update --save-exact lucide-react

# Major updates require individual testing
npm install zod@^3.25.1  # Maintain compatibility
npm install react@^18.3.1 react-dom@^18.3.1  # Stable
```

**Status:** 
- ❌ Application currently broken due to dependency conflicts
- ⚠️ tsx missing, preventing server startup
- 🔧 Manual dependency resolution required

### ⚡ Core Framework Stack
- React 19.1.0 + React DOM 19.1.0
- TypeScript 5.8.3
- Vite 7.0.4 (Build tool)
- Express 5.1.0 (Backend)

### 🗄️ Database & ORM
- Drizzle ORM 0.44.2
- @neondatabase/serverless 1.0.1
- PostgreSQL (External)

### 🔐 Authentication & Security
- bcryptjs 3.0.2
- jsonwebtoken 9.0.2
- passport 0.7.0

### 🌐 Real-time Communication
- ws 8.18.3 (WebSocket)
- uws 200.0.0 (Ultra-fast alternative)

### 🎨 UI & Styling
- Tailwind CSS 4.1.11
- @radix-ui/* components (all updated to latest)
- Framer Motion 12.23.3
- Lucide React 0.525.0

### 📊 State Management
- @tanstack/react-query 5.83.0
- React Hook Form 7.60.0

## Breaking Changes & Migration Notes

### React 19 Changes
- **New Features**: React Compiler, improved Suspense, new hooks
- **Breaking**: Some legacy context patterns deprecated
- **Action Required**: Test all custom hooks and context usage

### Express 5 Changes  
- **Breaking**: Removed deprecated methods
- **Improved**: Better TypeScript support, error handling
- **Action Required**: Update middleware if using custom ones

### Tailwind CSS 4 Changes
- **New**: CSS engine, better performance
- **Breaking**: Some class names changed
- **Action Required**: Test UI components for styling issues

### Zod 4 Changes
- **Breaking**: Some validation APIs changed
- **Improved**: Better performance, new schema composition
- **Action Required**: Review custom validation schemas

## Development Commands
```bash
# Development server
npm run dev

# Build for production  
npm run build

# Start production server
npm start

# Database operations
npm run db:push        # Push schema changes
npm run db:pull        # Pull schema from database

# Type checking
npm run check
```

## IDE Setup Recommendations

### VS Code Extensions
- ES7+ React/Redux/React-Native snippets
- TypeScript Importer  
- Tailwind CSS IntelliSense
- Prettier - Code formatter
- ESLint
- GitLens

### Settings
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## Production Deployment Checklist

### Environment Variables
```bash
NODE_ENV=production
DATABASE_URL=<your-neon-postgres-url>
JWT_SECRET=<secure-32-char-secret>
GOOGLE_MAPS_API_KEY=<your-api-key>
PORT=5000
```

### Build & Deploy
```bash
npm run build
npm start
```

### Performance Optimizations
- Enable React Compiler (experimental)
- Use React.memo for heavy components
- Implement proper error boundaries
- Monitor bundle size with `npm run build`

## Testing Setup (Optional)
```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
```

## Monitoring (Optional)
```bash
npm install @vercel/analytics @vercel/speed-insights
```

## Troubleshooting

### Common Issues After Upgrade
1. **Build Errors**: Clear node_modules and reinstall
2. **TypeScript Errors**: Update @types packages
3. **Styling Issues**: Check Tailwind v4 migration guide
4. **React Errors**: Review React 19 breaking changes

### Performance Issues
- Use React DevTools Profiler
- Check bundle analyzer output
- Monitor WebSocket connections
- Review database query performance

### Database Issues
- Verify PostgreSQL connection
- Check Drizzle schema compatibility
- Review environment variables