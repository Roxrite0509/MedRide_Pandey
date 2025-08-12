import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useGeolocation } from '@/hooks/use-geolocation';
import { useWebSocket } from '@/hooks/use-websocket';
import { NotificationSystem } from '@/components/notification-system';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { NavigationMap } from '@/components/navigation-map';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  MapPin, Clock, Phone, User, AlertTriangle, Navigation as NavigationIcon, 
  CheckCircle, X, Timer, Gauge, Users, Activity, 
  Heart, Shield, Zap, Truck, Target, RotateCcw
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

export default function EnhancedAmbulanceDashboard() {
  const { user } = useAuth();
  const { location, error: locationError } = useGeolocation();
  const { isConnected, socket, lastMessage } = useWebSocket();
  
  // Enhanced state management
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [journeyActive, setJourneyActive] = useState(false);
  const [currentETA, setCurrentETA] = useState<number | null>(null);
  const [ambulanceStats, setAmbulanceStats] = useState({
    totalRequests: 0,
    completedToday: 0,
    averageResponseTime: 0,
    currentStatus: 'available'
  });

  // Get ambulance profile with enhanced details
  const ambulanceProfileQuery = useQuery({
    queryKey: ['/api/auth/user'],
    enabled: !!user?.id,
  });

  // Get emergency requests with persistent tracking for this ambulance
  const emergencyRequestsQuery = useQuery({
    queryKey: ['/api/emergency/requests'],
    enabled: !!user?.id,
    refetchInterval: journeyActive ? 10000 : 5000, // Much slower updates during navigation to prevent interference
    refetchIntervalInBackground: false, // Don't refetch when tab is not active
  });

  // Get ambulance-specific statistics
  const statsQuery = useQuery({
    queryKey: ['/api/ambulance/stats', user?.id],
    enabled: !!user?.id,
  });

  const ambulanceProfile = ambulanceProfileQuery.data?.ambulanceProfile;
  const emergencyRequests = emergencyRequestsQuery.data || [];
  const pendingRequests = emergencyRequests.filter((req: any) => req.status === 'pending');
  
  // Find active request from database, filtering by current ambulance
  const currentAmbulanceId = ambulanceProfile?.id;
  const dbActiveRequest = emergencyRequests.find((req: any) => 
    req.ambulanceId === currentAmbulanceId && ['accepted', 'dispatched', 'en_route', 'at_scene', 'transporting'].includes(req.status)
  );
  
  // Use selectedRequest if it exists and is still active, otherwise use database request
  const activeRequest = selectedRequest && ['accepted', 'dispatched', 'en_route', 'at_scene', 'transporting'].includes(selectedRequest.status) 
    ? selectedRequest 
    : dbActiveRequest;

  // Auto-restore active request on page load/refresh if there's a persistent request
  useEffect(() => {
    if (dbActiveRequest && !selectedRequest && !journeyActive) {
      console.log('🔄 Auto-restoring active request on page load:', dbActiveRequest.id);
      setSelectedRequest(dbActiveRequest);
      setJourneyActive(true);
    }
  }, [dbActiveRequest, selectedRequest, journeyActive]);

  // Debug logging to understand state changes
  useEffect(() => {
    console.log('🔍 State update:', {
      selectedRequest: selectedRequest?.id,
      selectedStatus: selectedRequest?.status,
      dbActiveRequest: dbActiveRequest?.id,
      dbStatus: dbActiveRequest?.status,
      finalActiveRequest: activeRequest?.id,
      journeyActive,
      showNavigation: !!(activeRequest && location)
    });
  }, [selectedRequest, dbActiveRequest, activeRequest, journeyActive, location]);

  // WebSocket listener for real-time updates
  useEffect(() => {
    if (lastMessage?.type === 'new_emergency_request') {
      queryClient.invalidateQueries({ queryKey: ['/api/emergency/requests'] });
    }
    if (lastMessage?.type === 'request_update' || lastMessage?.type === 'emergency_request_updated') {
      // If our current request was updated, update our selectedRequest with latest data
      if (selectedRequest && lastMessage.data?.id === selectedRequest.id) {
        const updatedStatus = lastMessage.data?.status;
        if (updatedStatus === 'cancelled' || updatedStatus === 'completed') {
          // Request was cancelled or completed externally
          setSelectedRequest(null);
          setJourneyActive(false);
          setCurrentETA(null);
        } else {
          // Update selectedRequest with latest data to prevent stale state
          setSelectedRequest(lastMessage.data);
        }
      }
      // Delay the query refresh to prevent interference with navigation
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/emergency/requests'] });
      }, 1000);
    }
  }, [lastMessage, selectedRequest]);

  // Accept emergency request mutation
  const acceptRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const response = await apiRequest('PATCH', `/api/emergency/request/${requestId}`, {
        status: 'accepted',
        ambulanceId: ambulanceProfile?.id
      });
      return response.json();
    },
    onSuccess: (updatedRequest) => {
      console.log('✅ Request accepted successfully:', updatedRequest);
      // Store the accepted request immediately to prevent it from vanishing
      setSelectedRequest(updatedRequest);
      setJourneyActive(true);
      console.log('🎯 Set selectedRequest and journeyActive=true for request:', updatedRequest.id);
      // Delay query invalidation to prevent interference with navigation
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/emergency/requests'] });
      }, 2000);
    },
    onError: (error) => {
      console.error('Failed to accept request:', error);
      // Check if it's a conflict error (request already taken)
      if (error.message.includes('409') || error.message.includes('already assigned')) {
        // Reset state and show user that request is no longer available
        setSelectedRequest(null);
        setJourneyActive(false);
        // Force a refresh to get updated request list
        queryClient.invalidateQueries({ queryKey: ['/api/emergency/requests'] });
      } else {
        // Other errors - reset state but keep trying
        setSelectedRequest(null);
        setJourneyActive(false);
      }
    }
  });

  // Update request status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ requestId, status, data }: { requestId: number, status: string, data?: any }) => {
      const response = await apiRequest('PATCH', `/api/emergency/request/${requestId}`, {
        status,
        ...data
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/emergency/requests'] });
    },
  });

  // Update ambulance location
  const updateLocationMutation = useMutation({
    mutationFn: async (locationData: { latitude: number, longitude: number }) => {
      const response = await apiRequest('PATCH', `/api/ambulance/${ambulanceProfile?.id}/location`, locationData);
      return response.json();
    },
  });

  // Auto-update location every 30 seconds when ambulance is active
  useEffect(() => {
    if (location && ambulanceProfile?.id && ambulanceProfile?.isActive) {
      // Update location immediately when component loads
      updateLocationMutation.mutate({
        latitude: location.latitude,
        longitude: location.longitude
      });
      
      // Then update every 30 seconds
      const interval = setInterval(() => {
        updateLocationMutation.mutate({
          latitude: location.latitude,
          longitude: location.longitude
        });
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [location, ambulanceProfile?.id, ambulanceProfile?.isActive]);

  const handleAcceptRequest = (request: any) => {
    console.log('Accepting request:', { 
      requestId: request.id, 
      ambulanceId: ambulanceProfile?.id,
      userProfile: ambulanceProfile 
    });
    // Immediately set the request to prevent race conditions
    setSelectedRequest(request);
    // Start the acceptance process
    acceptRequestMutation.mutate(request.id);
  };

  const handleStatusUpdate = (status: string, additionalData?: any) => {
    if (activeRequest) {
      updateStatusMutation.mutate({
        requestId: activeRequest.id,
        status,
        data: additionalData
      });
    }
  };

  const handleJourneyStart = () => {
    setJourneyActive(true);
    // Manual status update only when user clicks
    if (activeRequest) {
      updateStatusMutation.mutate({
        requestId: activeRequest.id,
        status: 'en_route',
        data: {}
      });
    }
  };

  const handleJourneyComplete = () => {
    setJourneyActive(false);
    setSelectedRequest(null);
    setCurrentETA(null);
    handleStatusUpdate('completed');
    // Refresh the request list to get new pending requests
    queryClient.invalidateQueries({ queryKey: ['/api/emergency/requests'] });
  };

  const handleJourneyUpdate = (eta: number, distance: number) => {
    setCurrentETA(eta);
    // Simple local state update only - no broadcasting
  };

  const getStatusColor = (status: string) => {
    const colors: {[key: string]: string} = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'accepted': 'bg-blue-100 text-blue-800',
      'dispatched': 'bg-purple-100 text-purple-800',
      'en_route': 'bg-indigo-100 text-indigo-800',
      'at_scene': 'bg-orange-100 text-orange-800',
      'transporting': 'bg-cyan-100 text-cyan-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'high': return <Zap className="h-4 w-4 text-orange-600" />;
      case 'medium': return <Activity className="h-4 w-4 text-yellow-600" />;
      default: return <Heart className="h-4 w-4 text-green-600" />;
    }
  };

  const getEquipmentLevel = () => {
    if (!ambulanceProfile) return 'Basic';
    return ambulanceProfile.equipmentLevel || 'Basic Life Support';
  };

  if (!user || !ambulanceProfile) {
    return <div className="flex items-center justify-center h-screen">Loading ambulance profile...</div>;
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6">
      {/* Enhanced Header with Ambulance Info */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8 space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Ambulance Dashboard</h1>
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mt-2 space-y-2 sm:space-y-0">
            <p className="text-sm sm:text-base text-gray-600">Vehicle: {ambulanceProfile?.vehicleNumber || 'Unknown'}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-blue-100 text-blue-800 text-xs sm:text-sm">
                <Shield className="h-3 w-3 mr-1" />
                {getEquipmentLevel()}
              </Badge>
              <Badge className={`text-xs sm:text-sm ${(ambulanceProfile?.isActive) ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                {(ambulanceProfile?.isActive) ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
          <Badge className={`text-xs sm:text-sm ${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
          <NotificationSystem userRole="ambulance" userId={user?.id || 0} />
        </div>
      </div>

      {/* Active Request Alert */}
      {activeRequest && (
        <Alert className="border-l-4 border-l-blue-500 bg-blue-50">
          <NavigationIcon className="h-4 w-4" />
          <AlertDescription>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
              <div className="flex-1">
                <strong>Active Emergency</strong> - {(activeRequest.type || 'general_emergency').replace('_', ' ')} 
                <span className="ml-2">Status: {(activeRequest.status || 'pending').replace('_', ' ').toUpperCase()}</span>
                {currentETA && <span className="ml-2 font-medium">ETA: {currentETA} min</span>}
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                {(activeRequest.status || 'pending') === 'accepted' && (
                  <Button size="sm" onClick={handleJourneyStart} className="w-full sm:w-auto">
                    Start Journey
                  </Button>
                )}
                {(activeRequest.status || 'pending') === 'en_route' && (
                  <Button size="sm" onClick={() => handleStatusUpdate('at_scene')} className="w-full sm:w-auto">
                    Arrived at Scene
                  </Button>
                )}
                {(activeRequest.status || 'pending') === 'at_scene' && (
                  <Button size="sm" onClick={() => handleStatusUpdate('transporting')} className="w-full sm:w-auto">
                    Transporting Patient
                  </Button>
                )}
                {(activeRequest.status || 'pending') === 'transporting' && (
                  <Button size="sm" onClick={() => handleStatusUpdate('completed')} className="w-full sm:w-auto">
                    Complete Request
                  </Button>
                )}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Current Location Map */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
            <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Current Location</span>
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Your ambulance location and nearby area
          </CardDescription>
          {location && (
            <div className="text-xs sm:text-sm text-gray-600 mt-2 space-y-1">
              <div>Latitude: {location.latitude.toFixed(6)}</div>
              <div>Longitude: {location.longitude.toFixed(6)}</div>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <LocationMap 
            title="Ambulance Current Location"
            height="250px"
            showRefreshButton={true}
            showCurrentAmbulance={true}
            currentAmbulanceId={(() => {
              console.log('🚑 Enhanced ambulance dashboard - profile:', ambulanceProfile);
              console.log('🚑 Ambulance profile ID:', ambulanceProfile?.id);
              return ambulanceProfile?.id;
            })()}
            showAllAmbulances={false}
            patientLocation={activeRequest ? {
              latitude: parseFloat(activeRequest.latitude || '0'),
              longitude: parseFloat(activeRequest.longitude || '0')
            } : undefined}
          />
        </CardContent>
      </Card>

      {/* Statistics Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Card>
          <CardContent className="p-4 sm:pt-6 sm:px-6 sm:pb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Pending Requests</p>
                <p className="text-2xl sm:text-3xl font-bold text-blue-600">{pendingRequests.length}</p>
              </div>
              <Timer className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 sm:pt-6 sm:px-6 sm:pb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Completed Today</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-600">{emergencyRequests.filter((r: any) => (r.status || 'pending') === 'completed').length}</p>
              </div>
              <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 sm:pt-6 sm:px-6 sm:pb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Hospital</p>
                <p className="text-sm sm:text-lg font-semibold text-gray-900">{ambulanceProfile?.hospitalAffiliation || 'N/A'}</p>
              </div>
              <Truck className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 sm:pt-6 sm:px-6 sm:pb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Current Status</p>
                <p className="text-sm sm:text-lg font-semibold text-gray-900">
                  {activeRequest ? (activeRequest.status || 'pending').replace('_', ' ') : 'Available'}
                </p>
              </div>
              <Gauge className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Map for Active Request */}
      {activeRequest && location && (
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
              <NavigationIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-sm sm:text-base">Navigation to Emergency (Request #{activeRequest.id})</span>
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Navigate to patient location: {activeRequest.address || 'Location not provided'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <NavigationMap
              ambulanceLocation={location}
              patientLocation={{
                latitude: parseFloat(activeRequest.latitude || '0'),
                longitude: parseFloat(activeRequest.longitude || '0')
              }}
              onStartJourney={handleJourneyStart}
              onJourneyUpdate={handleJourneyUpdate}
              isJourneyActive={journeyActive}
            />
          </CardContent>
        </Card>
      )}

      {/* Pending Emergency Requests */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex flex-wrap items-center gap-2 text-lg sm:text-xl">
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Pending Emergency Requests</span>
            {pendingRequests.length > 0 && (
              <Badge className="bg-red-100 text-red-800 text-xs sm:text-sm">{pendingRequests.length}</Badge>
            )}
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Emergency requests waiting for ambulance assignment
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {pendingRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No pending emergency requests</p>
              <p className="text-sm">You'll be notified when new requests come in</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request: any) => (
                <Card key={request.id} className={`border-l-4 ${
                  request.priority === 'critical' ? 'border-l-red-500' : 
                  request.priority === 'high' ? 'border-l-orange-500' : 
                  'border-l-yellow-500'
                }`}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-3">
                          {getPriorityIcon(request.priority)}
                          <Badge className={getStatusColor(request.status)}>
                            {request.status.toUpperCase()}
                          </Badge>
                          <Badge className={`${
                            request.priority === 'critical' ? 'bg-red-100 text-red-800' :
                            request.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {request.priority.toUpperCase()} PRIORITY
                          </Badge>
                        </div>
                        
                        <h4 className="font-semibold text-lg mb-2">
                          {request.type ? request.type.replace('_', ' ').toUpperCase() : 'Emergency Request'}
                        </h4>
                        
                        <p className="text-gray-600 mb-3">{request.description}</p>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {formatDistanceToNow(new Date(request.createdAt))} ago
                          </span>
                          <span className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {request.address || 'Location provided'}
                          </span>
                          <span className="flex items-center">
                            <User className="h-4 w-4 mr-1" />
                            Patient ID: {request.patientId}
                          </span>
                          {request.patientChosenHospitalId && (
                            <span className="flex items-center">
                              <Target className="h-4 w-4 mr-1" />
                              Preferred Hospital: {request.patientChosenHospitalId}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 ml-4">
                        <Button
                          onClick={() => handleAcceptRequest(request)}
                          disabled={acceptRequestMutation.isPending || !!activeRequest}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Accept
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Recent Activity</span>
          </CardTitle>
          <CardDescription>
            Your recent emergency response activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          {emergencyRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <RotateCcw className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3">
              {emergencyRequests.slice(0, 5).map((request: any) => (
                <div key={request.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center space-x-3">
                    {getPriorityIcon(request.priority)}
                    <div>
                      <p className="font-medium">
                        {request.type ? request.type.replace('_', ' ').toUpperCase() : 'Emergency'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(request.createdAt))} ago
                      </p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(request.status)}>
                    {request.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Equipment Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Vehicle Equipment</span>
          </CardTitle>
          <CardDescription>
            Medical equipment available on {ambulanceProfile.vehicleNumber}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {ambulanceProfile.equipmentLevel === 'Advanced Life Support' && (
              <>
                <div className="flex items-center space-x-2 p-2 bg-green-50 rounded">
                  <Heart className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Defibrillator</span>
                </div>
                <div className="flex items-center space-x-2 p-2 bg-green-50 rounded">
                  <Activity className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Cardiac Monitor</span>
                </div>
                <div className="flex items-center space-x-2 p-2 bg-green-50 rounded">
                  <Zap className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Advanced Airways</span>
                </div>
              </>
            )}
            <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="text-sm">Basic Life Support</span>
            </div>
            <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-sm">Stretcher</span>
            </div>
            <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded">
              <Timer className="h-4 w-4 text-blue-600" />
              <span className="text-sm">Oxygen Supply</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}