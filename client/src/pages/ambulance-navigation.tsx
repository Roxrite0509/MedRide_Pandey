import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Timer, Navigation as NavigationIcon, Clock, Heart, AlertTriangle, Phone, MessageSquare, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";

export default function AmbulanceNavigation() {
  const { requestId } = useParams();
  const [, setLocation] = useLocation();
  const [eta, setEta] = useState("8 minutes");
  const [distance, setDistance] = useState("2.4 km");

  const { data: emergencyRequest } = useQuery({
    queryKey: ['/api/emergency/request', requestId],
    enabled: !!requestId,
  });

  // Mock GPS coordinates for demonstration
  const mockCurrentLocation = { lat: 40.7580, lng: -73.9855 };
  const mockDestination = emergencyRequest ? {
    lat: parseFloat((emergencyRequest as any)?.latitude || '40.7128'),
    lng: parseFloat((emergencyRequest as any)?.longitude || '-74.0060')
  } : { lat: 40.7128, lng: -74.0060 };

  useEffect(() => {
    // Simulate ETA countdown
    const interval = setInterval(() => {
      setEta(prev => {
        const currentMinutes = parseInt(prev.split(' ')[0]);
        if (currentMinutes > 1) {
          return `${currentMinutes - 1} minutes`;
        }
        return "Arriving";
      });
    }, 10000); // Update every 10 seconds for demo

    return () => clearInterval(interval);
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  if (!emergencyRequest) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold">Loading emergency details...</h2>
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
          <p className="text-gray-600">Request ID: {emergencyRequest.id}</p>
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
                  className={`${getPriorityColor(emergencyRequest.priority)} text-white`}
                >
                  {emergencyRequest.priority.toUpperCase()} PRIORITY
                </Badge>
              </div>
              <h3 className="font-semibold mb-1">{emergencyRequest.patientCondition}</h3>
              <p className="text-gray-600 text-sm mb-2">{emergencyRequest.notes}</p>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <MapPin className="w-4 h-4" />
                {emergencyRequest.address}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-sm">
                  Requested: {new Date(emergencyRequest.requestedAt).toLocaleTimeString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-500" />
                <span className="text-sm">Patient ID: {emergencyRequest.patientId}</span>
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

      {/* Mock Map */}
      <Card>
        <CardHeader>
          <CardTitle>Navigation Map</CardTitle>
          <CardDescription>Real-time route to emergency location</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center relative">
            <div className="text-center">
              <MapPin className="w-12 h-12 text-blue-500 mx-auto mb-2" />
              <p className="text-gray-600 font-medium">Interactive Map View</p>
              <p className="text-sm text-gray-500">
                From: {mockCurrentLocation.lat.toFixed(4)}, {mockCurrentLocation.lng.toFixed(4)}
              </p>
              <p className="text-sm text-gray-500">
                To: {mockDestination.lat.toFixed(4)}, {mockDestination.lng.toFixed(4)}
              </p>
            </div>
            
            {/* Mock route indicators */}
            <div className="absolute top-4 left-4 bg-blue-500 w-3 h-3 rounded-full animate-pulse"></div>
            <div className="absolute bottom-4 right-4 bg-red-500 w-3 h-3 rounded-full"></div>
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <path
                d="M 20 20 Q 150 100 250 240"
                stroke="#3B82F6"
                strokeWidth="3"
                fill="none"
                strokeDasharray="5,5"
                className="animate-pulse"
              />
            </svg>
          </div>
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