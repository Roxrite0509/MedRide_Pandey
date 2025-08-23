import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useGeolocation } from '@/hooks/use-geolocation';
import { useWebSocket } from '@/hooks/use-websocket';
import { NotificationSystem } from '@/components/notification-system';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LocationMap } from '@/components/LocationMap';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { MapPin, Clock, Phone, Bed, AlertCircle, Activity, Heart, Ambulance, Hospital, Navigation as NavigationIcon, Zap, Shield, CheckCircle, X } from 'lucide-react';
import { format } from 'date-fns';

export default function PatientDashboard() {
  const { user } = useAuth();
  const { location, error: locationError } = useGeolocation();
  const { isConnected, socket, lastMessage } = useWebSocket();
  const queryClient = useQueryClient();
  
  // State for emergency request dialog
  const [isEmergencyDialogOpen, setIsEmergencyDialogOpen] = useState(false);
  const [emergencyType, setEmergencyType] = useState('');
  const [emergencyDescription, setEmergencyDescription] = useState('');
  const [selectedHospital, setSelectedHospital] = useState('');
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [ambulanceETA, setAmbulanceETA] = useState<{[key: number]: number}>({});

  // Get nearby hospitals from our database with real-time bed updates
  const hospitalsQuery = useQuery({
    queryKey: ['/api/hospitals/nearby', location?.latitude, location?.longitude],
    enabled: !!location,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Listen for hospital bed updates via WebSocket
  useEffect(() => {
    if (lastMessage) {
      try {
        const data = typeof lastMessage === 'string' ? JSON.parse(lastMessage) : lastMessage;
        if (data.type === 'hospital_bed_update') {
          console.log('🏥 Received hospital bed update:', data.data);
          // Invalidate hospital queries to refresh bed data
          queryClient.invalidateQueries({ queryKey: ['/api/hospitals/nearby'] });
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    }
  }, [lastMessage, queryClient]);

  const emergencyRequestsQuery = useQuery({
    queryKey: ['/api/emergency/requests'],
    enabled: !!user?.id,
    refetchInterval: 5000, // Check every 5 seconds for real-time updates
  });

  const hospitals = Array.isArray(hospitalsQuery.data) ? hospitalsQuery.data : [];
  const emergencyRequests = Array.isArray(emergencyRequestsQuery.data) ? emergencyRequestsQuery.data : [];
  const hospitalsLoading = hospitalsQuery.isLoading;

  // Listen for real-time updates via Socket.IO
  useEffect(() => {
    if (!socket || !lastMessage) return;
    
    const { type, data } = lastMessage;
    console.log('⚡ Patient received WebSocket event:', type, data);
    
    switch (type) {
      case 'emergency_status_update':
        // Invalidate queries to get fresh data and force re-render
        queryClient.invalidateQueries({ queryKey: ['/api/emergency/requests'] });
        emergencyRequestsQuery.refetch();
        break;
      case 'ambulance_response':
        if (data.status === 'accepted') {
          setRequestSubmitted(false);
        } else if (data.status === 'rejected') {
          setRequestSubmitted(false);
        }
        // Invalidate queries to get fresh data
        queryClient.invalidateQueries({ queryKey: ['/api/emergency/requests'] });
        emergencyRequestsQuery.refetch();
        break;
      case 'eta_update':
        console.log('🎯 ETA update received on patient side:', data);
        console.log('🎯 Current requests in state:', emergencyRequests.map(r => ({ id: r.id, status: r.status })));
        if (data && data.requestId && typeof data.eta === 'number') {
          console.log('🎯 Processing ETA for request:', data.requestId, 'ETA:', data.eta);
          
          // Apply ETA to the exact request ID received (no forcing)
          setAmbulanceETA(prev => {
            const updated = { ...prev, [data.requestId]: data.eta };
            console.log('🎯 Updated ETA state:', updated);
            return updated;
          });
        } else {
          console.error('Invalid ETA data structure:', data);
        }
        break;
    }
  }, [lastMessage, socket, queryClient]);

  // Emergency request mutation
  const emergencyMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/emergency/request', data);
      return response.json();
    },
    onSuccess: (newRequest) => {
      setRequestSubmitted(true);
      setIsEmergencyDialogOpen(false);
      setEmergencyType('');
      setEmergencyDescription('');
      setSelectedHospital('');
      queryClient.invalidateQueries({ queryKey: ['/api/emergency/requests'] });
    },
    onError: (error) => {
      console.error('Error submitting emergency request:', error);
      setRequestSubmitted(false);
    },
  });

  // Delete emergency request mutation
  const deleteMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const response = await apiRequest('DELETE', `/api/emergency/request/${requestId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/emergency/requests'] });
    },
    onError: (error) => {
      console.error('Error deleting emergency request:', error);
    },
  });

  // Cancel emergency request mutation
  const cancelMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const response = await apiRequest('PATCH', `/api/emergency/requests/${requestId}/cancel`, {});
      return response.json();
    },
    onSuccess: (data, requestId) => {
      console.log('🚫 Successfully cancelled request:', requestId);
      // Force immediate invalidation and refetch
      queryClient.invalidateQueries({ queryKey: ['/api/emergency/requests'] });
      queryClient.refetchQueries({ queryKey: ['/api/emergency/requests'] });
    },
    onError: (error) => {
      console.error('Error cancelling emergency request:', error);
    },
  });

  const handleEmergencySubmit = async () => {
    if (!emergencyType || !emergencyDescription || !location) {
      return;
    }

    await emergencyMutation.mutateAsync({
      patientCondition: emergencyType,
      notes: emergencyDescription,
      priority: 'high',
      latitude: location.latitude,
      longitude: location.longitude,
      hospitalId: selectedHospital ? parseInt(selectedHospital) : null,
    });
  };

  const handleDeleteRequest = (requestId: number) => {
    deleteMutation.mutate(requestId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'dispatched':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'accepted':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

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

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Patient Dashboard</h1>
          <p className="text-gray-600">Emergency medical services at your fingertips</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
            isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          <NotificationSystem userRole="patient" userId={user.id} />
        </div>
      </div>

      {/* Emergency Request Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="h-6 w-6 text-red-500" />
            <span>Request Emergency Assistance</span>
          </CardTitle>
          <CardDescription>
            Submit an emergency request to get immediate medical assistance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={isEmergencyDialogOpen} onOpenChange={setIsEmergencyDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full bg-red-600 hover:bg-red-700 text-white" size="lg">
                <Zap className="h-5 w-5 mr-2" />
                Request Emergency Assistance
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Emergency Request</DialogTitle>
                <DialogDescription>
                  Please provide details about your emergency. Help is on the way.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="emergency-type">Emergency Type</Label>
                  <Select value={emergencyType} onValueChange={setEmergencyType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select emergency type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cardiac">Cardiac Emergency</SelectItem>
                      <SelectItem value="accident">Accident/Trauma</SelectItem>
                      <SelectItem value="respiratory">Breathing Problems</SelectItem>
                      <SelectItem value="stroke">Stroke</SelectItem>
                      <SelectItem value="diabetic">Diabetic Emergency</SelectItem>
                      <SelectItem value="allergic">Allergic Reaction</SelectItem>
                      <SelectItem value="other">Other Medical Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    value={emergencyDescription}
                    onChange={(e) => setEmergencyDescription(e.target.value)}
                    placeholder="Briefly describe the emergency situation..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="hospital">Preferred Hospital (Optional)</Label>
                  <Select value={selectedHospital} onValueChange={setSelectedHospital}>
                    <SelectTrigger>
                      <SelectValue placeholder="Auto-select nearest hospital" />
                    </SelectTrigger>
                    <SelectContent>
                      {hospitals.map((hospital: any) => (
                        <SelectItem key={hospital.id} value={hospital.id.toString()}>
                          {hospital.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleEmergencySubmit}
                  disabled={!emergencyType || !emergencyDescription || emergencyMutation.isPending}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  {emergencyMutation.isPending ? 'Submitting...' : 'Submit Emergency Request'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>



      {/* Emergency Requests History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Your Emergency Requests</span>
          </CardTitle>
          <CardDescription>
            Track the status of your emergency requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {emergencyRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Heart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No emergency requests found</p>
              <p className="text-sm">Your emergency requests will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {emergencyRequests.map((request: any) => (
                <Card key={request.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge className={getStatusColor(request.status)}>
                            {request.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <Badge className={getPriorityColor(request.priority)}>
                            {request.priority.toUpperCase()}
                          </Badge>
                          {ambulanceETA[request.id] && (
                            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                              <Clock className="h-3 w-3 mr-1" />
                              ETA: {ambulanceETA[request.id]} min
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{request.notes || request.description || 'No description provided'}</p>
                        {request.patientCondition && (
                          <p className="text-xs text-gray-500 mb-2">
                            <span className="font-medium">Type:</span> {formatEmergencyType(request.patientCondition)}
                          </p>
                        )}
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {format(new Date(request.createdAt), 'MMM dd, yyyy HH:mm')}
                          </span>
                          {request.ambulanceId && (
                            <span className="flex items-center">
                              <Ambulance className="h-4 w-4 mr-1" />
                              Ambulance #{request.ambulanceId}
                            </span>
                          )}
                          {request.hospitalId && (
                            <span className="flex items-center">
                              <Hospital className="h-4 w-4 mr-1" />
                              Hospital #{request.hospitalId}
                            </span>
                          )}
                        </div>
                        {/* Show ambulance operator contact when ambulance is assigned */}
                        {request.ambulance?.operatorPhone && (request.status === 'accepted' || request.status === 'dispatched' || request.status === 'en_route') && (
                          <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                            <div className="flex items-center space-x-2 text-sm text-blue-700">
                              <Phone className="h-4 w-4" />
                              <span className="font-medium">Ambulance Contact:</span>
                              <span>{request.ambulance.operatorPhone}</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-2 ml-4">
                        {/* Allow cancellation for pending, dispatched, and en_route statuses */}
                        {(['pending', 'dispatched', 'en_route'].includes(request.status)) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => cancelMutation.mutate(request.id)}
                            disabled={cancelMutation.isPending}
                            className="text-orange-600 hover:text-orange-700"
                          >
                            Cancel
                          </Button>
                        )}
                        {/* Allow deletion for completed or cancelled requests */}
                        {(['completed', 'cancelled'].includes(request.status)) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteRequest(request.id)}
                            disabled={deleteMutation.isPending}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Location & Ambulances Map */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5" />
            <span>Emergency Services Near You</span>
          </CardTitle>
          <CardDescription>
            Your location and nearby ambulances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LocationMap 
            title="Your Location & Nearby Ambulances"
            height="400px"
            showRefreshButton={true}
            showCurrentAmbulance={false}
            showAllAmbulances={true}
          />
        </CardContent>
      </Card>

      {/* Nearby Hospitals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Hospital className="h-5 w-5" />
            <span>Nearby Hospitals</span>
          </CardTitle>
          <CardDescription>
            Medical facilities in your area
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hospitalsLoading ? (
            <div className="text-center py-4">Loading nearby hospitals...</div>
          ) : hospitals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Hospital className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No hospitals found in your area</p>
              <p className="text-sm">Please enable location services</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {hospitals.map((hospital: any) => (
                <Card key={hospital.id} className="border">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold">{hospital.name}</h3>
                      <Badge className={
                        hospital.status === 'available' ? 'bg-green-100 text-green-800' :
                        hospital.status === 'busy' ? 'bg-yellow-100 text-yellow-800' :
                        hospital.status === 'full' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }>
                        {hospital.status ? hospital.status.toUpperCase() : 'ACTIVE'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{hospital.address}</p>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center">
                          <Bed className="h-4 w-4 mr-1" />
                          {hospital.availableBeds || 0}/{hospital.totalBeds || 0} beds
                        </span>
                        <span className="flex items-center">
                          <Shield className="h-4 w-4 mr-1" />
                          {hospital.availableIcuBeds || 0}/{hospital.icuBeds || 0} ICU
                        </span>
                      </div>
                      <span className="flex items-center">
                        <Phone className="h-4 w-4 mr-1" />
                        {hospital.phone || 'N/A'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}