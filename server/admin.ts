import type { Express } from 'express';

export function registerAdminRoutes(app: Express) {
  // Simple admin health check endpoint
  app.get('/api/admin/status', (req: any, res: any) => {
    try {
      res.json({
        success: true,
        message: 'Admin routes active',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to get admin status:', error);
      res.status(500).json({ message: 'Failed to retrieve admin status' });
    }
  });
}