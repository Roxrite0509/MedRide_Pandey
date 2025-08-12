import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Truck, Phone, MapPin, CheckCircle, X, UserCheck } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface IncomingAmbulance {
  id: number;
  vehicleNumber: string;
  patientName: string;
  eta: number; // minutes
  distance: number; // kilometers
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'dispatched' | 'en_route' | 'arriving';
  departureTime: Date;
  condition: string;
  contactNumber?: string;
}

export function AmbulanceTracker() {
  // State variables
  const [wardDialogOpen, setWardDialogOpen] = useState(false);
  const [selectedAmbulance, setSelectedAmbulance] = useState<IncomingAmbulance | null>(null);
  const [selectedWard, setSelectedWard] = useState('');
  
  // React Query hooks
  const queryClient = useQueryClient();
  
  const emergencyRequestsQuery = useQuery({
    queryKey: ['/api/emergency/requests'],
    refetchInterval: 5000,
  });
  
  const hospitalBedsQuery = useQuery({
    queryKey: ['/api/hospitals/4/bed-status'],
    refetchInterval: 30000,
  });
  
  // Extract data with safe fallbacks
  const emergencyRequests = emergencyRequestsQuery.data || [];
  const hospitalBeds = hospitalBedsQuery.data || [];

  // Mutations for handling ambulance actions
  const patientReceivedMutation = useMutation({
    mutationFn: async (params: { requestId: number, bedNumber: string, patientName: string }) => {
      const { requestId, bedNumber, patientName } = params;
      // Update emergency request status to completed
      await apiRequest('PUT', `/api/emergency/requests/${requestId}`, { status: 'completed' });
      
      // Update bed status to occupied with patient name
      await apiRequest('PUT', `/api/hospitals/beds/${bedNumber}/assign`, { 
        status: 'occupied',
        patientName: patientName
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/emergency/requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hospitals/4/bed-status'] });
      alert("Patient has been assigned to the selected ward.");
      setWardDialogOpen(false);
      setSelectedWard('');
      setSelectedAmbulance(null);
    },
    onError: () => {
      alert("Failed to assign patient to ward.");
    }
  });

  const cancelDispatchMutation = useMutation({
    mutationFn: async (requestId: number) => {
      await apiRequest('PUT', `/api/emergency/requests/${requestId}`, { status: 'cancelled' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/emergency/requests'] });
      alert("Emergency request has been cancelled.");
    },
    onError: () => {
      alert("Failed to cancel dispatch.");
    }
  });

  // Convert real emergency requests to ambulance format with safe defaults
  const realAmbulances: IncomingAmbulance[] = React.useMemo(() => {
    if (!emergencyRequests || !Array.isArray(emergencyRequests)) return [];
    
    return emergencyRequests
      .filter((req: any) => req.status === 'dispatched' || req.status === 'accepted' || req.status === 'en_route')
      .map((req: any, index: number) => ({
        id: req.id,
        vehicleNumber: req.ambulance?.vehicleNumber || `AMB-${String(req.ambulanceId || index + 1).padStart(3, '0')}`,
        patientName: req.patient?.firstName || req.patient?.username || 'Patient',
        eta: req.estimatedArrival || Math.floor(Math.random() * 20) + 5,
        distance: req.distance || Math.random() * 8 + 1,
        priority: req.priority || 'medium',
        status: req.status === 'accepted' ? 'dispatched' : req.status,
        departureTime: new Date(req.createdAt),
        condition: req.patientCondition || req.description || 'Emergency',
        contactNumber: req.ambulance?.operatorPhone || '+91-9876543210'
      })) as IncomingAmbulance[];
  }, [emergencyRequests]);

  // Get completed and cancelled requests for the lower section
  const completedRequests = React.useMemo(() => {
    if (!emergencyRequests || !Array.isArray(emergencyRequests)) return [];
    
    return emergencyRequests
      .filter((req: any) => req.status === 'completed' || req.status === 'cancelled')
      .map((req: any, index: number) => ({
        id: req.id,
        vehicleNumber: req.ambulance?.vehicleNumber || `AMB-${String(req.ambulanceId || index + 1).padStart(3, '0')}`,
        patientName: req.patient?.firstName || req.patient?.username || 'Patient',
        status: req.status,
        completedAt: new Date(req.updatedAt),
        condition: req.patientCondition || req.description || 'Emergency',
      }));
  }, [emergencyRequests]);

  // Get available beds grouped by ward
  const availableBeds = React.useMemo(() => {
    if (!hospitalBeds || !Array.isArray(hospitalBeds)) return {};
    
    return hospitalBeds
      .filter((bed: any) => bed.status === 'available')
      .reduce((acc: any, bed: any) => {
        const wardName = getWardFromBedNumber(bed.bedNumber);
        if (!acc[wardName]) acc[wardName] = [];
        acc[wardName].push(bed);
        return acc;
      }, {});
  }, [hospitalBeds]);

  // Helper function to get ward name from bed number
  const getWardFromBedNumber = (bedNumber: string): string => {
    if (bedNumber.startsWith('CICU-')) return 'Cardiac ICU';
    if (bedNumber.startsWith('NICU-')) return 'Neonatal ICU';
    if (bedNumber.startsWith('SICU-')) return 'Surgical ICU';
    if (bedNumber.startsWith('PICU-')) return 'Pediatric ICU';
    if (bedNumber.startsWith('MAT-')) return 'Maternity Ward';
    if (bedNumber.startsWith('SUR-')) return 'Surgery Ward';
    if (bedNumber.startsWith('MED-')) return 'Medicine Ward';
    if (bedNumber.startsWith('GEN-')) return 'General Ward';
    return 'General Ward';
  };

  // Handler functions
  const handlePatientReceived = (ambulance: IncomingAmbulance) => {
    setSelectedAmbulance(ambulance);
    setWardDialogOpen(true);
  };

  const confirmPatientReceived = () => {
    if (selectedAmbulance && selectedWard) {
      patientReceivedMutation.mutate({
        requestId: selectedAmbulance.id,
        bedNumber: selectedWard,
        patientName: selectedAmbulance.patientName
      });
    }
  };

  const handleCancelDispatch = (ambulance: IncomingAmbulance) => {
    if (confirm(`Are you sure you want to cancel dispatch for ${ambulance.vehicleNumber}?`)) {
      cancelDispatchMutation.mutate(ambulance.id);
    }
  };

  const sortedAmbulances = React.useMemo(() => {
    if (!realAmbulances || realAmbulances.length === 0) return [];
    
    return [...realAmbulances].sort((a, b) => {
      // Sort by priority first, then by ETA
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.eta - b.eta;
    });
  }, [realAmbulances]);

  const formatElapsedTime = (departureTime: Date) => {
    const now = new Date();
    const elapsed = Math.floor((now.getTime() - departureTime.getTime()) / 60000);
    return elapsed;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  console.log('🏥 Hospital Dashboard - Real incoming ambulances:', emergencyRequests || []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-700">Incoming Ambulances ({sortedAmbulances.length})</h3>
        </div>
      </div>

      {sortedAmbulances.length === 0 ? (
        <Card className="bg-gray-50 border-dashed">
          <CardContent className="p-6 text-center">
            <Truck className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No incoming ambulances at the moment</p>
            <p className="text-sm text-gray-400 mt-1">Emergency requests will appear here when ambulances are dispatched</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sortedAmbulances.map((ambulance) => (
            <Card key={ambulance.id} className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <Badge className={`${getPriorityColor(ambulance.priority)} font-medium`}>
                      {ambulance.priority.toUpperCase()}
                    </Badge>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
                      LIVE
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-lg">{ambulance.vehicleNumber}</div>
                    <div className="text-sm text-gray-600">Patient: {ambulance.patientName}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>ETA: {ambulance.eta} min</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span>{ambulance.distance.toFixed(1)} km away</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="font-medium">Condition:</div>
                    <span>{ambulance.condition}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{ambulance.contactNumber}</span>
                  </div>
                </div>
                
                <div className="mt-2 text-xs text-gray-500">
                  Departed {formatElapsedTime(ambulance.departureTime)} minutes ago
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2 mt-4 pt-3 border-t">
                  <Button
                    onClick={() => handlePatientReceived(ambulance)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                  >
                    <UserCheck className="h-4 w-4 mr-1" />
                    Patient Received
                  </Button>
                  <Button
                    onClick={() => handleCancelDispatch(ambulance)}
                    variant="outline"
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                    size="sm"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel Dispatch
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Ward Selection Dialog */}
      <Dialog open={wardDialogOpen} onOpenChange={setWardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Patient to Ward</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Patient: <strong>{selectedAmbulance?.patientName}</strong></p>
            <p>Condition: <strong>{selectedAmbulance?.condition}</strong></p>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Select Available Bed:</label>
              <Select value={selectedWard} onValueChange={setSelectedWard}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an available bed" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(availableBeds).map(([wardName, beds]) =>
                    (Array.isArray(beds) ? beds : []).map((bed: any) => (
                      <SelectItem key={bed.bedNumber} value={bed.bedNumber}>
                        {bed.bedNumber} - {wardName}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={confirmPatientReceived}
                disabled={!selectedWard || patientReceivedMutation.isPending}
                className="flex-1"
              >
                {patientReceivedMutation.isPending ? 'Assigning...' : 'Confirm Assignment'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setWardDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Completed/Cancelled Requests Section */}
      {completedRequests.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-700">Recent Activity ({completedRequests.length})</h3>
          </div>
          
          <div className="grid gap-3">
            {completedRequests.map((request: any) => (
              <Card key={request.id} className="bg-gray-50 border-gray-200">
                <CardContent className="p-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Badge variant={request.status === 'completed' ? 'default' : 'secondary'}>
                        {request.status === 'completed' ? 'COMPLETED' : 'CANCELLED'}
                      </Badge>
                      <span className="font-medium">{request.vehicleNumber}</span>
                      <span className="text-sm text-gray-600">{request.patientName}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {request.completedAt.toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{request.condition}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}