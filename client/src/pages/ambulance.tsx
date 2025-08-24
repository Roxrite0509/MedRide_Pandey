import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { NotificationSystem } from "@/components/notification-system";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LocationMap } from "@/components/LocationMap";
import { StableNavigationMap } from "@/components/stable-navigation-map";
import { useSocket } from "@/hooks/use-socket";
import { useGeolocation } from "@/hooks/use-geolocation";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Ambulance, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  MapPin, 
  MessageSquare,
  User,
  Phone,
  X,
  Heart,
  Shield,
  Zap,
  Package,
  Navigation as NavigationIcon
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// Mock equipment data for each ambulance
const getEquipmentByVehicle = (vehicleNumber: string) => {
  const equipmentSets = {
    'AMB-001': [
      { name: 'Defibrillator', status: 'operational', icon: Zap },
      { name: 'Oxygen Tank', status: 'full', icon: Heart },
      { name: 'First Aid Kit', status: 'stocked', icon: Package },
      { name: 'Stretcher', status: 'ready', icon: Shield }
    ],
    'AMB-002': [
      { name: 'Advanced Defibrillator', status: 'operational', icon: Zap },
      { name: 'Ventilator', status: 'operational', icon: Heart },
      { name: 'IV Equipment', status: 'stocked', icon: Package },
      { name: 'Cardiac Monitor', status: 'operational', icon: Shield }
    ],
    'AMB-003': [
      { name: 'Paramedic Defibrillator', status: 'operational', icon: Zap },
      { name: 'Advanced Airway Kit', status: 'ready', icon: Heart },
      { name: 'Drug Box', status: 'secured', icon: Package },
      { name: 'Spinal Board', status: 'ready', icon: Shield }
    ],
    'AMB-004': [
      { name: 'Multi-Parameter Monitor', status: 'operational', icon: Zap },
      { name: 'Intubation Kit', status: 'ready', icon: Heart },
      { name: 'Emergency Drugs', status: 'secured', icon: Package },
      { name: 'Vacuum Mattress', status: 'ready', icon: Shield }
    ],
    'AMB-005': [
      { name: 'Critical Care Monitor', status: 'operational', icon: Zap },
      { name: 'Transport Ventilator', status: 'operational', icon: Heart },
      { name: 'Blood Products Cooler', status: 'temperature OK', icon: Package },
      { name: 'ECMO Device', status: 'standby', icon: Shield }
    ]
  };
  return equipmentSets[vehicleNumber as keyof typeof equipmentSets] || [];
};

// Function to get badge color based on status
const getStatusBadgeColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'bg-yellow-500 hover:bg-yellow-600';
    case 'accepted':
      return 'bg-blue-500 hover:bg-blue-600';
    case 'dispatched':
      return 'bg-purple-500 hover:bg-purple-600';
    case 'en_route':
      return 'bg-orange-500 hover:bg-orange-600';
    case 'at_scene':
      return 'bg-indigo-500 hover:bg-indigo-600';
    case 'transporting':
      return 'bg-teal-500 hover:bg-teal-600';
    case 'completed':
      return 'bg-green-500 hover:bg-green-600';
    case 'cancelled':
      return 'bg-red-500 hover:bg-red-600';
    default:
      return 'bg-gray-500 hover:bg-gray-600';
  }
};

