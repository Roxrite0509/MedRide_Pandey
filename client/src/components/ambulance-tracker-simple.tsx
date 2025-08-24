import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Truck, Phone, MapPin, UserCheck, X, AlertTriangle, Heart } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';

interface IncomingAmbulance {
  id: number;
  vehicleNumber: string;
  patientName: string;
  eta: number;
  distance: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'dispatched' | 'en_route' | 'arriving';
  departureTime: Date;
  condition: string;
  description?: string; // Add description field
  contactNumber?: string;
}

interface EmergencyRequest {
  id: number;
  patientId: number;
  ambulanceId: number | null;
  hospitalId: number | null;
  latitude: string;
  longitude: string;
  address: string;
  priority: string;
  status: string;
  patientCondition: string | null;
  description: string | null; // Add description field
  notes: string | null;
  requestedAt: string;
  dispatchedAt: string | null;
  completedAt: string | null;
  estimatedArrival: string | null;
  patientChosenHospitalId: number | null;
  createdAt: string;
  updatedAt: string;
  ambulance?: {
    id: number;
    vehicleNumber: string;
    operatorId: number | null;
    hospitalId: number | null;
    currentLatitude: string;
    currentLongitude: string;
    status: string;
    licenseNumber: string;
    certification: string;
    equipmentLevel: string;
    hospitalAffiliation: string;
    isActive: boolean;
  };
  patient?: {
    id: number;
    username: string;
    firstName: string | null;
    lastName: string | null;
    phoneNumber: string | null;
  };
}

