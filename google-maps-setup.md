# Google Maps API Setup Instructions

## Current Issue
Your Google Maps API key has domain restrictions that are blocking the Replit domain.

## Current Replit Domain
`https://950cb22c-6c41-47d9-8aa5-7af90230247b-00-32o7vonl3ha5x.spock.replit.dev/`

## Solution 1: Add Specific Domains (Recommended for Production)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Find your Google Maps API key and click **Edit**
4. Under **Application restrictions**, select **HTTP referrers (web sites)**
5. Add these domains:

```
*.replit.dev/*
*.replit.app/*
950cb22c-6c41-47d9-8aa5-7af90230247b-00-32o7vonl3ha5x.spock.replit.dev/*
https://950cb22c-6c41-47d9-8aa5-7af90230247b-00-32o7vonl3ha5x.spock.replit.dev/*
```

## Solution 2: Disable Restrictions (Quick Fix for Development)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Find your Google Maps API key and click **Edit**
4. Under **Application restrictions**, select **None**
5. Click **Save**

**Note**: This removes all security restrictions, so only use for development.

## Verification
After updating the settings:
1. Wait 2-3 minutes for changes to propagate
2. Refresh your Replit application
3. The Google Maps should load without errors

## APIs Required
Make sure these APIs are enabled in your Google Cloud project:
- Maps JavaScript API
- Places API (optional, for hospital search)
- Geocoding API (optional, for address lookup)