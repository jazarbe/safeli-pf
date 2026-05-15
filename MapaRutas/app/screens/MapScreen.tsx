import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput, Button, StyleSheet, Text, FlatList, TouchableOpacity, Keyboard } from 'react-native';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRoute, decodePolyline } from '../../services/googleApi';

type Coord = { latitude: number; longitude: number };

const STORAGE_KEY = 'map_search_history';

export default function MapScreen() {
  const [region, setRegion] = useState<Region | null>(null);
  const [query, setQuery] = useState('');
  const [polylineCoords, setPolylineCoords] = useState<Coord[]>([]);
  const [destCoord, setDestCoord] = useState<Coord | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setRegion({ latitude: 37.78825, longitude: -122.4324, latitudeDelta: 0.05, longitudeDelta: 0.05 });
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setRegion({ latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 });
    })();
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch (e) {
      console.warn('Failed to load history', e);
    }
  };

  const saveToHistory = async (address: string) => {
    try {
      const next = [address, ...history.filter(h => h !== address)].slice(0, 20);
      setHistory(next);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn('Failed to save history', e);
    }
  };

  const handleSearch = async (address?: string) => {
    const dest = address ?? query;
    if (!dest || !region) return;
    Keyboard.dismiss();
    // origin lat/lng from region center
    const origin = { lat: region.latitude, lng: region.longitude };
    const data = await getRoute(origin, dest);
    const encoded = data?.routes?.[0]?.polyline?.encodedPolyline || data?.routes?.[0]?.overview_polyline?.points;
    const coords = decodePolyline(encoded);
    if (coords.length > 0) {
      setPolylineCoords(coords);
      const last = coords[coords.length - 1];
      setDestCoord(last);
      // Fit map to coords
      mapRef.current?.fitToCoordinates(coords, { edgePadding: { top: 80, right: 40, bottom: 80, left: 40 }, animated: true });
      saveToHistory(dest);
    } else {
      console.warn('No se obtuvo polilínea de la ruta');
    }
  };

  return (
    <View style={styles.container}>
      {region && (
        <MapView ref={mapRef} style={styles.map} initialRegion={region}>
          <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }} title="Origen" />
          {destCoord && <Marker coordinate={destCoord} title="Destino" pinColor="blue" />}
          {polylineCoords.length > 0 && <Polyline coordinates={polylineCoords} strokeColor="#2f95dc" strokeWidth={4} />}
        </MapView>
      )}
      <View style={styles.searchContainer}>
        <TextInput placeholder="Ingresa dirección o lugar" value={query} onChangeText={setQuery} style={styles.input} />
        <Button title="Ir" onPress={() => handleSearch()} />
      </View>
      <View style={styles.historyContainer}>
        <Text style={styles.historyTitle}>Historial</Text>
        <FlatList
          data={history}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.historyItem} onPress={() => handleSearch(item)}>
              <Text>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  searchContainer: { position: 'absolute', top: 40, left: 16, right: 16, flexDirection: 'row', backgroundColor: 'white', padding: 8, borderRadius: 8, alignItems: 'center' },
  input: { flex: 1, marginRight: 8, padding: 8 },
  historyContainer: { position: 'absolute', bottom: 20, left: 16, right: 16, maxHeight: 220, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 8, padding: 8 },
  historyTitle: { fontWeight: 'bold', marginBottom: 6 },
  historyItem: { paddingVertical: 8, borderBottomColor: '#eee', borderBottomWidth: 1 },
});
