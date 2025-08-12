import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useWebSocket } from '@/hooks/use-websocket';
import { NotificationSystem } from '@/components/notification-system';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HospitalBedLayout } from '@/components/hospital-bed-layout';
import { ResourceAllocation } from '@/components/resource-allocation';
import { AmbulanceTracker } from '@/components/ambulance-tracker';
import { HospitalCommunication } from '@/components/hospital-communication';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Hospital, Bed, Users, Activity, AlertTriangle, 
  CheckCircle, X, Clock, MapPin, Phone, Car, 
  Shield, Heart, Zap, Target, UserCheck, UserPlus,
  Calendar, TrendingUp, BarChart3
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

export default function EnhancedHospitalDashboard() {
  const { user } = useAuth();
  const { isConnected, socket, lastMessage } = useWebSocket();
  
  // Enhanced state management
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [bedUpdateDialog, setBedUpdateDialog] = useState(false);
  const [selectedBed, setSelectedBed] = useState<any>(null);
  const [bedStatus, setBedStatus] = useState('');
  const [bedAssignmentDialog, setBedAssignmentDialog] = useState(false);
  const [selectedPatientForBed, setSelectedPatientForBed] = useState<any>(null);
  const [selectedBedForAssignment, setSelectedBedForAssignment] = useState('');
  const [hospitalStats, setHospitalStats] = useState({
    totalPatients: 0,
    availableBeds: 0,
    occupancyRate: 0,
    incomingAmbulances: 0
  });

  // Get hospital profile with enhanced details
  const hospitalProfileQuery = useQuery({
    queryKey: ['/api/auth/user'],
    enabled: !!user?.id,
  });

  // Get emergency requests for this hospital
  const emergencyRequestsQuery = useQuery({
    queryKey: ['/api/emergency/requests'],
    enabled: !!user?.id,
    refetchInterval: 3000,
  });

  // Get hospital-specific statistics
  const hospitalStatsQuery = useQuery({
    queryKey: ['/api/hospital/stats', user?.id],
    enabled: !!user?.id,
  });

  // Get incoming ambulances
  const ambulancesQuery = useQuery({
    queryKey: ['/api/ambulances/incoming'],
    enabled: !!user?.id,
    refetchInterval: 5000,
  });

  const hospitalProfile = hospitalProfileQuery.data?.hospitalProfile;
  const emergencyRequests = emergencyRequestsQuery.data || [];
  const incomingRequests = emergencyRequests.filter((req: any) => 
    ['dispatched', 'en_route', 'at_scene'].includes(req.status) && req.hospitalId === hospitalProfile?.id
  );
  const pendingRequests = emergencyRequests.filter((req: any) => 
    req.status === 'pending' || (req.status === 'accepted' && !req.hospitalId)
  );

  // WebSocket listener for real-time updates
  useEffect(() => {
    if (lastMessage?.type === 'new_emergency_request') {
      queryClient.invalidateQueries({ queryKey: ['/api/emergency/requests'] });
    }
    if (lastMessage?.type === 'ambulance_update') {
      queryClient.invalidateQueries({ queryKey: ['/api/ambulances/incoming'] });
    }
    if (lastMessage?.type === 'bed_update') {
      queryClient.invalidateQueries({ queryKey: ['/api/hospital/stats'] });
    }
  }, [lastMessage]);

  // Accept emergency request mutation
  const acceptRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const response = await apiRequest('PATCH', `/api/emergency/request/${requestId}`, {
        hospitalId: hospitalProfile?.id,
        status: 'dispatched'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/emergency/requests'] });
    },
  });

  // Cancel/reject request mutation
  const cancelRequestMutation = useMutation({
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

  // Update bed status mutation
  const updateBedMutation = useMutation({
    mutationFn: async ({ bedId, status, patientId }: { bedId: string, status: string, patientId?: number }) => {
      const response = await apiRequest('POST', '/api/hospital/bed-status', {
        hospitalId: hospitalProfile?.id,
        bedNumber: bedId,
        bedType: 'general', // You might want to make this dynamic
        status,
        patientId
      });
      return response.json();
    },
    onSuccess: () => {
      setBedUpdateDialog(false);
      setSelectedBed(null);
      queryClient.invalidateQueries({ queryKey: ['/api/hospital/stats'] });
    },
  });

  // Assign patient to bed mutation
  const assignBedMutation = useMutation({
    mutationFn: async ({ emergencyRequestId, bedNumber }: { emergencyRequestId: number, bedNumber: string }) => {
      const response = await apiRequest('POST', '/api/emergency/assign-bed', {
        emergencyRequestId,
        bedNumber
      });
      return response.json();
    },
    onSuccess: () => {
      setBedAssignmentDialog(false);
      setSelectedPatientForBed(null);
      setSelectedBedForAssignment('');
      queryClient.invalidateQueries({ queryKey: ['/api/emergency/requests'] });
      queryClient.invalidateQueries({ queryKey: [`/api/hospitals/${user?.id}/bed-status`] });
    },
  });

  const handleAcceptRequest = (request: any) => {
    acceptRequestMutation.mutate(request.id);
  };

  const handleCancelRequest = (request: any) => {
    cancelRequestMutation.mutate(request.id);
  };

  const handleBedUpdate = (bedId: string, status: string) => {
    setSelectedBed({ id: bedId, status });
    setBedStatus(status);
    setBedUpdateDialog(true);
  };

  const handleBedStatusSubmit = () => {
    if (selectedBed) {
      updateBedMutation.mutate({
        bedId: selectedBed.id,
        status: bedStatus,
        patientId: bedStatus === 'occupied' ? 1 : undefined // You might want to collect actual patient ID
      });
    }
  };

  const handleAssignPatientToBed = (request: any) => {
    setSelectedPatientForBed(request);
    setBedAssignmentDialog(true);
  };

  const handleBedAssignmentSubmit = () => {
    if (selectedPatientForBed && selectedBedForAssignment) {
      assignBedMutation.mutate({
        emergencyRequestId: selectedPatientForBed.id,
        bedNumber: selectedBedForAssignment
      });
    }
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

  const getBedOccupancyRate = () => {
    if (!hospitalProfile) return 0;
    const total = hospitalProfile.totalBeds || 0;
    const available = hospitalProfile.availableBeds || 0;
    return total > 0 ? ((total - available) / total) * 100 : 0;
  };

  const getICUOccupancyRate = () => {
    if (!hospitalProfile) return 0;
    const total = hospitalProfile.icuBeds || 0;
    const available = hospitalProfile.availableIcuBeds || 0;
    return total > 0 ? ((total - available) / total) * 100 : 0;
  };

  if (!user || !hospitalProfile) {
    return <div className="flex items-center justify-center h-screen">Loading hospital dashboard...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Enhanced Header with Hospital Info */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Hospital Dashboard</h1>
          <div className="flex items-center space-x-4 mt-2">
            <p className="text-gray-600">{hospitalProfile.name}</p>
            <Badge className={hospitalProfile.status === 'available' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
              {hospitalProfile.status?.toUpperCase() || 'ACTIVE'}
            </Badge>
            <span className="text-sm text-gray-500">{hospitalProfile.address}</span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Badge className={`${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
          <NotificationSystem userRole="hospital" userId={user.id} />
        </div>
      </div>

      {/* Quick Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Available Beds</p>
                <p className="text-3xl font-bold text-green-600">{hospitalProfile.availableBeds || 0}</p>
                <p className="text-xs text-gray-500">of {hospitalProfile.totalBeds || 0} total</p>
              </div>
              <Bed className="h-8 w-8 text-green-600" />
            </div>
            <Progress value={100 - getBedOccupancyRate()} className="mt-2 h-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">ICU Beds</p>
                <p className="text-3xl font-bold text-blue-600">{hospitalProfile.availableIcuBeds || 0}</p>
                <p className="text-xs text-gray-500">of {hospitalProfile.icuBeds || 0} total</p>
              </div>
              <Heart className="h-8 w-8 text-blue-600" />
            </div>
            <Progress value={100 - getICUOccupancyRate()} className="mt-2 h-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Incoming Ambulances</p>
                <p className="text-3xl font-bold text-purple-600">{incomingRequests.length}</p>
              </div>
              <Car className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                <p className="text-3xl font-bold text-orange-600">{pendingRequests.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="beds">Bed Management</TabsTrigger>
          <TabsTrigger value="ambulances">Ambulances</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Pending Emergency Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5" />
                <span>Pending Emergency Requests</span>
                {pendingRequests.length > 0 && (
                  <Badge className="bg-red-100 text-red-800">{pendingRequests.length}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Emergency requests awaiting hospital assignment
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No pending emergency requests</p>
                  <p className="text-sm">All current requests have been assigned</p>
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
                                <UserCheck className="h-4 w-4 mr-1" />
                                Patient ID: {request.patientId}
                              </span>
                              {request.ambulanceId && (
                                <span className="flex items-center">
                                  <Car className="h-4 w-4 mr-1" />
                                  Ambulance #{request.ambulanceId}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex space-x-2 ml-4">
                            <Button
                              onClick={() => handleAcceptRequest(request)}
                              disabled={acceptRequestMutation.isPending}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Accept
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleCancelRequest(request)}
                              disabled={cancelRequestMutation.isPending}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Reject
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

          {/* Incoming Ambulances */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Car className="h-5 w-5" />
                <span>Incoming Ambulances</span>
                {incomingRequests.length > 0 && (
                  <Badge className="bg-blue-100 text-blue-800">{incomingRequests.length}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Ambulances en route to your hospital
              </CardDescription>
            </CardHeader>
            <CardContent>
              {incomingRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No incoming ambulances</p>
                  <p className="text-sm">All clear at the moment</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {incomingRequests.map((request: any) => (
                    <div key={request.id} className="flex items-center justify-between p-4 border rounded">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Car className="h-5 w-5 text-blue-600" />
                          <span className="font-medium">Ambulance #{request.ambulanceId}</span>
                        </div>
                        <div>
                          <p className="font-medium">
                            {request.type ? request.type.replace('_', ' ').toUpperCase() : 'Emergency'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDistanceToNow(new Date(request.createdAt))} ago
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(request.status)}>
                          {request.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                        {request.estimatedArrival && (
                          <Badge className="bg-blue-100 text-blue-800">
                            ETA: {request.estimatedArrival} min
                          </Badge>
                        )}
                        {request.status === 'transporting' && !request.assignedBedNumber && (
                          <Button
                            size="sm"
                            onClick={() => handleAssignPatientToBed(request)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            Assign Bed
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bed Management Tab */}
        <TabsContent value="beds">
          <HospitalBedLayout 
            hospitalId={hospitalProfile.id} 
            onBedUpdate={handleBedUpdate}
          />
        </TabsContent>

        {/* Ambulances Tab */}
        <TabsContent value="ambulances">
          <AmbulanceTracker />
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources">
          <ResourceAllocation />
        </TabsContent>

        {/* Communication Tab */}
        <TabsContent value="communication">
          <HospitalCommunication />
        </TabsContent>
      </Tabs>

      {/* Bed Update Dialog */}
      <Dialog open={bedUpdateDialog} onOpenChange={setBedUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Bed Status</DialogTitle>
            <DialogDescription>
              Update the status for bed {selectedBed?.id}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="bed-status">Bed Status</Label>
              <Select value={bedStatus} onValueChange={setBedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bed status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setBedUpdateDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleBedStatusSubmit}
                disabled={updateBedMutation.isPending}
              >
                {updateBedMutation.isPending ? 'Updating...' : 'Update Status'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bed Assignment Dialog */}
      <Dialog open={bedAssignmentDialog} onOpenChange={setBedAssignmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Patient to Bed</DialogTitle>
            <DialogDescription>
              Select an available bed for{' '}
              {selectedPatientForBed?.patient?.firstName || selectedPatientForBed?.patient?.username || 'the patient'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="bed-select">Available Beds</Label>
              <Select value={selectedBedForAssignment} onValueChange={setSelectedBedForAssignment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a bed" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ICU-01">ICU-01 (Cardiac ICU)</SelectItem>
                  <SelectItem value="ICU-02">ICU-02 (Cardiac ICU)</SelectItem>
                  <SelectItem value="GEN-01">GEN-01 (General Ward)</SelectItem>
                  <SelectItem value="GEN-02">GEN-02 (General Ward)</SelectItem>
                  <SelectItem value="EMER-01">EMER-01 (Emergency Ward)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setBedAssignmentDialog(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleBedAssignmentSubmit}
                disabled={assignBedMutation.isPending || !selectedBedForAssignment}
                className="bg-green-600 hover:bg-green-700"
              >
                {assignBedMutation.isPending ? 'Assigning...' : 'Assign Bed'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}