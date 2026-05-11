// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import { Alert, ActivityIndicator, StyleSheet, TextInput, TouchableOpacity, View, Text } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import polyline from '@mapbox/polyline';

import { getRoute } from '../services/googleApi';

export default function HomeScreen() {
  // @ts-ignore
  const mapRef = useRef(null);
  // @ts-ignore
  const [userLocation, setUserLocation] = useState(null);
  const setUserLocationAny = /** @type {any} */ (setUserLocation);
  const [destination, setDestination] = useState('');
  // @ts-ignore
  const [routeCoords, setRouteCoords] = useState([]);
  const setRouteCoordsAny = /** @type {any} */ (setRouteCoords);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos GPS para Safeli');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      // @ts-ignore
      setUserLocationAny({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    })();
  }, []);

  const handleSearch = async () => {
    if (!destination || !userLocation) return;

    setLoading(true);
    const data = await getRoute(userLocation, destination);

    if (data && data.routes && data.routes.length > 0) {
      const encoded = data.routes[0].polyline.encodedPolyline;
      const points = polyline.decode(encoded);
      const coords = points.map(([latitude, longitude]) => ({ latitude, longitude }));
      // @ts-ignore
      setRouteCoordsAny(coords);

      const anyMapRef = /** @type {any} */ (mapRef.current);
      if (anyMapRef?.fitToCoordinates) {
        anyMapRef.fitToCoordinates(coords, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
      }
    } else {
      Alert.alert('Ruta no encontrada', 'No se pudo obtener una ruta para ese destino.');
    }

    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={
          userLocation
            ? {
                // @ts-ignore
                latitude: userLocation.latitude,
                // @ts-ignore
                longitude: userLocation.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }
            : {
                latitude: -34.6037,
                longitude: -58.3816,
                latitudeDelta: 0.1,
                longitudeDelta: 0.1,
              }
        }
      >
        {userLocation && <Marker coordinate={userLocation} title="Tu ubicación" />}
        {routeCoords.length > 0 && (
          <Polyline coordinates={routeCoords} strokeWidth={5} strokeColor="#3B82F6" />
        )}
      </MapView>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="¿A dónde vas?"
          value={destination}
          onChangeText={setDestination}
        />
        <TouchableOpacity style={styles.button} onPress={handleSearch}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Ir</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  searchContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 12,
    elevation: 7,
  },
  input: {
    flex: 1,
    height: 40,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 8,
    marginLeft: 10,
  },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