export function AmbulanceTracker() {
  const [wardDialogOpen, setWardDialogOpen] = useState(false);
  const [selectedAmbulance, setSelectedAmbulance] = useState<IncomingAmbulance | null>(null);
  const [selectedWard, setSelectedWard] = useState('');
  
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Get hospital ID based on user ID
  const getHospitalId = (userId: number): number => {
    const hospitalMapping: Record<number, number> = {
      11: 2, // Apollo Hospital Indore
      12: 3, // CARE CHL Hospital Indore  
      13: 4  // Bombay Hospital Indore
    };
    return hospitalMapping[userId] || 4;
  };
  
  const hospitalId = user ? getHospitalId(user.id) : 4;
  
  // Fetch real emergency requests
  const { data: emergencyRequests = [] } = useQuery<EmergencyRequest[]>({
    queryKey: ['/api/emergency/requests'],
    refetchInterval: 5000,
  });
  
  // Fetch hospital beds for ward selection
  const { data: hospitalBeds = [] } = useQuery({
    queryKey: [`/api/hospitals/${hospitalId}/bed-status`],
    refetchInterval: 30000,
  });

  const { data: availableWardsData = [] } = useQuery({
    queryKey: [`/api/hospitals/${hospitalId}/available-wards`],
    enabled: !!hospitalId && wardDialogOpen,
    refetchInterval: false
  });
  
  // Function to format emergency type for display
  const formatEmergencyType = (patientCondition: string) => {
    const emergencyTypeMap: {[key: string]: string} = {
      'cardiac': 'Cardiac Emergency',
      'accident': 'Accident/Trauma',
      'respiratory': 'Breathing Problems',
      'stroke': 'Stroke',
      'diabetic': 'Diabetic Emergency',
      'allergic': 'Allergic Reaction',
      'other': 'Other Medical Emergency'
    };
    return emergencyTypeMap[patientCondition] || patientCondition || 'Medical Emergency';
  };

  // Transform emergency requests to ambulance data
  const incomingAmbulances = useMemo(() => {
    const dispatched = emergencyRequests.filter(req => 
      req.status === 'dispatched' || req.status === 'accepted' || req.status === 'en_route'
    );
    
    return dispatched.map(req => ({
      id: req.id,
      vehicleNumber: req.ambulance?.vehicleNumber || 'AMB-???',
      patientName: req.patient?.firstName ? 
        `${req.patient.firstName} ${req.patient.lastName || ''}`.trim() : 
        'Unknown Patient',
      eta: Math.floor(Math.random() * 15) + 5, // 5-20 minutes
      distance: Math.round((Math.random() * 10 + 1) * 10) / 10, // 1-10 km
      priority: req.priority as 'low' | 'medium' | 'high' | 'critical',
      status: req.status as 'dispatched' | 'en_route' | 'arriving',
      departureTime: new Date(req.requestedAt),
      condition: formatEmergencyType(req.patientCondition),
      description: req.notes || req.description || 'No additional details provided',
      contactNumber: req.ambulance?.operatorPhone
    }));
  }, [emergencyRequests]);
  
  // Add simulation ambulances for demonstration
  const simulationAmbulances: IncomingAmbulance[] = useMemo(() => [
    {
      id: 9999,
      vehicleNumber: 'AMB-SIM1',
      patientName: 'Rajesh Kumar',
      eta: 8,
      distance: 3.2,
      priority: 'high',
      status: 'en_route',
      departureTime: new Date(Date.now() - 10 * 60000),
      condition: 'Chest Pain',
      description: 'Patient experiencing severe chest pain with shortness of breath. Pain started 30 minutes ago during physical activity.',
      contactNumber: '+91-98765-43210'
    },
    {
      id: 9998,
      vehicleNumber: 'AMB-SIM2',
      patientName: 'Priya Sharma',
      eta: 12,
      distance: 5.7,
      priority: 'medium',
      status: 'dispatched',
      departureTime: new Date(Date.now() - 5 * 60000),
      condition: 'Accident Trauma',
      description: 'Road traffic accident with minor injuries. Patient is conscious and alert but has leg pain and minor cuts.',
      contactNumber: '+91-87654-32109'
    }
  ], []);
  
  const allAmbulances = [...incomingAmbulances, ...simulationAmbulances];
  
  // Use the new available wards API data
  const availableWards = useMemo(() => {
    const wardNames = availableWardsData.map((ward: any) => ward.wardName).filter(Boolean);
    return wardNames;
  }, [availableWardsData]);
  
  // Mutations for handling actions
  const patientReceivedMutation = useMutation({
    mutationFn: async (params: { requestId: number, wardName: string, patientName: string }) => {
      const { requestId, wardName, patientName } = params;
      
      if (requestId >= 9998) {
        // Simulation ambulance
        throw new Error('Simulation ambulances cannot be processed');
      }
      
      const response = await apiRequest('POST', `/api/hospitals/${hospitalId}/assign-patient-to-ward`, { 
        wardName,
        patientName,
        requestId: requestId.toString()
      });
      
      return response;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/emergency/requests'] });
      queryClient.invalidateQueries({ queryKey: [`/api/hospitals/${hospitalId}/bed-status`] });
      queryClient.invalidateQueries({ queryKey: [`/api/hospitals/${hospitalId}/available-wards`] });
      alert(data.message || "Patient has been successfully admitted and assigned to a bed.");
      setWardDialogOpen(false);
      setSelectedWard('');
      setSelectedAmbulance(null);
    },
    onError: (error: Error) => {
      alert(error.message || "Failed to assign patient to ward.");
    }
  });

  const cancelDispatchMutation = useMutation({
    mutationFn: async (requestId: number) => {
      if (requestId >= 9998) {
        throw new Error('Simulation ambulances cannot be cancelled');
      }
      
      await apiRequest('PUT', `/api/emergency/requests/${requestId}`, { status: 'cancelled' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/emergency/requests'] });
      alert("Emergency request has been cancelled.");
    },
    onError: (error: Error) => {
      alert(error.message || "Failed to cancel dispatch.");
    }
  });
  
  const handlePatientReceived = (ambulance: IncomingAmbulance) => {
    setSelectedAmbulance(ambulance);
    setWardDialogOpen(true);
  };

  const handleCancelDispatch = (ambulance: IncomingAmbulance) => {
    if (confirm(`Are you sure you want to cancel dispatch for ${ambulance.vehicleNumber}?`)) {
      cancelDispatchMutation.mutate(ambulance.id);
    }
  };

  const handleWardSelection = () => {
    if (!selectedAmbulance || !selectedWard) return;
    
    
    patientReceivedMutation.mutate({
      requestId: selectedAmbulance.id,
      wardName: selectedWard,
      patientName: selectedAmbulance.patientName
    });
  };

  const formatElapsedTime = (departureTime: Date) => {
    const now = new Date();
    const elapsed = Math.floor((now.getTime() - departureTime.getTime()) / 60000);
    return elapsed > 0 ? `${elapsed}m ago` : 'Just now';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      case 'high': return <Heart className="h-4 w-4" />;
      default: return <Truck className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-700">
            Incoming Ambulances ({allAmbulances.length})
          </h3>
        </div>
      </div>

      {allAmbulances.length === 0 ? (
        <Card className="bg-gray-50 border-dashed">
          <CardContent className="p-6 text-center">
            <Truck className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No incoming ambulances at the moment</p>
            <p className="text-sm text-gray-400 mt-1">Emergency requests will appear here when ambulances are dispatched</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {allAmbulances.map((ambulance) => (
            <Card key={ambulance.id} className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Truck className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {ambulance.vehicleNumber}
                        {ambulance.id >= 9998 && (
                          <Badge variant="secondary" className="bg-red-100 text-red-700">
                            SIMULATION
                          </Badge>
                        )}
                        {ambulance.id < 9998 && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                            LIVE
                          </Badge>
                        )}
                      </CardTitle>
                      <p className="text-sm text-gray-600">Patient: {ambulance.patientName}</p>
                    </div>
                  </div>
                  <Badge className={getPriorityColor(ambulance.priority)}>
                    {getPriorityIcon(ambulance.priority)}
                    {ambulance.priority.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">ETA: {ambulance.eta}m</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{ambulance.distance}km away</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{ambulance.condition}</span>
                  </div>
                  {ambulance.contactNumber && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{ambulance.contactNumber}</span>
                    </div>
                  )}
                </div>
                
                {ambulance.description && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg border-l-4 border-l-orange-400">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-sm font-medium text-gray-700">Emergency Description:</span>
                        <p className="text-sm text-gray-600 mt-1">{ambulance.description}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Dispatched: {formatElapsedTime(ambulance.departureTime)}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handlePatientReceived(ambulance)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                      size="sm"
                    >
                      <UserCheck className="h-4 w-4 mr-1" />
                      Patient Received
                    </Button>
                    <Button
                      onClick={() => handleCancelDispatch(ambulance)}
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50"
                      size="sm"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel Dispatch
                    </Button>
                  </div>
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
            <DialogDescription>
              Patient {selectedAmbulance?.patientName} from {selectedAmbulance?.vehicleNumber} is ready to be admitted.
              Please select from {availableWards.length} available ward{availableWards.length !== 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Select value={selectedWard} onValueChange={setSelectedWard}>
              <SelectTrigger>
                <SelectValue placeholder="Select a ward" />
              </SelectTrigger>
              <SelectContent>
                {availableWardsData.length === 0 ? (
                  <div className="p-2 text-gray-500">No available wards found</div>
                ) : (
                  availableWardsData
                    .filter((ward: any) => ward.wardName)
                    .map((ward: any, index: number) => (
                      <SelectItem key={`ward-${index}-${ward.wardName}`} value={ward.wardName}>
                        {ward.wardName} ({ward.availableBeds} beds available)
                      </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setWardDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleWardSelection}
              disabled={!selectedWard || patientReceivedMutation.isPending}
            >
              {patientReceivedMutation.isPending ? 'Assigning...' : 'Assign to Ward'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}