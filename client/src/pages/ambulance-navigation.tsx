import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Timer, Navigation as NavigationIcon, Clock, Heart, AlertTriangle, Phone, MessageSquare, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { StableNavigationMap } from "@/components/stable-navigation-map";
import { useAuth } from "@/hooks/use-auth";
import { useGeolocation } from "@/hooks/use-geolocation";

export default function AmbulanceNavigation() {
  const { requestId } = useParams();
  const [, setLocation] = useLocation();
  const [eta, setEta] = useState("8 minutes");
  const [distance, setDistance] = useState("2.4 km");

  const { user } = useAuth();
  const { location } = useGeolocation();
  
  const { data: emergencyRequest, isLoading, isError } = useQuery({
    queryKey: ['/api/emergency/request', requestId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/emergency/request/${requestId}`);
      return response.json();
    },
    enabled: !!requestId,
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes (updated from cacheTime)
    retry: 2,
    retryDelay: 500,
  });

  // Real-time ETA countdown - only start after we have route data
  useEffect(() => {
    if (eta === "Arriving" || eta === "8 minutes") return; // Don't countdown from default value
    
    const interval = setInterval(() => {
      setEta(prev => {
        const currentMinutes = parseInt(prev.split(' ')[0]);
        if (currentMinutes > 1) {
          return `${currentMinutes - 1} minutes`;
        }
        return "Arriving";
      });
    }, 60000); // Update every minute for realistic countdown

    return () => clearInterval(interval);
  }, [eta]);


  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold">Loading emergency details...</h2>
        </div>
      </div>
    );
  }

  if (isError || !emergencyRequest) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <AlertTriangle className="w-12 h-12 mx-auto mb-2" />
            <h2 className="text-xl font-semibold">Error Loading Emergency Request</h2>
            <p className="text-gray-600">Request ID: {requestId}</p>
          </div>
          <Button onClick={() => setLocation('/AmbulanceDashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          onClick={() => setLocation('/AmbulanceDashboard')}
          className="shrink-0"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <div>
          <h1 className="text-2xl font-bold">En Route to Emergency</h1>
          <p className="text-gray-600">Request ID: {emergencyRequest?.id}</p>
        </div>
      </div>

      {/* Emergency Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Emergency Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge 
                  className={`${getPriorityColor(emergencyRequest?.priority || 'medium')} text-white`}
                >
                  {(emergencyRequest?.priority || 'medium').toUpperCase()} PRIORITY
                </Badge>
              </div>
              <h3 className="font-semibold mb-1">{emergencyRequest?.patientCondition || 'Medical Emergency'}</h3>
              <p className="text-gray-600 text-sm mb-2">{emergencyRequest?.notes || 'No additional notes'}</p>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <MapPin className="w-4 h-4" />
                {emergencyRequest?.address || 'Emergency Location'}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-sm">
                  Requested: {emergencyRequest?.requestedAt ? new Date(emergencyRequest.requestedAt).toLocaleTimeString() : 'Unknown'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-500" />
                <span className="text-sm">Patient ID: {emergencyRequest?.patientId || 'Unknown'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="w-5 h-5 text-blue-500" />
              ETA & Distance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <div>
                <div className="text-3xl font-bold text-blue-600">{eta}</div>
                <div className="text-gray-600">Estimated arrival</div>
              </div>
              <div>
                <div className="text-xl font-semibold">{distance}</div>
                <div className="text-gray-600">Distance remaining</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <NavigationIcon className="w-5 h-5 text-green-500" />
              Route Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Traffic Conditions</span>
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  Light Traffic
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Route Status</span>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  Optimal Route
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">GPS Signal</span>
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  Strong
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Google Maps Navigation */}
      <Card>
        <CardHeader>
          <CardTitle>Live Navigation Map</CardTitle>
          <CardDescription>Real-time route with Google Maps</CardDescription>
        </CardHeader>
        <CardContent>
          {emergencyRequest && location ? (
            <div className="w-full h-96">
              <StableNavigationMap
                ambulanceLocation={{
                  latitude: location.latitude,
                  longitude: location.longitude
                }}
                patientLocation={{
                  latitude: parseFloat(emergencyRequest.latitude),
                  longitude: parseFloat(emergencyRequest.longitude)
                }}
                onStartJourney={() => console.log('Journey started from navigation page')}
                onJourneyUpdate={(eta, distance) => {
                  setEta(`${Math.ceil(eta / 60)} minutes`);
                  setDistance(`${distance.toFixed(1)} km`);
                }}
                isJourneyActive={true}
              />
            </div>
          ) : (
            <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-12 h-12 text-blue-500 mx-auto mb-2" />
                <p className="text-gray-600 font-medium">Loading Navigation Map...</p>
                <p className="text-sm text-gray-500">Getting your location and route</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button className="h-12" variant="outline">
          <Phone className="w-4 h-4 mr-2" />
          Call Patient
        </Button>
        <Button className="h-12" variant="outline">
          <MessageSquare className="w-4 h-4 mr-2" />
          Contact Hospital
        </Button>
        <Button className="h-12 bg-green-600 hover:bg-green-700 text-white">
          <CheckCircle className="w-4 h-4 mr-2" />
          Mark Arrived
        </Button>
      </div>
    </div>
  );
}