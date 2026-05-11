const GOOGLE_API_KEY = 'AIzaSyCdskEeFYDGRFyPSdaJizI_Y_8jaDkW_O4';

export const getRoute = async (origin, destinationAddress) => {
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
    return await response.json();
  } catch (error) {
    console.error("Error en la API de Google:", error);
    return null;
  }
};