// Preloader utility to warm up critical data caches
export const preloadCriticalData = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Preload critical endpoints in parallel
    const baseUrl = window.location.origin;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    const preloadPromises = [
      fetch(`${baseUrl}/api/hospitals/nearby`, { headers }),
      fetch(`${baseUrl}/api/ambulances/locations`, { headers }),
      fetch(`${baseUrl}/api/emergency/requests`, { headers }),
    ];

    // Fire and forget - don't wait for completion
    Promise.allSettled(preloadPromises).catch(() => {
      // Silent failure - this is just optimization
    });
  } catch (error) {
    // Silent failure - this is just optimization
  }
};