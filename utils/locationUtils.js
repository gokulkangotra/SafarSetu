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
  const durationMins = (distKm / speed) * 60;
  
  return { distanceKm: distKm, durationMins };
};

export const formatETA = (durationMins) => {
  if (durationMins === null || durationMins === undefined) return '';
  const roundedMins = Math.round(durationMins);
  if (roundedMins < 1) return 'Due now';
  if (roundedMins >= 60) {
    const hrs = Math.floor(roundedMins / 60);
    const mins = roundedMins % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }
  return `${roundedMins} mins`;
};

export const getOrderedStops = (stops, direction = 'onward') => {
  if (!stops) return [];
  const sorted = [...stops].sort((a,b) => (a.order || 0) - (b.order || 0));
  if (direction === 'return' || direction === 'reverse') {
    return sorted.reverse();
  }
  return sorted;
};

export const getVehicleNextStopIndex = (v, sortedStops) => {
  if (!v.location?.latitude || !v.location?.longitude || sortedStops.length < 2) return 0;
  
  let bestSegmentIndex = 0;
  let minDistanceToSegment = Infinity;
  let isBeforeFirstStop = false;
  let isPastLastStop = false;
  
  const vLat = v.location.latitude;
  const vLng = v.location.longitude;

  for (let i = 0; i < sortedStops.length - 1; i++) {
      const A = sortedStops[i];
      const B = sortedStops[i+1];
      
      const dPA = getDistance(vLat, vLng, A.latitude, A.longitude) || 0;
      const dPB = getDistance(vLat, vLng, B.latitude, B.longitude) || 0;
      const dAB = getDistance(A.latitude, A.longitude, B.latitude, B.longitude) || 0;
      
      const s = (dPA + dPB + dAB) / 2;
      const area = Math.sqrt(Math.max(0, s * (s - dPA) * (s - dPB) * (s - dAB)));
      let distToLine = dAB > 0 ? (2 * area) / dAB : dPA;
      
      let beforeA = false;
      let pastB = false;
      
      if (dAB > 0) {
          const dPA2 = dPA * dPA;
          const dPB2 = dPB * dPB;
          const dAB2 = dAB * dAB;
          if (dPA2 > dPB2 + dAB2) {
              distToLine = dPB; 
              pastB = true;
          } else if (dPB2 > dPA2 + dAB2) {
              distToLine = dPA; 
              beforeA = true;
          }
      }
      
      if (distToLine < minDistanceToSegment) {
          minDistanceToSegment = distToLine;
          bestSegmentIndex = i;
          isBeforeFirstStop = (i === 0 && beforeA);
          isPastLastStop = (i === sortedStops.length - 2 && pastB);
      }
  }
  
  if (isBeforeFirstStop) return 0;
  if (isPastLastStop) return sortedStops.length;
  
  return bestSegmentIndex + 1;
};
