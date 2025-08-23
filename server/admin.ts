import type { Express } from 'express';
import { kms } from './kms';

export function registerAdminRoutes(app: Express) {
  // KMS Admin endpoints
  app.get('/api/admin/kms/metrics', (req: any, res: any) => {
    try {
      // Basic metrics without exposing sensitive information
      const metrics = kms.getKeyMetrics();
      res.json({
        success: true,
        metrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to get KMS metrics:', error);
      res.status(500).json({ message: 'Failed to retrieve KMS metrics' });
    }
  });

  // Force key rotation endpoint (admin only)
  app.post('/api/admin/kms/rotate-user-keys/:userId', (req: any, res: any) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }

      kms.revokeUserKeys(userId);
      res.json({
        success: true,
        message: `User ${userId} keys revoked successfully`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to revoke user keys:', error);
      res.status(500).json({ message: 'Failed to revoke user keys' });
    }
  });

  // Revoke role keys endpoint (admin only)
  app.post('/api/admin/kms/rotate-role-keys/:role', (req: any, res: any) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const role = req.params.role;
      const validRoles = ['patient', 'ambulance', 'hospital', 'admin'];
      
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }

      kms.revokeRoleKeys(role);
      res.json({
        success: true,
        message: `Role ${role} keys revoked successfully`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to revoke role keys:', error);
      res.status(500).json({ message: 'Failed to revoke role keys' });
    }
  });
}