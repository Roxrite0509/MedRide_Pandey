# Hospital Management System Guide

## Overview

This document explains how to safely add new hospitals to the EmergencyConnect system without breaking existing hospital data. The new system ensures data integrity and prevents the seeding conflicts that occurred previously.

## Architecture

### Managed Hospital System
- **Central Registry**: All hospitals are managed through `hospital-bed-manager.ts`
- **Safe Seeding**: Only registered hospitals get their beds cleared and re-seeded
- **Data Isolation**: Each hospital's data is managed independently
- **Conflict Prevention**: New hospitals can be added without affecting existing ones

### Files Involved
1. `server/hospital-bed-manager.ts` - Core management system
2. `server/add-new-hospital-example.ts` - Template for adding hospitals
3. `client/src/components/hospital-bed-layout.tsx` - Frontend mapping
4. `server/index.ts` - Initialization logic

## How It Works

### Current System Status
The system currently manages 4 hospitals:

| Hospital ID | Hospital Name | User ID | Beds | Status |
|-------------|---------------|---------|------|--------|
| 2 | Apollo Hospital Indore | 11 | 140 | Managed |
| 3 | CARE CHL Hospital Indore | 12 | 100 | Managed |
| 4 | Bombay Hospital Indore | 13 | 115 | Managed |
| 5 | Vishesh Jupiter Hospital | 97 | 80 | Managed |

### Safe Seeding Process
1. **Startup**: System identifies managed hospitals from registry
2. **Selective Clearing**: Only clears beds for hospitals in the registry
3. **Independent Seeding**: Each hospital's beds are generated separately
4. **Preservation**: Unmanaged hospitals remain untouched

## Adding a New Hospital

### Step 1: Create Hospital Configuration
```typescript
const newHospitalConfig = {
  hospitalId: 6, // Next available ID
  hospitalName: 'Your Hospital Name',
  occupancyRate: 0.575, // 57.5% occupancy
  patientNames: [
    // Array of authentic patient names for the region
    'Patient Name 1', 'Patient Name 2', // ...
  ],
  bedConfiguration: {
    // ICU Units
    'CICU': { type: 'icu', count: 8, prefix: 'CICU', name: 'Cardiac ICU', floor: 3 },
    'NICU': { type: 'icu', count: 6, prefix: 'NICU', name: 'Neuro ICU', floor: 3 },
    // General Wards
    'CAR': { type: 'general', count: 12, prefix: 'CAR', name: 'Cardiology Ward', floor: 1 },
    // Add more ward configurations as needed
  }
};
```

### Step 2: Register the Hospital
```typescript
import { registerNewHospital, seedSpecificHospital } from './hospital-bed-manager';

// Register the configuration
registerNewHospital(newHospitalConfig);

// Seed the hospital's beds
await seedSpecificHospital(6);
```

### Step 3: Update Frontend Mapping
Add the new hospital to the frontend mapping in `hospital-bed-layout.tsx`:

```typescript
const getUserHospitalId = (userId: number): number => {
  const hospitalMapping: Record<number, number> = {
    11: 2,  // apollo_admin -> Apollo Hospital
    12: 3,  // chl_admin -> CHL Hospital  
    13: 4,  // bombay_admin -> Bombay Hospital
    97: 5,  // vis_admin -> Vishesh Jupiter Hospital
    NEW_USER_ID: 6,  // new_admin -> Your Hospital
  };
  return hospitalMapping[userId] || userId;
};
```

### Step 4: Test the Integration
1. Create hospital user account with appropriate credentials
2. Login to verify bed data displays correctly
3. Check that other hospitals remain unaffected

## Benefits of This System

### 🛡️ Data Protection
- **No Conflicts**: New hospitals never affect existing ones
- **Selective Operations**: Only managed hospitals are modified
- **Safe Fallbacks**: Unregistered hospitals are preserved

### 🔧 Maintainability  
- **Central Configuration**: All hospital configs in one place
- **Type Safety**: Full TypeScript support for configurations
- **Easy Updates**: Simple process to modify hospital setups

### 📈 Scalability
- **Unlimited Hospitals**: Add as many as needed
- **Independent Management**: Each hospital operates separately  
- **Performance Optimized**: Batch operations for large datasets

### 🧪 Testing Friendly
- **Individual Seeding**: Test specific hospitals in isolation
- **Reproducible Results**: Consistent bed generation
- **Debug Support**: Comprehensive logging for troubleshooting

## Troubleshooting

### Problem: New Hospital Beds Not Showing
**Solution**: Check frontend mapping in `hospital-bed-layout.tsx`

### Problem: Existing Hospital Data Lost
**Solution**: Check if hospital ID was added to managed registry accidentally

### Problem: Bed Counts Don't Match
**Solution**: Verify configuration totals match expected bed counts

### Problem: Server Restart Clears New Hospital
**Solution**: Ensure hospital is registered in the managed system

## Migration from Old System

The old system used these files (now deprecated):
- `server/expanded-bed-seed.ts` - Old hardcoded seeding
- `server/seed-vishesh-hospital.ts` - Individual hospital seeding

The new system consolidates everything into the managed hospital approach, providing better organization and preventing data conflicts.

## Future Enhancements

1. **Dynamic Hospital Registration**: Web interface for adding hospitals
2. **Configuration Validation**: Automated checks for bed configurations  
3. **Backup/Restore**: Hospital-specific data backup capabilities
4. **Analytics Dashboard**: Hospital performance and capacity monitoring
5. **Template Library**: Pre-configured hospital types (Specialty, General, etc.)

## Support

If you encounter issues:
1. Check the server logs for specific error messages
2. Verify hospital configuration follows the required format
3. Ensure frontend mapping includes the new hospital
4. Test with a single hospital before adding multiple

The new system is designed to be robust and prevent the data conflicts that occurred previously. Follow this guide when adding new hospitals to ensure smooth integration.