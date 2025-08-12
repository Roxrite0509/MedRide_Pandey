import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useWebSocket } from "@/hooks/use-websocket";
import { useGeolocation } from "@/hooks/use-geolocation";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Ambulance, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  MapPin, 
  MessageSquare,
  Navigation as NavigationIcon,
  User,
  Phone,
  X
} from "lucide-react";

export default function AmbulanceDashboard() {
  const { location } = useGeolocation();
  const { sendMessage } = useWebSocket();
  const [, setLocation] = useLocation();
  const [showRejectDialog, setShowRejectDialog] = useState<any>(null);

  const { data: emergencyRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ['/api/emergency/requests'],
    refetchInterval: 5000,
  });

  // Update location periodically
  useEffect(() => {
    if (location) {
      sendMessage({
        type: 'location_update',
        lat: location.latitude,
        lng: location.longitude
      });
    }
  }, [location, sendMessage]);

  // Accept request mutation
  const acceptRequestMutation = useMutation({
    mutationFn: async ({ requestId, ambulanceId }: { requestId: number, ambulanceId: number }) => {
      const response = await apiRequest('PUT', `/api/emergency/request/${requestId}`, {
        status: 'dispatched',
        ambulanceId: ambulanceId
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/emergency/requests'] });
      // Navigate to map view with the accepted request
      setLocation(`/PatientTracking/${variables.requestId}`);
    },
    onError: (error) => {
      console.error('Failed to accept request:', error);
      alert('Failed to accept request. Please try again.');
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

  const handleAcceptRequest = (request: any) => {
    acceptRequestMutation.mutate({
      requestId: request.id,
      ambulanceId: 1 // Should be actual ambulance ID from auth context
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

  const pendingRequests = Array.isArray(emergencyRequests) ? emergencyRequests.filter((req: any) => 
    req.status === 'pending'
  ) : [];

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

      {/* Status Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-500 rounded-full mr-3 animate-pulse"></div>
              <div>
                <div className="font-semibold text-gray-800">Ambulance Unit A-204</div>
                <div className="text-sm text-gray-600">Status: Available</div>
              </div>
            </div>
            <div className="flex items-center space-x-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  <div key={request.id} className={`border-l-4 p-4 rounded-lg ${
                    request.priority === 'critical' ? 'border-red-500 bg-red-50' :
                    request.priority === 'high' ? 'border-orange-500 bg-orange-50' :
                    'border-yellow-500 bg-yellow-50'
                  }`}>
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
                          {request.patientCondition || 'Medical Emergency'}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {request.priority.toUpperCase()}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 mb-4">
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
      </div>
    </div>
  );
}