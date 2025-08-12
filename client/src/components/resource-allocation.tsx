import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  UserCheck, 
  Users, 
  Zap, 
  Activity, 
  Heart, 
  Bed,
  Shield,
  Thermometer,
  Pill,
  Clock
} from 'lucide-react';

interface ResourceData {
  id: string;
  name: string;
  current: number;
  total: number;
  status: 'critical' | 'low' | 'normal' | 'good';
  icon: React.ReactNode;
  unit: string;
  lastUpdated: Date;
  trend: 'up' | 'down' | 'stable';
}

export function ResourceAllocation() {
  const [resources, setResources] = useState<ResourceData[]>([]);

  // Initialize and simulate real-time resource data
  useEffect(() => {
    const initialResources: ResourceData[] = [
      {
        id: 'doctors',
        name: 'Doctors On Duty',
        current: 18,
        total: 25,
        status: 'normal',
        icon: <UserCheck className="h-5 w-5" />,
        unit: 'staff',
        lastUpdated: new Date(),
        trend: 'stable'
      },
      {
        id: 'nurses',
        name: 'Nurses On Duty',
        current: 42,
        total: 60,
        status: 'normal',
        icon: <Users className="h-5 w-5" />,
        unit: 'staff',
        lastUpdated: new Date(),
        trend: 'up'
      },
      {
        id: 'oxygen',
        name: 'Oxygen Cylinders',
        current: 85,
        total: 120,
        status: 'normal',
        icon: <Zap className="h-5 w-5" />,
        unit: 'units',
        lastUpdated: new Date(),
        trend: 'down'
      },
      {
        id: 'ventilators',
        name: 'Ventilators Available',
        current: 8,
        total: 15,
        status: 'low',
        icon: <Activity className="h-5 w-5" />,
        unit: 'machines',
        lastUpdated: new Date(),
        trend: 'down'
      },
      {
        id: 'icu_beds',
        name: 'ICU Beds Available',
        current: 5,
        total: 20,
        status: 'critical',
        icon: <Heart className="h-5 w-5" />,
        unit: 'beds',
        lastUpdated: new Date(),
        trend: 'stable'
      },
      {
        id: 'general_beds',
        name: 'General Beds Available',
        current: 32,
        total: 90,
        status: 'low',
        icon: <Bed className="h-5 w-5" />,
        unit: 'beds',
        lastUpdated: new Date(),
        trend: 'up'
      },
      {
        id: 'isolation_beds',
        name: 'Isolation Beds Available',
        current: 7,
        total: 10,
        status: 'good',
        icon: <Shield className="h-5 w-5" />,
        unit: 'beds',
        lastUpdated: new Date(),
        trend: 'stable'
      },
      {
        id: 'blood_units',
        name: 'Blood Units (O-)',
        current: 28,
        total: 50,
        status: 'low',
        icon: <Thermometer className="h-5 w-5" />,
        unit: 'units',
        lastUpdated: new Date(),
        trend: 'down'
      },
      {
        id: 'medications',
        name: 'Emergency Medications',
        current: 156,
        total: 200,
        status: 'good',
        icon: <Pill className="h-5 w-5" />,
        unit: 'doses',
        lastUpdated: new Date(),
        trend: 'stable'
      }
    ];

    setResources(initialResources);

    // Simulate real-time updates every 30 seconds
    const interval = setInterval(() => {
      setResources(prev => prev.map(resource => {
        // Random small changes to simulate real usage
        const change = Math.floor(Math.random() * 5) - 2; // -2 to +2
        const newCurrent = Math.max(0, Math.min(resource.total, resource.current + change));
        
        // Determine status based on percentage
        const percentage = (newCurrent / resource.total) * 100;
        let newStatus: 'critical' | 'low' | 'normal' | 'good';
        if (percentage < 25) newStatus = 'critical';
        else if (percentage < 50) newStatus = 'low';
        else if (percentage < 80) newStatus = 'normal';
        else newStatus = 'good';

        // Determine trend
        let newTrend: 'up' | 'down' | 'stable';
        if (change > 0) newTrend = 'up';
        else if (change < 0) newTrend = 'down';
        else newTrend = 'stable';

        return {
          ...resource,
          current: newCurrent,
          status: newStatus,
          lastUpdated: new Date(),
          trend: newTrend
        };
      }));
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-red-500 text-white';
      case 'low': return 'bg-orange-500 text-white';
      case 'normal': return 'bg-blue-500 text-white';
      case 'good': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-red-500';
      case 'low': return 'bg-orange-500';
      case 'normal': return 'bg-blue-500';
      case 'good': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '↗️';
      case 'down': return '↘️';
      case 'stable': return '➡️';
      default: return '➡️';
    }
  };

  const formatLastUpdated = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes === 0) return 'Just now';
    if (minutes === 1) return '1 minute ago';
    return `${minutes} minutes ago`;
  };

  const criticalResources = resources.filter(r => r.status === 'critical');
  const lowResources = resources.filter(r => r.status === 'low');

  return (
    <div className="space-y-6">
      {/* Alert Section for Critical Resources */}
      {criticalResources.length > 0 && (
        <Card className="border-red-500 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Critical Resource Alert</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {criticalResources.map(resource => (
                <div key={resource.id} className="flex items-center justify-between">
                  <span className="font-medium">{resource.name}</span>
                  <Badge variant="destructive">
                    {resource.current}/{resource.total} {resource.unit}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resource Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {resources.map(resource => {
          const percentage = (resource.current / resource.total) * 100;
          
          return (
            <Card key={resource.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="text-blue-600">
                      {resource.icon}
                    </div>
                    <CardTitle className="text-sm font-medium">
                      {resource.name}
                    </CardTitle>
                  </div>
                  <Badge className={getStatusColor(resource.status)}>
                    {resource.status.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Main Numbers */}
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">
                    {resource.current}
                  </div>
                  <div className="text-sm text-gray-500">
                    of {resource.total} {resource.unit}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <Progress 
                    value={percentage} 
                    className="h-3"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0</span>
                    <span>{percentage.toFixed(1)}%</span>
                    <span>{resource.total}</span>
                  </div>
                </div>

                {/* Footer Info */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatLastUpdated(resource.lastUpdated)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span>{getTrendIcon(resource.trend)}</span>
                    <span>{resource.trend}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Resource Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {resources.filter(r => r.status === 'good').length}
              </div>
              <div className="text-sm text-gray-600">Good Status</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {resources.filter(r => r.status === 'normal').length}
              </div>
              <div className="text-sm text-gray-600">Normal Status</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {lowResources.length}
              </div>
              <div className="text-sm text-gray-600">Low Resources</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {criticalResources.length}
              </div>
              <div className="text-sm text-gray-600">Critical Resources</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}