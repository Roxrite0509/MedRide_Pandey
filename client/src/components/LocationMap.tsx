/// <reference types="@types/google.maps" />
import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, RefreshCw, AlertCircle } from 'lucide-react';
import { getAuthToken } from '@/lib/auth';

declare global {
  interface Window {
    google: typeof google;
  }
}

interface LocationMapProps {
  title?: string;
  height?: string;
  showRefreshButton?: boolean;
  showCurrentAmbulance?: boolean;
  showAllAmbulances?: boolean;
  currentAmbulanceId?: number;
  patientLocation?: { latitude: number; longitude: number } | null;
  onLocationChange?: (location: { latitude: number; longitude: number }) => void;
}

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  isLoading: boolean;
}

export function LocationMap({ 
  title = "Current Location", 
  height = "400px",
  showRefreshButton = true,
  showCurrentAmbulance = false,
  showAllAmbulances = false,
  currentAmbulanceId,
  patientLocation,
  onLocationChange 
}: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const ambulanceMarkersRef = useRef<google.maps.Marker[]>([]);
  const allAmbulanceMarkersRef = useRef<google.maps.Marker[]>([]);
  const routeLineRef = useRef<google.maps.Polyline | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [currentAmbulanceLocation, setCurrentAmbulanceLocation] = useState<any>(null);
  const [allAmbulances, setAllAmbulances] = useState<any[]>([]);
  const [location, setLocation] = useState<LocationState>({
    latitude: null,
    longitude: null,
    error: null,
    isLoading: true
  });

  // Load Google Maps Script
  useEffect(() => {
    const loadGoogleMaps = async () => {
      // Check if Google Maps is already loaded
      if (window.google && window.google.maps) {
        setIsMapLoaded(true);
        return;
      }

      // Check if script is already being loaded
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => setIsMapLoaded(true));
        return;
      }

      try {
        // Get API key from backend securely with authentication
        const token = localStorage.getItem('token');
        const response = await fetch('/api/maps/config', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const { apiKey } = await response.json();
        
        if (!apiKey) {
          throw new Error('Google Maps API key not available');
        }

        // Create script element
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        
        script.onload = () => {
          setIsMapLoaded(true);
        };
        
        script.onerror = () => {
          setLocation(prev => ({ 
            ...prev, 
            error: 'Google Maps API key domain restriction. Please add your Replit domain to the API key settings in Google Cloud Console.',
            isLoading: false 
          }));
        };

        document.head.appendChild(script);
      } catch (error) {
        console.error('Error loading Google Maps:', error);
        setLocation(prev => ({ 
          ...prev, 
          error: 'Failed to load Google Maps configuration',
          isLoading: false 
        }));
      }
    };

    loadGoogleMaps();
  }, []);

  // Setup current ambulance location
  const setupCurrentAmbulance = async () => {
    if (!showCurrentAmbulance || !isMapLoaded || !currentAmbulanceId) return;
    
    try {
      const token = localStorage.getItem('token');
      
      // Always use a reference location - prioritize patient, then user location, then fallback to Indore
      let referenceLocation = null;
      let source = '';
      
      if (patientLocation && patientLocation.latitude && patientLocation.longitude && 
          patientLocation.latitude !== 0 && patientLocation.longitude !== 0) {
        // Use patient location from emergency request
        referenceLocation = patientLocation;
        source = 'patient_location';
      } else if (location.latitude && location.longitude) {
        // Use ambulance operator's geo-detected location
        referenceLocation = {
          latitude: location.latitude,
          longitude: location.longitude
        };
        source = 'operator_location';
      } else {
        // Fallback to Indore city center
        referenceLocation = { latitude: 22.7196, longitude: 75.8577 };
        source = 'fallback_location';
      }
      
      // Always position ambulances - even with fallback location
      await fetch('/api/ambulances/position-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          latitude: referenceLocation.latitude,
          longitude: referenceLocation.longitude,
          source: source
        })
      });
      
      // Always fetch and display ambulance locations
      const response = await fetch('/api/ambulances/locations', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const locations = await response.json();
        // Removed debug logs for performance
        
        // Try to find ambulance by ambulance ID first, then by operator ID
        let currentAmb = locations.find((amb: any) => amb.id === currentAmbulanceId);
        if (!currentAmb) {
          // Fallback: try to find by operator ID in case currentAmbulanceId is a user ID
          currentAmb = locations.find((amb: any) => amb.operatorId === currentAmbulanceId);
          // Fallback found
        }
        
        if (currentAmb) {
          // Ensure coordinates are parsed as numbers
          const ambulanceWithParsedCoords = {
            ...currentAmb,
            latitude: parseFloat(currentAmb.currentLatitude),
            longitude: parseFloat(currentAmb.currentLongitude)
          };
          setCurrentAmbulanceLocation(ambulanceWithParsedCoords);
        } else {
          // No ambulance found for ID
        }
      }
    } catch (error) {
      // Setup failed - using fallback
    }
  };

  useEffect(() => {
    if (isMapLoaded && showCurrentAmbulance && currentAmbulanceId) {
      setupCurrentAmbulance();
    }
  }, [isMapLoaded, showCurrentAmbulance, currentAmbulanceId]);

  // Add route line between patient and ambulance
  useEffect(() => {
    if (!mapInstanceRef.current || !showCurrentAmbulance) return;

    // Clear existing route line
    if (routeLineRef.current) {
      routeLineRef.current.setMap(null);
      routeLineRef.current = null;
    }

    // Draw route line if both patient and ambulance locations exist
    if (patientLocation && patientLocation.latitude && patientLocation.longitude &&
        currentAmbulanceLocation && currentAmbulanceLocation.latitude && currentAmbulanceLocation.longitude &&
        patientLocation.latitude !== 0 && patientLocation.longitude !== 0 &&
        currentAmbulanceLocation.latitude !== 0 && currentAmbulanceLocation.longitude !== 0) {
      
      const routePath = [
        { lat: patientLocation.latitude, lng: patientLocation.longitude },
        { lat: currentAmbulanceLocation.latitude, lng: currentAmbulanceLocation.longitude }
      ];

      routeLineRef.current = new google.maps.Polyline({
        path: routePath,
        geodesic: true,
        strokeColor: '#DC2626',
        strokeOpacity: 0.8,
        strokeWeight: 3,
        map: mapInstanceRef.current
      });

      // Calculate approximate distance
      const latDiff = patientLocation.latitude - currentAmbulanceLocation.latitude;
      const lngDiff = patientLocation.longitude - currentAmbulanceLocation.longitude;
      const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111; // rough km conversion
      
      // Add distance info window at midpoint
      const midLat = (patientLocation.latitude + currentAmbulanceLocation.latitude) / 2;
      const midLng = (patientLocation.longitude + currentAmbulanceLocation.longitude) / 2;
      
      const routeInfoWindow = new google.maps.InfoWindow({
        position: { lat: midLat, lng: midLng },
        content: `
          <div style="padding: 4px; text-align: center;">
            <div style="font-size: 12px; font-weight: bold; color: #DC2626;">
              🚨 Emergency Route
            </div>
            <div style="font-size: 11px; color: #666;">
              Distance: ~${distance.toFixed(1)} km
            </div>
          </div>
        `
      });

      routeLineRef.current.addListener('click', () => {
        routeInfoWindow.open(mapInstanceRef.current);
      });
    }
  }, [patientLocation, currentAmbulanceLocation, showCurrentAmbulance]);

  // Create ambulance marker on map
  useEffect(() => {
    if (!mapInstanceRef.current || !showCurrentAmbulance || !currentAmbulanceLocation) return;

    // Clear existing ambulance markers
    ambulanceMarkersRef.current.forEach(marker => {
      marker.setMap(null);
    });
    ambulanceMarkersRef.current = [];

    // Create ambulance marker
    if (currentAmbulanceLocation.latitude && currentAmbulanceLocation.longitude &&
        currentAmbulanceLocation.latitude !== 0 && currentAmbulanceLocation.longitude !== 0) {
      
      const ambulanceMarker = new google.maps.Marker({
        position: { 
          lat: currentAmbulanceLocation.latitude, 
          lng: currentAmbulanceLocation.longitude 
        },
        map: mapInstanceRef.current,
        title: `Ambulance ${currentAmbulanceLocation.vehicleNumber || currentAmbulanceLocation.id}`,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="12" width="20" height="8" rx="2" fill="#2563EB" stroke="#FFFFFF" stroke-width="1"/>
              <rect x="4" y="10" width="16" height="4" rx="1" fill="#3B82F6"/>
              <circle cx="7" cy="18" r="2" fill="#FFFFFF" stroke="#2563EB" stroke-width="1"/>
              <circle cx="17" cy="18" r="2" fill="#FFFFFF" stroke="#2563EB" stroke-width="1"/>
              <rect x="8" y="6" width="8" height="6" rx="1" fill="#EF4444"/>
              <text x="12" y="10" text-anchor="middle" font-size="6" fill="white" font-weight="bold">+</text>
            </svg>
          `),
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 16)
        }
      });

      // Add info window for ambulance
      const ambulanceInfoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; min-width: 200px;">
            <div style="font-size: 14px; font-weight: bold; color: #2563EB; margin-bottom: 4px;">
              🚑 ${currentAmbulanceLocation.vehicleNumber || `Ambulance ${currentAmbulanceLocation.id}`}
            </div>
            <div style="font-size: 12px; color: #666; margin-bottom: 2px;">
              Status: <span style="color: #059669; font-weight: 500;">${currentAmbulanceLocation.status || 'active'}</span>
            </div>
            <div style="font-size: 12px; color: #666; margin-bottom: 2px;">
              Equipment Level: ${currentAmbulanceLocation.equipmentLevel || 'Standard'}
            </div>
            <div style="font-size: 11px; color: #999;">
              Lat: ${currentAmbulanceLocation.latitude.toFixed(6)}<br/>
              Lng: ${currentAmbulanceLocation.longitude.toFixed(6)}
            </div>
          </div>
        `
      });

      ambulanceMarker.addListener('click', () => {
        ambulanceInfoWindow.open(mapInstanceRef.current, ambulanceMarker);
      });

      ambulanceMarkersRef.current.push(ambulanceMarker);
    }
  }, [currentAmbulanceLocation, showCurrentAmbulance]);

  // Auto-zoom to fit both markers
  useEffect(() => {
    if (!mapInstanceRef.current || !showCurrentAmbulance) return;

    // Check if we have both patient and ambulance locations
    const hasPatientLocation = patientLocation && patientLocation.latitude && patientLocation.longitude &&
                              patientLocation.latitude !== 0 && patientLocation.longitude !== 0;
    const hasAmbulanceLocation = currentAmbulanceLocation && currentAmbulanceLocation.latitude && 
                                currentAmbulanceLocation.longitude &&
                                currentAmbulanceLocation.latitude !== 0 && currentAmbulanceLocation.longitude !== 0;

    if (hasPatientLocation && hasAmbulanceLocation) {
      // Both markers exist - fit both in view
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: patientLocation.latitude, lng: patientLocation.longitude });
      bounds.extend({ lat: currentAmbulanceLocation.latitude, lng: currentAmbulanceLocation.longitude });
      
      // Fit the map to show both markers with some padding
      mapInstanceRef.current.fitBounds(bounds, {
        top: 50,
        right: 50,
        bottom: 50,
        left: 50
      });
      
      // Ensure minimum zoom level for visibility
      const listener = google.maps.event.addListenerOnce(mapInstanceRef.current, 'bounds_changed', () => {
        const currentZoom = mapInstanceRef.current?.getZoom();
        if (currentZoom && currentZoom > 16) {
          mapInstanceRef.current?.setZoom(16);
        }
      });
    } else if (hasAmbulanceLocation) {
      // Only ambulance marker - center on ambulance
      mapInstanceRef.current.setCenter({
        lat: currentAmbulanceLocation.latitude,
        lng: currentAmbulanceLocation.longitude
      });
      mapInstanceRef.current.setZoom(15);
    } else if (hasPatientLocation) {
      // Only patient marker - center on patient
      mapInstanceRef.current.setCenter({
        lat: patientLocation.latitude,
        lng: patientLocation.longitude
      });
      mapInstanceRef.current.setZoom(15);
    }
  }, [patientLocation, currentAmbulanceLocation, showCurrentAmbulance]);

  // Get user's current location with optimized caching and fallback
  const getCurrentLocation = () => {
    setLocation(prev => ({ ...prev, isLoading: true, error: null }));

    if (!navigator.geolocation) {
      // Use fallback location instead of showing error
      const fallbackLocation = { latitude: 22.7196, longitude: 75.8577 };
      setLocation({
        ...fallbackLocation,
        error: null,
        isLoading: false
      });
      
      if (onLocationChange) {
        onLocationChange(fallbackLocation);
      }
      return;
    }

    // Check if we have recent cached location in localStorage
    const cachedLocation = localStorage.getItem('userLocation');
    const cacheTimestamp = localStorage.getItem('userLocationTimestamp');
    const now = Date.now();
    const cacheAge = 5 * 60 * 1000; // 5 minutes cache

    if (cachedLocation && cacheTimestamp && (now - parseInt(cacheTimestamp)) < cacheAge) {
      const { latitude, longitude } = JSON.parse(cachedLocation);
      setLocation({
        latitude,
        longitude,
        error: null,
        isLoading: false
      });
      
      if (onLocationChange) {
        onLocationChange({ latitude, longitude });
      }
      return;
    }

    // Use fast, low-accuracy positioning for immediate response
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const locationData = { latitude, longitude };
        
        // Cache the location
        localStorage.setItem('userLocation', JSON.stringify(locationData));
        localStorage.setItem('userLocationTimestamp', now.toString());
        
        setLocation({
          latitude,
          longitude,
          error: null,
          isLoading: false
        });
        
        if (onLocationChange) {
          onLocationChange(locationData);
        }
      },
      (error) => {
        console.warn('Geolocation failed, using fallback location:', error.message);
        // Use fallback location instead of showing error
        const fallbackLocation = { latitude: 22.7196, longitude: 75.8577 };
        
        // Cache the fallback so we don't keep retrying
        localStorage.setItem('userLocation', JSON.stringify(fallbackLocation));
        localStorage.setItem('userLocationTimestamp', now.toString());
        
        setLocation({
          ...fallbackLocation,
          error: null, // Don't show error, just use fallback
          isLoading: false
        });
        
        if (onLocationChange) {
          onLocationChange(fallbackLocation);
        }
      },
      {
        enableHighAccuracy: false, // Fast, low-accuracy for immediate response
        timeout: 5000, // Shorter timeout
        maximumAge: 300000 // 5 minutes browser cache
      }
    );
  };

  // Initialize map when Google Maps is loaded (with fallback location if needed)
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current) {
      return;
    }

    // Use location if available, otherwise use Indore city center as fallback
    const centerLat = location.latitude || 22.7196;
    const centerLng = location.longitude || 75.8577;

    const mapOptions: google.maps.MapOptions = {
      center: { lat: centerLat, lng: centerLng },
      zoom: 15,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
      zoomControl: true,
    };

    // Create map instance
    const map = new google.maps.Map(mapRef.current, mapOptions);
    mapInstanceRef.current = map;

    // Create marker for current location (use fallback if location not available)
    const markerLat = location.latitude || centerLat;
    const markerLng = location.longitude || centerLng;
    
    const marker = new google.maps.Marker({
      position: { lat: markerLat, lng: markerLng },
      map: map,
      title: "Patient's Location",
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="8" fill="#DC2626" stroke="#FFFFFF" stroke-width="2"/>
            <circle cx="12" cy="12" r="3" fill="#FFFFFF"/>
          </svg>
        `),
        scaledSize: new google.maps.Size(24, 24),
        anchor: new google.maps.Point(12, 12)
      }
    });

    markerRef.current = marker;

    // Add info window with appropriate content
    let infoContent = '';
    if (patientLocation && patientLocation.latitude && patientLocation.longitude && 
        patientLocation.latitude !== 0 && patientLocation.longitude !== 0) {
      // Show patient location info
      infoContent = `
        <div style="padding: 8px;">
          <h3 style="margin: 0 0 4px 0; font-size: 14px; font-weight: bold;">🚨 Patient's Location</h3>
          <p style="margin: 0; font-size: 12px; color: #666;">
            Emergency coordinates<br>
            Lat: ${patientLocation.latitude.toFixed(6)}<br>
            Lng: ${patientLocation.longitude.toFixed(6)}
          </p>
        </div>
      `;
    } else {
      // Show operator's current location (when no patient request)
      infoContent = `
        <div style="padding: 8px;">
          <h3 style="margin: 0 0 4px 0; font-size: 14px; font-weight: bold;">📍 Patient's Location</h3>
          <p style="margin: 0; font-size: 12px; color: #666;">
            Current coordinates<br>
            Lat: ${markerLat.toFixed(6)}<br>
            Lng: ${markerLng.toFixed(6)}
          </p>
        </div>
      `;
    }

    const infoWindow = new google.maps.InfoWindow({
      content: infoContent
    });

    marker.addListener('click', () => {
      infoWindow.open(map, marker);
    });

    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
    };
  }, [isMapLoaded, location.latitude, location.longitude]);



  // Get location on component mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Update map center when location changes (with debouncing)
  useEffect(() => {
    if (mapInstanceRef.current && location.latitude && location.longitude) {
      const newCenter = { lat: location.latitude, lng: location.longitude };
      
      // Only update if location has actually changed significantly
      const currentCenter = mapInstanceRef.current.getCenter();
      if (currentCenter) {
        const latDiff = Math.abs(currentCenter.lat() - newCenter.lat);
        const lngDiff = Math.abs(currentCenter.lng() - newCenter.lng);
        
        // Only update if moved more than ~100 meters (rough calculation)
        if (latDiff > 0.001 || lngDiff > 0.001) {
          mapInstanceRef.current.panTo(newCenter);
          
          if (markerRef.current) {
            markerRef.current.setPosition(newCenter);
          }
        }
      } else {
        // First time setting position
        mapInstanceRef.current.setCenter(newCenter);
        
        if (markerRef.current) {
          markerRef.current.setPosition(newCenter);
        }
      }
    }
  }, [location.latitude, location.longitude]);

  // Effect to load all ambulances for patient view
  useEffect(() => {
    if (showAllAmbulances && isMapLoaded) {
      createAllAmbulanceMarkers();
      // Refresh every 30 seconds
      const interval = setInterval(createAllAmbulanceMarkers, 30000);
      return () => clearInterval(interval);
    }
  }, [showAllAmbulances, isMapLoaded]);

  // Function to create all ambulance markers for patient view
  const createAllAmbulanceMarkers = async () => {
    if (!isMapLoaded || !mapInstanceRef.current || !showAllAmbulances) return;

    // Clear existing all ambulance markers
    allAmbulanceMarkersRef.current.forEach(marker => marker.setMap(null));
    allAmbulanceMarkersRef.current = [];

    try {
      // Fetch all ambulance locations with authentication
      const token = getAuthToken();
      const response = await fetch('/api/ambulances/locations', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const ambulances = await response.json();
      console.log('📍 Fetched ambulances for patient map:', ambulances);
      setAllAmbulances(ambulances);
      
      ambulances.forEach((ambulance: any) => {
        if (ambulance.currentLatitude && ambulance.currentLongitude) {
          const lat = parseFloat(ambulance.currentLatitude);
          const lng = parseFloat(ambulance.currentLongitude);
          
          if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
            console.log(`🚑 Adding ambulance ${ambulance.vehicleNumber} at [${lat}, ${lng}]`);
            const marker = new google.maps.Marker({
              position: { lat, lng },
              map: mapInstanceRef.current,
              title: `Ambulance ${ambulance.vehicleNumber}`,
              icon: {
                url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
                  <svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="18" cy="18" r="16" fill="#22c55e" stroke="white" stroke-width="2"/>
                    <text x="18" y="23" text-anchor="middle" fill="white" font-size="18" font-weight="bold">🚑</text>
                  </svg>
                `),
                scaledSize: new google.maps.Size(36, 36),
                anchor: new google.maps.Point(18, 18)
              }
            });

            // Create info window content
            const infoContent = `
              <div style="padding: 8px; min-width: 200px;">
                <h3 style="margin: 0 0 8px 0; color: #22c55e; font-weight: bold;">
                  ${ambulance.vehicleNumber}
                </h3>
                <p style="margin: 4px 0; font-size: 14px;">
                  <strong>Status:</strong> ${ambulance.status || 'Available'}
                </p>
                <p style="margin: 4px 0; font-size: 14px;">
                  <strong>Equipment:</strong> ${ambulance.equipmentLevel || 'Standard'}
                </p>
                <p style="margin: 4px 0; font-size: 14px;">
                  <strong>Hospital:</strong> ${ambulance.hospitalAffiliation || 'Independent'}
                </p>
              </div>
            `;

            const infoWindow = new google.maps.InfoWindow({
              content: infoContent
            });

            // Add click listener to show info window
            marker.addListener('click', () => {
              // Close all other info windows
              allAmbulanceMarkersRef.current.forEach(m => {
                if ((m as any).infoWindow) {
                  ((m as any).infoWindow).close();
                }
              });
              infoWindow.open(mapInstanceRef.current, marker);
            });

            (marker as any).infoWindow = infoWindow;
            allAmbulanceMarkersRef.current.push(marker);
          }
        }
      });
    } catch (error) {
      console.error('Failed to fetch all ambulance locations:', error);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapPin className="w-5 h-5" />
            <span>{title}</span>
          </div>
          {showRefreshButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Clear cache to force fresh location
                localStorage.removeItem('userLocation');
                localStorage.removeItem('userLocationTimestamp');
                getCurrentLocation();
              }}
              disabled={location.isLoading}
              className="flex items-center space-x-1"
            >
              <RefreshCw className={`w-4 h-4 ${location.isLoading ? 'animate-spin' : ''}`} />
              <span>{location.isLoading ? 'Getting...' : 'Refresh'}</span>
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {location.isLoading ? (
          <div 
            className="flex items-center justify-center bg-gray-100 rounded-lg"
            style={{ height }}
          >
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-600">Getting your location...</p>
            </div>
          </div>
        ) : location.error ? (
          <div className="space-y-3">
            {location.latitude && location.longitude ? (
              // Show static map fallback if location is available but Google Maps failed
              <div 
                className="bg-gray-100 border border-gray-200 rounded-lg overflow-hidden"
                style={{ height }}
              >
                <iframe
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.longitude-0.01},${location.latitude-0.01},${location.longitude+0.01},${location.latitude+0.01}&layer=mapnik&marker=${location.latitude},${location.longitude}`}
                  title="Location Map"
                />
              </div>
            ) : (
              <div 
                className="flex items-center justify-center bg-red-50 border border-red-200 rounded-lg"
                style={{ height }}
              >
                <div className="text-center p-4">
                  <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                  <p className="text-red-700 font-medium mb-2">Location Error</p>
                  <p className="text-red-600 text-sm mb-3">{location.error}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={getCurrentLocation}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            )}
            
            {/* Show instructions for fixing Google Maps */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-yellow-800 text-sm font-medium mb-1">Google Maps API Domain Restriction</p>
                  <p className="text-yellow-700 text-xs">
                    Add your Replit domain to your Google Maps API key in Google Cloud Console, or set restrictions to "None" for development.
                  </p>
                </div>
              </div>
            </div>
            
            {location.latitude && location.longitude && (
              <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                <strong>Current coordinates:</strong> {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              </div>
            )}
          </div>
        ) : !isMapLoaded ? (
          <div 
            className="flex items-center justify-center bg-gray-100 rounded-lg"
            style={{ height }}
          >
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-600">Loading map...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div 
              ref={mapRef}
              className="w-full rounded-lg border"
              style={{ height }}
            />
            {location.latitude && location.longitude && (
              <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                <strong>Current coordinates:</strong> {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Type declarations for Google Maps
declare global {
  interface Window {
    google: typeof google;
  }
}