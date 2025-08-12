import { useState, useEffect } from 'react';

interface GeolocationState {
  location: { latitude: number; longitude: number } | null;
  error: string | null;
  isLoading: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      // Use fallback location for Indore, India
      setState({
        location: { latitude: 22.7196, longitude: 75.8577 },
        error: null,
        isLoading: false,
      });
      return;
    }

    // Check for cached location first
    const cachedLocation = localStorage.getItem('userLocation');
    const cacheTimestamp = localStorage.getItem('userLocationTimestamp');
    const now = Date.now();
    const cacheAge = 10 * 60 * 1000; // 10 minutes cache

    if (cachedLocation && cacheTimestamp && (now - parseInt(cacheTimestamp)) < cacheAge) {
      const { latitude, longitude } = JSON.parse(cachedLocation);
      setState({
        location: { latitude, longitude },
        error: null,
        isLoading: false,
      });
      return;
    }

    // Try to get current location with shorter timeout
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        
        // Cache the location
        localStorage.setItem('userLocation', JSON.stringify(locationData));
        localStorage.setItem('userLocationTimestamp', now.toString());
        
        setState({
          location: locationData,
          error: null,
          isLoading: false,
        });
      },
      (error) => {
        console.warn('Geolocation failed, using fallback location:', error.message);
        // Use fallback location for Indore, India instead of showing error
        const fallbackLocation = { latitude: 22.7196, longitude: 75.8577 };
        
        // Cache the fallback location so we don't keep retrying
        localStorage.setItem('userLocation', JSON.stringify(fallbackLocation));
        localStorage.setItem('userLocationTimestamp', now.toString());
        
        setState({
          location: fallbackLocation,
          error: null, // Don't show error, just use fallback
          isLoading: false,
        });
      },
      {
        enableHighAccuracy: false, // Faster response
        timeout: 5000, // Shorter timeout
        maximumAge: 300000, // 5 minutes browser cache
      }
    );
  }, []);

  return state;
}
