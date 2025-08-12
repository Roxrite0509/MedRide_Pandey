import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Navigation as NavigationIcon } from "lucide-react";

export function AmbulanceTracking() {
  const { data: ambulances, isLoading } = useQuery({
    queryKey: ['/api/ambulances/available'],
    refetchInterval: 5000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ambulance Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg animate-pulse">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-gray-300 rounded-full mr-3"></div>
                  <div>
                    <div className="w-24 h-4 bg-gray-300 rounded mb-1"></div>
                    <div className="w-16 h-3 bg-gray-300 rounded"></div>
                  </div>
                </div>
                <div className="w-12 h-4 bg-gray-300 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Real-time Ambulance Tracking</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 bg-gray-100 rounded-lg h-48 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <div className="text-gray-600">Live Map View</div>
            <div className="text-sm text-gray-500">Real-time ambulance locations</div>
          </div>
        </div>
        
        <div className="space-y-3">
          {ambulances && ambulances.length > 0 ? (
            ambulances.map((ambulance: any) => (
              <div key={ambulance.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${
                    ambulance.status === 'available' ? 'bg-green-500' :
                    ambulance.status === 'dispatched' ? 'bg-yellow-500' :
                    ambulance.status === 'en_route' ? 'bg-blue-500' :
                    'bg-red-500'
                  }`}></div>
                  <div>
                    <div className="font-medium text-gray-800">
                      {ambulance.vehicleNumber || `Unit ${ambulance.id}`}
                    </div>
                    <div className="text-sm text-gray-600">
                      Status: {ambulance.status}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-xs">
                    <NavigationIcon className="w-3 h-3 mr-1" />
                    {ambulance.currentLatitude && ambulance.currentLongitude 
                      ? 'GPS Active' 
                      : 'GPS Pending'}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No ambulances currently tracked</p>
              <p className="text-sm">Waiting for active dispatch</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
