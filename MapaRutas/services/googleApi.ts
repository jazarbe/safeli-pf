import polyline from '@mapbox/polyline';

const GOOGLE_API_KEY = 'AIzaSyCdskEeFYDGRFyPSdaJizI_Y_8jaDkW_O4';

export type LatLng = { lat: number; lng: number };

export const getRoute = async (origin: { lat: number; lng: number }, destinationAddress: string) => {
  try {
    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'routes.polyline.encodedPolyline,routes.duration,routes.distanceMeters',
      },
      body: JSON.stringify({
        origin: { location: { latLng: origin } },
        destination: { address: destinationAddress },
        travelMode: 'DRIVE',
      }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error en la API de Google:', error);
    return null;
  }
};

export const decodePolyline = (encoded?: string) => {
  if (!encoded) return [];
  const points = polyline.decode(encoded); // returns array of [lat, lng]
  return points.map(([lat, lng]) => ({ latitude: lat, longitude: lng }));
};

export default { getRoute, decodePolyline };
