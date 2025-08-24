import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Navigation as NavigationIcon, ExternalLink, Play, Clock, MapPin } from 'lucide-react';

interface StableNavigationMapProps {
  ambulanceLocation: { latitude: number; longitude: number };
  patientLocation: { latitude: number; longitude: number };
  onStartJourney: () => void;
  onJourneyUpdate?: (eta: number, distance: number) => void;
  isJourneyActive: boolean;
}

export function StableNavigationMap({ 
  ambulanceLocation, 
  patientLocation, 
  onStartJourney,
  onJourneyUpdate,
  isJourneyActive 
}: StableNavigationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{
    distance: string;
    duration: string;
    eta: number;
  } | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Stable coordinates to prevent unnecessary re-renders
  const stableCoordinates = useMemo(() => ({
    ambulance: {
      lat: Math.round(ambulanceLocation.latitude * 100000) / 100000,
      lng: Math.round(ambulanceLocation.longitude * 100000) / 100000
    },
    patient: {
      lat: Math.round(patientLocation.latitude * 100000) / 100000,
      lng: Math.round(patientLocation.longitude * 100000) / 100000
    }
  }), [
    Math.round(ambulanceLocation.latitude * 100000),
    Math.round(ambulanceLocation.longitude * 100000),
    Math.round(patientLocation.latitude * 100000),
    Math.round(patientLocation.longitude * 100000)
  ]);

  // Load Google Maps only once - with immediate loading optimization
  useEffect(() => {
    const loadGoogleMaps = async () => {
      if (window.google && window.google.maps) {
        setIsMapLoaded(true);
        return;
      }

      // Check if script is already loading/loaded
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        if (window.google && window.google.maps) {
          setIsMapLoaded(true);
          return;
        }
        existingScript.addEventListener('load', () => setIsMapLoaded(true));
        return;
      }

      try {
        // Fetch API key with timeout for faster failure
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        // Get authenticated token
        const token = localStorage.getItem('token');
        const response = await fetch('/api/maps/config', {
          signal: controller.signal,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        clearTimeout(timeoutId);
        
        const { apiKey } = await response.json();
        
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,places`;
        script.async = true;
        script.defer = true;
        script.onload = () => setIsMapLoaded(true);
        script.onerror = () => console.error('Failed to load Google Maps script');
        document.head.appendChild(script);
      } catch (error) {
        console.error('Failed to load Google Maps:', error);
        // Set a fallback timeout to prevent hanging
        setTimeout(() => setIsMapLoaded(false), 2000);
      }
    };

    loadGoogleMaps();
  }, []);

  // Initialize map only once
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current || mapInstanceRef.current) {
      return;
    }

    const map = new google.maps.Map(mapRef.current, {
      zoom: 14,
      center: stableCoordinates.ambulance,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      gestureHandling: 'greedy',
      disableDefaultUI: false,
    });

    mapInstanceRef.current = map;
    directionsRendererRef.current = new google.maps.DirectionsRenderer({
      suppressMarkers: false,
      polylineOptions: {
        strokeColor: '#DC2626',
        strokeWeight: 5,
        strokeOpacity: 0.9
      }
    });
    directionsRendererRef.current.setMap(map);

    calculateRoute();
  }, [isMapLoaded]);

  // Calculate route only when coordinates significantly change
  const calculateRoute = async () => {
    if (!window.google || !mapInstanceRef.current || !directionsRendererRef.current) return;

    setIsCalculating(true);
    
    try {
      const directionsService = new google.maps.DirectionsService();
      const result = await directionsService.route({
        origin: stableCoordinates.ambulance,
        destination: stableCoordinates.patient,
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: true
      });

      directionsRendererRef.current.setDirections(result);
      
      const route = result.routes[0];
      const leg = route.legs[0];
      
      const routeData = {
        distance: leg.distance?.text || 'Unknown',
        duration: leg.duration?.text || 'Unknown',
        eta: leg.duration?.value || 0
      };

      setRouteInfo(routeData);

      // Simple local callback without broadcasting
      if (onJourneyUpdate && routeData.eta > 0) {
        const distanceValue = parseFloat(leg.distance?.text?.replace(/[^\d.]/g, '') || '0');
        onJourneyUpdate(routeData.eta, distanceValue);
      }

      // Auto-fit bounds to show both locations
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(stableCoordinates.ambulance);
      bounds.extend(stableCoordinates.patient);
      mapInstanceRef.current.fitBounds(bounds, 50);
      
    } catch (error) {
      console.error('Route calculation failed:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  // Recalculate only when coordinates change significantly
  useEffect(() => {
    if (isMapLoaded && mapInstanceRef.current) {
      const timeoutId = setTimeout(calculateRoute, 1000); // Debounce recalculation
      return () => clearTimeout(timeoutId);
    }
  }, [stableCoordinates.ambulance.lat, stableCoordinates.ambulance.lng]);

  const handleOpenNativeNavigation = () => {
    const url = `https://www.google.com/maps/dir/${stableCoordinates.ambulance.lat},${stableCoordinates.ambulance.lng}/${stableCoordinates.patient.lat},${stableCoordinates.patient.lng}`;
    window.open(url, '_blank');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <NavigationIcon className="h-5 w-5" />
          Navigation to Patient
          {isJourneyActive && <Badge variant="secondary">Journey Active</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Route Information */}
        {routeInfo && (
          <div className="flex gap-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">{routeInfo.distance}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">{routeInfo.duration}</span>
            </div>
          </div>
        )}

        {/* Map Container */}
        <div 
          ref={mapRef} 
          className="w-full h-96 rounded-lg border border-gray-200"
          style={{ minHeight: '400px' }}
        />

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={onStartJourney}
            disabled={isJourneyActive || isCalculating}
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            {isJourneyActive ? 'Journey Started' : 'Start Journey'}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleOpenNativeNavigation}
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Open in Google Maps
          </Button>
        </div>

        {isCalculating && (
          <div className="text-sm text-gray-600">
            Calculating route...
          </div>
        )}
      </CardContent>
    </Card>
  );
}