// locationUtils.js — Geographic utility functions

// Calculate distance using Haversine formula
export const getDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;

  const toRad = (value) => (value * Math.PI) / 180;
  
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance; // Distance in km
};

export const formatDistance = (distanceInKm) => {
  if (distanceInKm === null || distanceInKm === undefined) return '';
  if (distanceInKm < 1) {
    return `${Math.round(distanceInKm * 1000)} m`;
  }
  return `${distanceInKm.toFixed(1)} km`;
};

export const calculateETA = (lat1, lon1, lat2, lon2, vehicleSpeedKmh) => {
  const distKm = getDistance(lat1, lon1, lat2, lon2);
  if (distKm === null) return null;
  
  const speed = vehicleSpeedKmh || 25; 
  const durationMins = Math.ceil((distKm / speed) * 60);
  
  return { distanceKm: distKm, durationMins };
};

export const formatETA = (durationMins) => {
  if (durationMins === null || durationMins === undefined) return '';
  if (durationMins < 1) return 'Due now';
  if (durationMins > 60) {
    const hrs = Math.floor(durationMins / 60);
    const mins = durationMins % 60;
    return `${hrs}h ${mins}m`;
  }
  return `${durationMins} mins`;
};