export default function AmbulanceDashboard() {
  const { user } = useAuth();
  const { location } = useGeolocation();
  const { sendMessage, lastMessage } = useSocket();
  const [, setLocation] = useLocation();
  const [showRejectDialog, setShowRejectDialog] = useState<any>(null);
  const [isJourneyActive, setIsJourneyActive] = useState(false);
  const [journeyETA, setJourneyETA] = useState<number>(0);
  const [showNavigationMap, setShowNavigationMap] = useState(false);

  const { data: emergencyRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ['/api/emergency/requests'],
    // Removed all polling - using WebSocket real-time updates only
  });

  // Update location less frequently to reduce server load
  useEffect(() => {
    if (!location) return;
    
    const updateLocation = () => {
      // Only send location if connected to socket
      sendMessage('ambulance:location_update', {
        lat: location.latitude,
        lng: location.longitude
      });
    };
    
    // Update immediately, then every 45 seconds during journey, 60 seconds when idle
    updateLocation();
    const interval = setInterval(updateLocation, isJourneyActive ? 45000 : 60000);
    
    return () => clearInterval(interval);
  }, [location?.latitude, location?.longitude, sendMessage, isJourneyActive]);

  // Accept request mutation - initial acceptance
  const acceptRequestMutation = useMutation({
    mutationFn: async ({ requestId, ambulanceId }: { requestId: number, ambulanceId: number }) => {
      const response = await apiRequest('PUT', `/api/emergency/request/${requestId}`, {
        status: 'accepted',
        ambulanceId: ambulanceId
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to accept request');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      console.log('✅ Request accepted successfully:', data);
      
      // Immediately activate navigation and journey
      setShowNavigationMap(true);
      setIsJourneyActive(true);
      console.log('🗺️ Navigation map activated immediately after accept');
      
      // Send socket notification about acceptance
      sendMessage('ambulance:status_update', {
        ambulanceId: variables.ambulanceId,
        requestId: variables.requestId,
        status: 'accepted'
      });
      
      // Force immediate query refetch to ensure assignedRequests updates
      queryClient.invalidateQueries({ queryKey: ['/api/emergency/requests'] });
      queryClient.refetchQueries({ queryKey: ['/api/emergency/requests'] });
      
      // Force immediate re-render to show navigation
      setTimeout(() => {
        setShowNavigationMap(true);
        setIsJourneyActive(true);
      }, 100);
    },
    onError: (error) => {
      console.error('Failed to accept request:', error);
      if (error.message.includes('already assigned')) {
        alert('This request has already been accepted by another ambulance.');
      } else {
        alert('Failed to accept request. Please try again.');
      }
    },
  });

  const handleStartJourney = () => {
    setIsJourneyActive(true);
    // Update ambulance status to en_route - use the most recent request
    if (assignedRequests.length > 0) {
      const mostRecentRequest = assignedRequests[0]; // Already sorted by date desc
      
      console.log('Starting journey for request:', mostRecentRequest.id, 'Status:', mostRecentRequest.status);
      sendMessage('ambulance_status_update', {
        ambulanceId: user?.ambulanceProfile?.id,
        status: 'en_route',
        requestId: mostRecentRequest.id
      });
    }
  };

  const handleJourneyUpdate = (eta: number, distance: number) => {
    // Convert ETA from seconds to minutes for local display only
    const etaInMinutes = Math.round(eta / 60);
    setJourneyETA(etaInMinutes);
    
    // No broadcasting - just local state update
  };

  // Simple status update mutation (removed auto-upgrade logic)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: number, status: string }) => {
      const response = await apiRequest('PUT', `/api/emergency/request/${requestId}`, {
        status
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/emergency/requests'] });
    },
  });

  // Reject request mutation
  const rejectRequestMutation = useMutation({
    mutationFn: async ({ requestId }: { requestId: number }) => {
      const response = await apiRequest('PUT', `/api/emergency/request/${requestId}`, {
        status: 'cancelled'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/emergency/requests'] });
      setShowRejectDialog(null);
    },
    onError: (error) => {
      console.error('Failed to reject request:', error);
      alert('Failed to reject request. Please try again.');
    },
  });

  // Delete request mutation
  const deleteRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const response = await apiRequest('DELETE', `/api/emergency/request/${requestId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/emergency/requests'] });
    },
    onError: (error) => {
      console.error('Failed to delete request:', error);
      alert('Unable to delete request. Please try again.');
    },
  });

  const handleAcceptRequest = (request: any) => {
    console.log('Accepting request:', { 
      requestId: request.id, 
      ambulanceId: user?.ambulanceProfile?.id,
      userProfile: user?.ambulanceProfile 
    });
    acceptRequestMutation.mutate({
      requestId: request.id,
      ambulanceId: user?.ambulanceProfile?.id
    });
  };

  const handleRejectRequest = (request: any) => {
    setShowRejectDialog(request);
  };

  const confirmRejectRequest = () => {
    if (showRejectDialog) {
      rejectRequestMutation.mutate({
        requestId: showRejectDialog.id
      });
    }
  };

  const handleDeleteRequest = (requestId: number) => {
    if (confirm('Are you sure you want to delete this request from history?')) {
      deleteRequestMutation.mutate(requestId);
    }
  };



  const pendingRequests = Array.isArray(emergencyRequests) ? emergencyRequests.filter((req: any) => 
    req.status === 'pending'
  ) : [];
  const assignedRequests = Array.isArray(emergencyRequests) ? emergencyRequests.filter((req: any) => 
    req.ambulanceId === user?.ambulanceProfile?.id && ['accepted', 'dispatched', 'en_route', 'at_scene', 'transporting'].includes(req.status)
  ).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];
  
  // Get active request for persistent tracking
  const activeRequest = assignedRequests.find((req: any) => 
    ['accepted', 'dispatched', 'en_route', 'at_scene', 'transporting'].includes(req.status)
  );
  
  // Auto-restore journey state if there's an active request
  useEffect(() => {
    if (activeRequest && !isJourneyActive) {
      console.log('🔄 Auto-restoring journey state for request:', activeRequest.id);
      setIsJourneyActive(true);
      setShowNavigationMap(true);
    } else if (!activeRequest && isJourneyActive) {
      // Reset journey state if no active request
      console.log('🔄 Resetting journey state - no active request');
      setIsJourneyActive(false);
      setShowNavigationMap(false);
    }
  }, [activeRequest, isJourneyActive]);
  
  // Get equipment for current ambulance
  const vehicleNumber = user?.ambulanceProfile?.vehicleNumber;
  const equipmentList = vehicleNumber ? getEquipmentByVehicle(vehicleNumber) : [];

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

  // Removed excessive debug logging to prevent continuous console spam

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Reject Confirmation Dialog */}
      <Dialog open={!!showRejectDialog} onOpenChange={() => setShowRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Emergency Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject this emergency request? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-4 mt-4">
            <Button variant="outline" onClick={() => setShowRejectDialog(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmRejectRequest}
              disabled={rejectRequestMutation.isPending}
            >
              {rejectRequestMutation.isPending ? 'Rejecting...' : 'Reject Request'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Navigation Map - Show prominently when request is accepted */}
      {showNavigationMap && (assignedRequests.length > 0 || activeRequest) && location && (
        <StableNavigationMap
          ambulanceLocation={{
            latitude: location.latitude,
            longitude: location.longitude
          }}
          patientLocation={{
            latitude: parseFloat(assignedRequests[0].latitude),
            longitude: parseFloat(assignedRequests[0].longitude)
          }}
          onStartJourney={handleStartJourney}
          onJourneyUpdate={(eta, distance) => handleJourneyUpdate(eta, distance)}
          isJourneyActive={isJourneyActive}
        />
      )}

      {/* Status Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-500 rounded-full mr-3 animate-pulse"></div>
              <div>
                <div className="font-semibold text-gray-800">
                  {user?.ambulanceProfile?.vehicleNumber ? 
                    `Ambulance Unit ${user.ambulanceProfile.vehicleNumber}` : 
                    'Ambulance Unit (No Vehicle Assigned)'
                  }
                </div>
                <div className="text-sm text-gray-600">Status: Available</div>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              {user && <NotificationSystem userRole={user.role} userId={user.id} />}
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {pendingRequests.length}
                </div>
                <div className="text-sm text-gray-600">Pending Requests</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">12</div>
                <div className="text-sm text-gray-600">Completed Today</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Emergency Requests */}
        <Card>
          <CardHeader>
            <CardTitle>Incoming Emergency Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {requestsLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="border rounded-lg p-4 animate-pulse">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-24 h-4 bg-gray-300 rounded"></div>
                      <div className="w-16 h-4 bg-gray-300 rounded"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="w-32 h-3 bg-gray-300 rounded"></div>
                      <div className="w-24 h-3 bg-gray-300 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : pendingRequests.length > 0 ? (
              <div className="space-y-4">
                {pendingRequests.map((request: any) => (
                  <div key={request.id} className={`relative border-l-4 p-4 rounded-lg group hover:shadow-md transition-shadow ${
                    request.priority === 'critical' ? 'border-red-500 bg-red-50' :
                    request.priority === 'high' ? 'border-orange-500 bg-orange-50' :
                    'border-yellow-500 bg-yellow-50'
                  }`}>
                    {/* Delete button for completed requests */}
                    {(request.status === 'completed' || request.status === 'cancelled') && (
                      <button
                        onClick={() => handleDeleteRequest(request.id)}
                        className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600"
                        title="Delete request"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <AlertTriangle className={`w-4 h-4 mr-2 ${
                          request.priority === 'critical' ? 'text-red-500' :
                          request.priority === 'high' ? 'text-orange-500' :
                          'text-yellow-500'
                        }`} />
                        <span className={`font-semibold ${
                          request.priority === 'critical' ? 'text-red-700' :
                          request.priority === 'high' ? 'text-orange-700' :
                          'text-yellow-700'
                        }`}>
                          {formatEmergencyType(request.patientCondition)}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {request.priority.toUpperCase()}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <User className="w-4 h-4 mr-2" />
                        Patient: {request.patient?.firstName || request.patient?.username || 'Unknown'}
                      </div>
                      {request.description && (
                        <div className="flex items-start text-sm text-gray-700 bg-gray-50 p-2 rounded">
                          <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="font-medium">Description:</span>
                          <span className="ml-1">{request.description}</span>
                        </div>
                      )}
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-2" />
                        {request.address}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="w-4 h-4 mr-2" />
                        {new Date(request.requestedAt).toLocaleTimeString()}
                      </div>
                      {request.notes && (
                        <div className="text-sm text-gray-600">
                          <strong>Notes:</strong> {request.notes}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleAcceptRequest(request)}
                        disabled={acceptRequestMutation.isPending}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {acceptRequestMutation.isPending ? 'Accepting...' : 'Accept'}
                      </Button>
                      <Button 
                        variant="destructive"
                        onClick={() => handleRejectRequest(request)}
                        disabled={rejectRequestMutation.isPending}
                        className="flex-1"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="mx-auto w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                  <Ambulance className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500">No pending emergency requests</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <NavigationIcon className="w-5 h-5 mr-2" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <MapPin className="w-4 h-4 mr-2" />
                Update Current Location
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Phone className="w-4 h-4 mr-2" />
                Emergency Contacts
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <MessageSquare className="w-4 h-4 mr-2" />
                Communication Center
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Equipment Status */}
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Equipment</CardTitle>
            <CardDescription>
              {vehicleNumber ? `Equipment Status for ${vehicleNumber}` : 'No vehicle assigned'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {equipmentList.length > 0 ? (
              <div className="space-y-3">
                {equipmentList.map((equipment: any, index: number) => {
                  const IconComponent = equipment.icon;
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <IconComponent className="w-5 h-5 mr-3 text-blue-600" />
                        <div>
                          <div className="font-medium text-gray-900">{equipment.name}</div>
                          <div className="text-sm text-gray-600">Status: {equipment.status}</div>
                        </div>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${
                        equipment.status.includes('operational') || equipment.status.includes('ready') || equipment.status.includes('full') || equipment.status.includes('stocked') || equipment.status.includes('secured') || equipment.status.includes('OK') ? 
                        'bg-green-500' : 
                        equipment.status.includes('standby') ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No equipment data available</p>
                <p className="text-sm">Vehicle assignment required</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Current Request Status */}
      {activeRequest && (
        <Card className="mb-6 border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Current Active Request</span>
              <Badge className={`${getStatusBadgeColor(activeRequest.status)} text-white`}>
                {activeRequest.status.toUpperCase()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-2">Patient Details</div>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <User className="w-4 h-4 mr-2 text-gray-500" />
                    <span>Patient: {activeRequest.patient?.firstName || activeRequest.patient?.username || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                    <span>{activeRequest.address}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Clock className="w-4 h-4 mr-2 text-gray-500" />
                    <span>{formatDistanceToNow(new Date(activeRequest.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-2">Request Details</div>
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Condition:</span> {formatEmergencyType(activeRequest.patientCondition)}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Priority:</span> {activeRequest.priority || 'Medium'}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Request ID:</span> #{activeRequest.id}
                  </div>
                  {(activeRequest.notes || activeRequest.description) && (
                    <div className="text-sm">
                      <span className="font-medium">Description:</span> {activeRequest.notes || activeRequest.description}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              {activeRequest.status === 'accepted' && !isJourneyActive && (
                <Button
                  onClick={handleStartJourney}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  <NavigationIcon className="h-4 w-4 mr-1" />
                  Start Journey
                </Button>
              )}
              {isJourneyActive && showNavigationMap && (
                <div className="flex items-center space-x-2 text-green-600">
                  <NavigationIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">Navigation Active</span>
                  {journeyETA > 0 && <span className="text-sm">ETA: {journeyETA} min</span>}
                </div>
              )}
              {['dispatched', 'en_route', 'at_scene'].includes(activeRequest.status) && !showNavigationMap && (
                <Button
                  onClick={() => {
                    setShowNavigationMap(true);
                    setIsJourneyActive(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  <MapPin className="h-4 w-4 mr-1" />
                  View Navigation
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Coordinates Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <User className="h-5 w-5 mr-2 text-red-500" />
              Patient Coordinates
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeRequest && activeRequest.latitude && activeRequest.longitude ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Latitude:</span>
                  <span className="font-mono text-sm">{parseFloat(activeRequest.latitude).toFixed(6)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Longitude:</span>
                  <span className="font-mono text-sm">{parseFloat(activeRequest.longitude).toFixed(6)}</span>
                </div>
                <Badge variant="outline" className="text-xs text-green-600">Active Emergency</Badge>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-500">No active emergency requests</p>
                <Badge variant="outline" className="text-xs text-orange-600">Standby</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Ambulance className="h-5 w-5 mr-2 text-blue-500" />
              Current Coordinates
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user?.ambulanceProfile?.currentLatitude && user?.ambulanceProfile?.currentLongitude ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Latitude:</span>
                  <span className="font-mono text-sm">{parseFloat(user.ambulanceProfile.currentLatitude).toFixed(6)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Longitude:</span>
                  <span className="font-mono text-sm">{parseFloat(user.ambulanceProfile.currentLongitude).toFixed(6)}</span>
                </div>
                <Badge variant="outline" className="text-xs text-blue-600">Live GPS</Badge>
              </div>
            ) : (
              <p className="text-sm text-gray-500">GPS location pending...</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Location Map - Hide when navigation is active */}
      {!showNavigationMap && (
        <LocationMap 
          title="Patient & Ambulance Location"
          height="300px"
          showRefreshButton={true}
          showCurrentAmbulance={true}
          currentAmbulanceId={(() => {
            console.log('🚑 Ambulance dashboard - user profile:', user);
            console.log('🚑 Ambulance profile ID:', user?.ambulanceProfile?.id);
            return user?.ambulanceProfile?.id;
          })()}
          patientLocation={activeRequest ? {
            latitude: parseFloat(activeRequest.latitude || '0'),
            longitude: parseFloat(activeRequest.longitude || '0')
          } : null}
          onLocationChange={(newLocation) => {
            console.log('Ambulance location updated:', newLocation);
          }}
        />
      )}
    </div>
  );
}