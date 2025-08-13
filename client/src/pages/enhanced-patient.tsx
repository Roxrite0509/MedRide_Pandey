import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useGeolocation } from '@/hooks/use-geolocation';
import { useSocket } from '@/hooks/use-socket-simple';
import { NotificationSystem } from '@/components/notification-system';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LocationMap } from '@/components/LocationMap';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { MapPin, Clock, Phone, Bed, AlertCircle, Activity, Heart, Ambulance, Hospital, CheckCircle, X, Star, Users, Timer, Shield } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export default function EnhancedPatientDashboard() {
  const { user } = useAuth();
  const { location, error: locationError } = useGeolocation();
  const { isConnected, socket, lastMessage } = useSocket();
  
  // Helper function to get hospital name by ID
  const getHospitalName = (hospitalId: number): string => {
    const hospitalNames: { [key: number]: string } = {
      2: 'Apollo Hospital Indore',
      3: 'CARE CHL Hospital Indore', 
      4: 'Bombay Hospital Indore',
      5: 'Vishesh Jupiter Hospital'
    };
    return hospitalNames[hospitalId] || `Hospital #${hospitalId}`;
  };
  
  // Enhanced state management
  const [isEmergencyDialogOpen, setIsEmergencyDialogOpen] = useState(false);
  const [emergencyType, setEmergencyType] = useState('');
  const [emergencyDescription, setEmergencyDescription] = useState('');
  const [selectedHospital, setSelectedHospital] = useState('');
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [ambulanceETA, setAmbulanceETA] = useState<{[key: number]: number}>({});
  const [showHospitalComparison, setShowHospitalComparison] = useState(false);

  // Optimized parallel data loading
  const hospitalsQuery = useQuery({
    queryKey: ['/api/hospitals/nearby', location?.latitude, location?.longitude],
    enabled: !!location,
    staleTime: 15 * 60 * 1000, // Cache hospitals for 15 minutes
    cacheTime: 60 * 60 * 1000, // Keep in memory for 1 hour
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const emergencyRequestsQuery = useQuery({
    queryKey: ['/api/emergency/requests'],
    enabled: !!user?.id,
    refetchInterval: 30000, // Reduced to 30 seconds for better performance
    refetchIntervalInBackground: false,
    staleTime: 10 * 1000, // Consider data fresh for 10 seconds
    cacheTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });

  const hospitals = hospitalsQuery.data || [];
  const emergencyRequests = emergencyRequestsQuery.data || [];
  
  // Show loading state
  const isLoading = hospitalsQuery.isLoading || emergencyRequestsQuery.isLoading;
  
  // Debugging can be enabled by uncommenting the line below
  // console.log('🔍 Emergency requests loaded:', emergencyRequests.length);
  
  // Debug ambulance data when requests have ambulances assigned
  useEffect(() => {
    if (emergencyRequests.length > 0) {
      emergencyRequests.forEach((req: any) => {
        if (req.ambulanceId && req.ambulance) {
          console.log('🚑 Debug ambulance data for request', req.id, ':', {
            ambulanceId: req.ambulanceId,
            vehicleNumber: req.ambulance?.vehicleNumber,
            operatorPhone: req.ambulance?.operatorPhone,
            ambulanceContact: req.ambulanceContact,
            certification: req.ambulance?.certification,
            status: req.status
          });
        }
      });
    }
  }, [emergencyRequests]);
  
  const activeRequest = emergencyRequests.find((req: any) => 
    ['pending', 'accepted', 'dispatched', 'en_route'].includes(req.status)
  );

  // WebSocket listener for real-time updates
  useEffect(() => {
    if (lastMessage?.type === 'eta_update' && lastMessage?.data?.requestId) {
      setAmbulanceETA(prev => ({
        ...prev,
        [lastMessage.data.requestId]: lastMessage.data.eta
      }));
    }
  }, [lastMessage]);

  // Enhanced emergency request mutation
  const emergencyMutation = useMutation({
    mutationFn: async (requestData: any) => {
      const response = await apiRequest('POST', '/api/emergency/request', requestData);
      return response.json();
    },
    onSuccess: () => {
      setIsEmergencyDialogOpen(false);
      setEmergencyType('');
      setEmergencyDescription('');
      setSelectedHospital('');
      queryClient.invalidateQueries({ queryKey: ['/api/emergency/requests'] });
    },
  });

  // Cancel request mutation
  const cancelMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const response = await apiRequest('PATCH', `/api/emergency/request/${requestId}`, { 
        status: 'cancelled' 
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/emergency/requests'] });
    },
  });

  // Delete request mutation
  const deleteMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const response = await apiRequest('DELETE', `/api/emergency/request/${requestId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/emergency/requests'] });
    },
  });

  const handleEmergencySubmit = async () => {
    if (!emergencyType || !emergencyDescription || !location) return;

    await emergencyMutation.mutateAsync({
      type: emergencyType,
      description: emergencyDescription,
      priority: getEmergencyPriority(emergencyType),
      latitude: location.latitude,
      longitude: location.longitude,
      patientChosenHospitalId: selectedHospital ? parseInt(selectedHospital) : null,
    });
  };

  const getEmergencyPriority = (type: string) => {
    const priorities: {[key: string]: string} = {
      'cardiac_arrest': 'critical',
      'stroke': 'critical', 
      'severe_trauma': 'critical',
      'breathing_difficulty': 'high',
      'chest_pain': 'high',
      'severe_bleeding': 'high',
      'accident': 'medium',
      'general_emergency': 'medium'
    };
    return priorities[type] || 'medium';
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

  const getPriorityColor = (priority: string) => {
    const colors: {[key: string]: string} = {
      'low': 'bg-green-100 text-green-800',
      'medium': 'bg-yellow-100 text-yellow-800', 
      'high': 'bg-orange-100 text-orange-800',
      'critical': 'bg-red-100 text-red-800',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const getBedStatusColor = (available: number, total: number) => {
    const percentage = (available / total) * 100;
    if (percentage > 50) return 'text-green-600';
    if (percentage > 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getETAtoHospital = (hospital: any) => {
    if (!location) return null;
    
    // Calculate distance-based ETA (rough estimate)
    const distance = Math.sqrt(
      Math.pow(hospital.latitude - location.latitude, 2) + 
      Math.pow(hospital.longitude - location.longitude, 2)
    ) * 111000; // Convert to meters
    
    const avgSpeed = 30; // 30 km/h average speed in city
    return Math.round((distance / 1000) / avgSpeed * 60); // ETA in minutes
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Show loading skeleton for better UX
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex space-x-4">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-6" />
          </div>
        </div>

        {/* Emergency Card Skeleton */}
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>

        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg border p-6 space-y-4">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6">
      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8 space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Patient Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600">Welcome back, {user?.name || user?.username || 'Patient'}</p>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
          <Badge className={`text-xs sm:text-sm ${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
          <NotificationSystem userRole="patient" userId={user?.id || 0} />
        </div>
      </div>

      {/* Emergency Status Banner */}
      {activeRequest && (
        <Alert className="border-l-4 border-l-red-500 bg-red-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
              <div className="flex-1">
                <strong>Active Emergency Request</strong> - Status: {(activeRequest.status || 'pending').replace('_', ' ').toUpperCase()}
                {ambulanceETA[activeRequest.id] && (
                  <span className="ml-2 font-medium">ETA: {ambulanceETA[activeRequest.id]} minutes</span>
                )}
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => cancelMutation.mutate(activeRequest.id)}
                disabled={cancelMutation.isPending}
                className="w-full sm:w-auto sm:ml-4"
              >
                Cancel Request
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Emergency Request */}
      <Card className="border-l-4 border-l-red-500">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center space-x-2 text-red-600 text-lg sm:text-xl">
            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Emergency Request</span>
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Request immediate medical assistance
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <Dialog open={isEmergencyDialogOpen} onOpenChange={setIsEmergencyDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="w-full bg-red-600 hover:bg-red-700 text-white py-4 sm:py-6 text-base sm:text-lg" 
                disabled={!!activeRequest}
              >
                <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
                Request Emergency Assistance
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">Emergency Request Details</DialogTitle>
                <DialogDescription className="text-sm sm:text-base">
                  Please provide information about your emergency
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 p-1">
                <div>
                  <Label htmlFor="emergency-type" className="text-sm sm:text-base">Emergency Type</Label>
                  <Select value={emergencyType || ""} onValueChange={setEmergencyType}>
                    <SelectTrigger className="h-10 sm:h-12">
                      <SelectValue placeholder="Select emergency type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cardiac_arrest">Cardiac Arrest</SelectItem>
                      <SelectItem value="stroke">Stroke</SelectItem>
                      <SelectItem value="severe_trauma">Severe Trauma</SelectItem>
                      <SelectItem value="breathing_difficulty">Breathing Difficulty</SelectItem>
                      <SelectItem value="chest_pain">Chest Pain</SelectItem>
                      <SelectItem value="severe_bleeding">Severe Bleeding</SelectItem>
                      <SelectItem value="accident">Accident</SelectItem>
                      <SelectItem value="general_emergency">General Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="description" className="text-sm sm:text-base">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the emergency situation..."
                    value={emergencyDescription || ""}
                    onChange={(e) => setEmergencyDescription(e.target.value)}
                    className="min-h-[80px] sm:min-h-[100px] text-sm sm:text-base"
                  />
                </div>

                {/* Hospital Selection with Enhanced Details */}
                <div>
                  <div className="flex justify-between items-center">
                    <Label>Preferred Hospital (Optional)</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowHospitalComparison(!showHospitalComparison)}
                    >
                      Compare Hospitals
                    </Button>
                  </div>
                  
                  {showHospitalComparison && (
                    <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                      {hospitals.map((hospital: any) => (
                        <div 
                          key={hospital.id} 
                          className={`p-3 border rounded cursor-pointer transition-colors ${
                            selectedHospital === hospital.id.toString() 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                          onClick={() => setSelectedHospital(hospital.id.toString())}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-medium">{hospital.name}</h4>
                              <p className="text-sm text-gray-600">{hospital.address}</p>
                              <div className="flex items-center space-x-4 mt-2 text-xs">
                                <span className={`flex items-center ${getBedStatusColor(hospital.availableBeds, hospital.totalBeds)}`}>
                                  <Bed className="h-3 w-3 mr-1" />
                                  {hospital.availableBeds}/{hospital.totalBeds} beds
                                </span>
                                <span className="flex items-center text-gray-500">
                                  <Timer className="h-3 w-3 mr-1" />
                                  ~{getETAtoHospital(hospital)} min
                                </span>
                                <Badge className={hospital.status === 'available' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                                  {hospital.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <Select value={selectedHospital} onValueChange={setSelectedHospital}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Choose hospital (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {hospitals.map((hospital: any) => (
                        <SelectItem key={hospital.id} value={hospital.id.toString()}>
                          {hospital.name} - {hospital.availableBeds}/{hospital.totalBeds} beds available
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsEmergencyDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleEmergencySubmit}
                    disabled={emergencyMutation.isPending || !emergencyType || !emergencyDescription}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {emergencyMutation.isPending ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Request History with Enhanced Details */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
            <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Emergency Request History</span>
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Track your emergency requests and their status
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {emergencyRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Heart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No emergency requests found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {emergencyRequests.map((request: any) => (
                <Card key={request.id} className={`border-l-4 ${
                  (request.priority || 'medium') === 'critical' ? 'border-l-red-500' : 
                  (request.priority || 'medium') === 'high' ? 'border-l-orange-500' : 
                  'border-l-blue-500'
                }`}>
                  <CardContent className="p-4 sm:pt-6 sm:px-6 sm:pb-6">
                    <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start space-y-4 lg:space-y-0">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <Badge className={getStatusColor(request.status || 'pending')}>
                            {(request.status || 'pending').replace('_', ' ').toUpperCase()}
                          </Badge>
                          <Badge className={getPriorityColor(request.priority || 'medium')}>
                            {(request.priority || 'medium').toUpperCase()}
                          </Badge>
                          {ambulanceETA[request.id] && (
                            <Badge className="bg-blue-100 text-blue-800">
                              <Clock className="h-3 w-3 mr-1" />
                              ETA: {ambulanceETA[request.id]} min
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">{request.description || 'No description provided'}</p>
                        
                        {request.type && (
                          <p className="text-xs text-gray-500 mb-2">
                            <span className="font-medium">Type:</span> {(request.type || 'general').replace('_', ' ')}
                          </p>
                        )}
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-sm text-gray-500">
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {format(new Date(request.createdAt), 'MMM dd, yyyy HH:mm')}
                          </span>
                          {request.ambulanceId && (
                            <span className="flex items-center">
                              <Ambulance className="h-4 w-4 mr-1" />
                              {request.ambulance?.vehicleNumber || `Ambulance #${request.ambulanceId}`}
                            </span>
                          )}
                          {request.hospitalId && (
                            <span className="flex items-center">
                              <Hospital className="h-4 w-4 mr-1" />
                              {getHospitalName(request.hospitalId)}
                            </span>
                          )}
                          {request.status === 'completed' && request.assignedBedNumber && (
                            <span className="flex items-center text-green-700 font-medium">
                              <Bed className="h-4 w-4 mr-1" />
                              Assigned to Ward: {request.assignedBedNumber}
                            </span>
                          )}
                          {request.estimatedArrival && (
                            <span className="flex items-center">
                              <NavigationIcon className="h-4 w-4 mr-1" />
                              ETA: {request.estimatedArrival} min
                            </span>
                          )}
                        </div>

                        {/* Ambulance Contact Information - CRITICAL FIX */}
                        {request.ambulanceId && request.ambulance && ['accepted', 'dispatched', 'en_route', 'at_scene', 'transporting'].includes(request.status || 'pending') && (
                          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center text-blue-800 font-medium">
                                <Phone className="h-4 w-4 mr-2" />
                                <span>Ambulance Contact</span>
                              </div>
                              <Badge className="bg-blue-100 text-blue-800">
                                {request.ambulance.vehicleNumber || `AMB-${request.ambulanceId}`}
                              </Badge>
                            </div>
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center text-sm text-blue-700">
                                <Phone className="h-3 w-3 mr-2" />
                                <span className="font-medium">Operator: {request.ambulance?.operatorPhone || request.ambulanceContact || 'Contact being updated...'}</span>
                              </div>
                              <div className="flex items-center text-sm text-blue-600">
                                <Shield className="h-3 w-3 mr-2" />
                                <span>{request.ambulance.certification || 'Basic Life Support'}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Bed Assignment Information */}
                        {request.status === 'completed' && request.assignedBedNumber && (
                          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center text-green-800 font-medium">
                              <Bed className="h-4 w-4 mr-2" />
                              <span>Patient assigned to Ward: {request.assignedBedNumber}</span>
                            </div>
                            <div className="flex items-center text-blue-700 mt-1">
                              <Hospital className="h-4 w-4 mr-2" />
                              <span>Hospital: {getHospitalName(request.hospitalId)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 lg:ml-4">
                        {['pending', 'accepted', 'dispatched', 'en_route'].includes(request.status || 'pending') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => cancelMutation.mutate(request.id)}
                            disabled={cancelMutation.isPending}
                            className="text-orange-600 hover:text-orange-700 w-full sm:w-auto"
                          >
                            Cancel
                          </Button>
                        )}
                        {['completed', 'cancelled'].includes(request.status || 'pending') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteMutation.mutate(request.id)}
                            disabled={deleteMutation.isPending}
                            className="text-red-600 hover:text-red-700 w-full sm:w-auto"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Delete
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

      {/* Enhanced Location Map */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
            <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Emergency Services Map</span>
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            View your location, nearby hospitals, and ambulance positions
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <LocationMap 
            title="Emergency Services Near You"
            height="400px"
            showRefreshButton={true}
            showCurrentAmbulance={false}
            showAllAmbulances={true}
          />
        </CardContent>
      </Card>

      {/* Nearby Hospitals Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Hospital className="h-5 w-5" />
            <span>Nearby Hospitals</span>
          </CardTitle>
          <CardDescription>
            Find hospitals near your location with real-time availability
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hospitalsQuery.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="p-4 border rounded animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : hospitals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hospitals.map((hospital: any) => (
                <Card key={hospital.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold text-lg">{hospital.name}</h4>
                        <p className="text-sm text-gray-600 line-clamp-2">{hospital.address}</p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">General Beds</span>
                          <span className={`text-sm font-medium ${getBedStatusColor(hospital.availableBeds, hospital.totalBeds)}`}>
                            {hospital.availableBeds}/{hospital.totalBeds}
                          </span>
                        </div>
                        <Progress 
                          value={(hospital.availableBeds / hospital.totalBeds) * 100} 
                          className="h-2"
                        />
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">ICU Beds</span>
                          <span className={`text-sm font-medium ${getBedStatusColor(hospital.availableIcuBeds, hospital.icuBeds)}`}>
                            {hospital.availableIcuBeds}/{hospital.icuBeds}
                          </span>
                        </div>
                        <Progress 
                          value={(hospital.availableIcuBeds / hospital.icuBeds) * 100} 
                          className="h-2"
                        />
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <Badge className={hospital.status === 'available' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                          {hospital.status}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          ~{getETAtoHospital(hospital)} min away
                        </span>
                      </div>
                      
                      {hospital.phone && (
                        <Button variant="outline" size="sm" className="w-full">
                          <Phone className="h-4 w-4 mr-2" />
                          {hospital.phone}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Hospital className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No hospitals found nearby</p>
              <p className="text-sm">Try adjusting your location or check back later</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}