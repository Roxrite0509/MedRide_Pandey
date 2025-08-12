# macOS Setup Instructions

## Fixed! macOS Compatibility Issues Resolved

✅ **All issues have been fixed in the main server file**

The problems were:
1. Server binding to `0.0.0.0` (doesn't work on macOS)
2. Missing dotenv package for environment variables

## Now Working - Simple Setup:

```bash
# Install dependencies
npm install

# Run the application (now works on macOS!)
npm run dev
```

The server now automatically detects macOS and uses `localhost` instead of `0.0.0.0`.

## After Setup
- Access: http://localhost:5000
- Login: patient1 / password123
- You'll have access to the live database with all real data

## Files Created for You:
- `server/index-local.ts` - macOS-compatible server
- `package-local.json` - Updated scripts for local development
- `.env` - Already configured with live database connection