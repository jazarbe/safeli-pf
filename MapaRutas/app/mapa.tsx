// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { Alert, View, StyleSheet, TextInput, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { getRoute } from '../services/googleApi'; 
import polyline from '@mapbox/polyline';

export default function MapaScreen() {
  const mapRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [destination, setDestination] = useState('');
  const [routeCoords, setRouteCoords] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permiso denegado", "Necesitamos GPS para Safeli");
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      // Aquí definimos 'current' correctamente
      const current = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setUserLocation(current);
    })();
  }, []);

  const manejarBusqueda = async () => {
    if (!destination || !userLocation) return;

    setLoading(true);
    const data = await getRoute(userLocation, destination);

    if (data && data.routes && data.routes.length > 0) {
      const encoded = data.routes[0].polyline.encodedPolyline;
      
      // Decodificamos la polyline (esto devuelve un array de arrays)
      const points = polyline.decode(encoded); 
      
      // Transformamos los puntos para que Google Maps los entienda
      // 'p' es cada punto [lat, lng]
      const coords = points.map(p => ({
        latitude: p[0],
        longitude: p[1],
      }));
      
      setRouteCoords(coords);

      // Ajustamos la cámara para ver toda la ruta
      if (mapRef.current?.fitToCoordinates) {
        mapRef.current.fitToCoordinates(coords, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
      }
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        // Usamos una validación simple para el initialRegion
        initialRegion={userLocation ? {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        } : {
          latitude: -34.6037, // Fallback Buenos Aires
          longitude: -58.3816,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
      >
        {userLocation && <Marker coordinate={userLocation} title="Tu ubicación" />}
        
        {routeCoords.length > 0 && (
          <Polyline 
            coordinates={routeCoords} 
            strokeWidth={5} 
            strokeColor="#3B82F6" 
          />
        )}
      </MapView>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="¿A dónde vas?"
          value={destination}
          onChangeText={setDestination}
        />
        <TouchableOpacity style={styles.button} onPress={manejarBusqueda}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Ir</Text>}
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
  input: { flex: 1, height: 40 },
  button: { backgroundColor: '#3B82F6', padding: 10, borderRadius: 8, marginLeft: 10 },
  btnText: { color: 'white', fontWeight: 'bold' }
});