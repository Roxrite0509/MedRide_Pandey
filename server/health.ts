import type { Request, Response } from 'express';

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  service: string;
  version: string;
  environment: string;
  uptime: number;
  database?: {
    connected: boolean;
    connectionTime?: number;
  };
}

export async function healthCheck(req: Request, res: Response) {
  try {
    const startTime = Date.now();
    
    // Basic health check response
    const healthData: HealthCheckResponse = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'EmergencyConnect API',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
    };

    // Try to check database connection
    try {
      // Import db here to avoid circular dependencies
      const { db } = await import('./db');
      const connectionTime = Date.now();
      
      // Simple query to test database connectivity
      await db.execute('SELECT 1 as health');
      
      healthData.database = {
        connected: true,
        connectionTime: Date.now() - connectionTime
      };
    } catch (dbError) {
      healthData.database = {
        connected: false
      };
      healthData.status = 'unhealthy';
    }

    const statusCode = healthData.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthData);
    
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'EmergencyConnect API',
      error: 'Internal health check error'
    });
  }
}