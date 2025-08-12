import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Navigation as NavigationIcon, Clock, MapPin, Play, ExternalLink, RotateCcw, Smartphone } from 'lucide-react';

interface NavigationMapProps {
  ambulanceLocation: { latitude: number; longitude: number };
  patientLocation: { latitude: number; longitude: number };
  onStartJourney: () => void;
  onJourneyUpdate?: (eta: number, distance: number) => void;
  isJourneyActive: boolean;
}

export function NavigationMap({ 
  ambulanceLocation, 
  patientLocation, 
  onStartJourney,
  onJourneyUpdate,
  isJourneyActive 
}: NavigationMapProps) {
  
  // Removed excessive debug logging to prevent map reloading
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{
    distance: string;
    duration: string;
    eta: number;
  } | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [navigationUrl, setNavigationUrl] = useState<string>('');

  // Load Google Maps
  useEffect(() => {
    const loadGoogleMaps = async () => {
      if (window.google && window.google.maps) {
        setIsMapLoaded(true);
        return;
      }

      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => setIsMapLoaded(true));
        return;
      }

      try {
        const response = await fetch('/api/maps/config');
        const { apiKey } = await response.json();
        
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,places`;
        script.async = true;
        script.defer = true;
        script.onload = () => setIsMapLoaded(true);
        document.head.appendChild(script);
      } catch (error) {
        console.error('Failed to load Google Maps:', error);
      }
    };

    loadGoogleMaps();
  }, []);

  // Initialize map and directions
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current || !ambulanceLocation || !patientLocation) return;

    const mapOptions: google.maps.MapOptions = {
      zoom: 13,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
      zoomControl: true,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      gestureHandling: 'greedy',
      disableDefaultUI: false,
      clickableIcons: true
    };

    const map = new google.maps.Map(mapRef.current, mapOptions);
    mapInstanceRef.current = map;

    // Initialize directions service and renderer with advanced options
    directionsServiceRef.current = new google.maps.DirectionsService();
    directionsRendererRef.current = new google.maps.DirectionsRenderer({
      suppressMarkers: false,
      draggable: false,
      preserveViewport: false,
      polylineOptions: {
        strokeColor: '#DC2626',
        strokeWeight: 6,
        strokeOpacity: 0.9,
        geodesic: true
      },
      markerOptions: {
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" fill="#DC2626" stroke="#FFFFFF" stroke-width="2"/>
              <path d="M12 8v4l3 3" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 16)
        }
      }
    });
    directionsRendererRef.current.setMap(map);

    calculateRoute();
    generateNavigationUrl();
  }, [isMapLoaded, ambulanceLocation, patientLocation]);

  const calculateRoute = async () => {
    if (!directionsServiceRef.current || !directionsRendererRef.current) return;

    setIsCalculating(true);
    
    const request: google.maps.DirectionsRequest = {
      origin: { lat: ambulanceLocation.latitude, lng: ambulanceLocation.longitude },
      destination: { lat: patientLocation.latitude, lng: patientLocation.longitude },
      travelMode: google.maps.TravelMode.DRIVING,
      optimizeWaypoints: true,
      avoidHighways: false,
      avoidTolls: false,
      drivingOptions: {
        departureTime: new Date(),
        trafficModel: google.maps.TrafficModel.BEST_GUESS
      },
      unitSystem: google.maps.UnitSystem.METRIC,
      region: 'IN' // India region for better routing
    };

    try {
      const result = await directionsServiceRef.current.route(request);
      directionsRendererRef.current.setDirections(result);
      
      const route = result.routes[0];
      const leg = route.legs[0];
      
      const routeData = {
        distance: leg.distance?.text || 'Unknown',
        duration: leg.duration?.text || 'Unknown',
        eta: leg.duration?.value || 0 // in seconds
      };
      
      setRouteInfo(routeData);
      
      // Notify parent component about route info
      if (onJourneyUpdate) {
        onJourneyUpdate(routeData.eta, leg.distance?.value || 0);
      }
      
    } catch (error) {
      console.error('Error calculating route:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  const generateNavigationUrl = () => {
    // Generate Google Maps navigation URL for native app integration
    const origin = `${ambulanceLocation.latitude},${ambulanceLocation.longitude}`;
    const destination = `${patientLocation.latitude},${patientLocation.longitude}`;
    
    // Google Maps URL with navigation parameters
    const googleMapsUrl = `https://www.google.com/maps/dir/${origin}/${destination}/@${destination},15z/data=!3m1!4b1!4m2!4m1!3e0`;
    
    setNavigationUrl(googleMapsUrl);
  };

  const openNativeNavigation = () => {
    // Try to open in Google Maps app first, fallback to web
    const mobileNavigationUrl = `google.navigation:q=${patientLocation.latitude},${patientLocation.longitude}&mode=d`;
    
    // For mobile devices, try app first
    if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      window.open(mobileNavigationUrl, '_blank');
      // Fallback to web version after a delay
      setTimeout(() => {
        window.open(navigationUrl, '_blank');
      }, 1500);
    } else {
      // Desktop - open web version
      window.open(navigationUrl, '_blank');
    }
  };

  const handleStartJourney = () => {
    onStartJourney();
  };

  const formatETA = (seconds: number): string => {
    const minutes = Math.ceil(seconds / 60);
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <NavigationIcon className="w-5 h-5 text-blue-600" />
            <span>Emergency Navigation</span>
          </div>
          <div className="flex items-center space-x-2">
            {routeInfo && (
              <Badge variant="outline" className="text-sm">
                <Clock className="w-3 h-3 mr-1" />
                ETA: {formatETA(routeInfo.eta)}
              </Badge>
            )}
            {isJourneyActive && (
              <Badge className="bg-green-600">
                <Play className="w-3 h-3 mr-1" />
                En Route
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Map Container */}
        <div 
          ref={mapRef}
          className="w-full h-96 rounded-lg border mb-4"
          style={{ minHeight: '400px' }}
        />
        
        {/* Route Information */}
        {routeInfo && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">Distance</span>
              </div>
              <div className="text-xl font-bold text-blue-700">
                {routeInfo.distance}
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">Estimated Time</span>
              </div>
              <div className="text-xl font-bold text-green-700">
                {routeInfo.duration}
              </div>
            </div>
          </div>
        )}

        {/* Journey Controls */}
        <div className="space-y-3">
          <div className="flex space-x-2">
            {!isJourneyActive ? (
              <Button 
                onClick={handleStartJourney}
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={isCalculating || !routeInfo}
              >
                <Play className="w-4 h-4 mr-2" />
                Start Journey
              </Button>
            ) : (
              <div className="flex-1 bg-green-100 border border-green-300 rounded-md p-2 text-center">
                <div className="flex items-center justify-center space-x-2 text-green-800">
                  <Play className="w-4 h-4" />
                  <span className="font-medium">Journey in Progress</span>
                </div>
              </div>
            )}
            
            <Button 
              variant="outline" 
              onClick={calculateRoute}
              disabled={isCalculating}
            >
              <RotateCcw className={`w-4 h-4 mr-2 ${isCalculating ? 'animate-spin' : ''}`} />
              Recalculate
            </Button>
          </div>

          {/* Native Navigation */}
          <div className="flex space-x-2">
            <Button 
              onClick={openNativeNavigation}
              variant="outline"
              className="flex-1 border-blue-200 hover:bg-blue-50"
              disabled={!navigationUrl}
            >
              <Smartphone className="w-4 h-4 mr-2" />
              Open in Google Maps
            </Button>
            
            <Button 
              onClick={() => window.open(navigationUrl, '_blank')}
              variant="outline"
              className="border-blue-200 hover:bg-blue-50"
              disabled={!navigationUrl}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {isCalculating && (
          <div className="mt-4 text-center text-gray-600">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
            Calculating optimal route...
          </div>
        )}
      </CardContent>
    </Card>
  );
}