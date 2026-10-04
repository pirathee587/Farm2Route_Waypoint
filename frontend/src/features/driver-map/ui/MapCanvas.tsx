import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  TripRouteResponse,
  GeoJSONLineString,
  DriverGeoLocation,
  RouteStop,
} from '../model/types';
import {
  createStopMarkerElement,
  createDepotMarkerElement,
  createDriverMarkerElement,
  filterVisibleStops,
} from '../lib/StopMarker';
import { MapPinOff, AlertTriangle } from 'lucide-react';

export interface MapCanvasHandles {
  recenterOnDriver: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

interface MapCanvasProps {
  routeData: TripRouteResponse | null;
  fullGeometry: GeoJSONLineString | null;
  driverLocation: DriverGeoLocation | null;
  mapboxToken?: string;
  onSelectStop?: (stopId: string) => void;
}

export const MapCanvas = forwardRef<MapCanvasHandles, MapCanvasProps>(
  ({ routeData, fullGeometry, driverLocation, mapboxToken: propToken, onSelectStop }, ref) => {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);

    // Marker tracking maps for diffing
    const stopMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
    const depotMarkerRef = useRef<mapboxgl.Marker | null>(null);
    const driverMarkerRef = useRef<mapboxgl.Marker | null>(null);

    // Tracking fitBounds triggers
    const hasInitialFittedRef = useRef<boolean>(false);
    const lastFittedNextStopIdRef = useRef<string | null>(null);

    const mapboxToken = (propToken !== undefined ? propToken : (import.meta.env.VITE_MAPBOX_TOKEN || '')).trim();
    const isTokenMissing = !mapboxToken;

    // Expose control handles to parent
    useImperativeHandle(ref, () => ({
      recenterOnDriver: () => {
        if (!mapRef.current) return;
        const targetLngLat = driverLocation
          ? [driverLocation.lng, driverLocation.lat]
          : routeData?.next_stop
          ? [
              routeData.stops.find((s) => s.stop_id === routeData.next_stop?.stop_id)?.lng ??
                routeData.depot.lng,
              routeData.stops.find((s) => s.stop_id === routeData.next_stop?.stop_id)?.lat ??
                routeData.depot.lat,
            ]
          : routeData?.depot
          ? [routeData.depot.lng, routeData.depot.lat]
          : null;

        if (targetLngLat) {
          mapRef.current.flyTo({
            center: targetLngLat as [number, number],
            zoom: 14.5,
            essential: true,
          });
        }
      },
      zoomIn: () => {
        mapRef.current?.zoomIn();
      },
      zoomOut: () => {
        mapRef.current?.zoomOut();
      },
    }));

    // 1. Initialize Mapbox GL instance once
    useEffect(() => {
      if (isTokenMissing || !mapContainerRef.current) return;

      mapboxgl.accessToken = mapboxToken;

      const defaultCenter: [number, number] = [
        routeData?.depot?.lng ?? 79.8891,
        routeData?.depot?.lat ?? 6.9632,
      ];

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: defaultCenter,
        zoom: 12,
        attributionControl: false, // Cleaner mobile view
      });

      mapRef.current = map;

      map.on('load', () => {
        // Source & Layer for Full Trip geometry (dashed lighter blue line)
        map.addSource('full-route-source', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: fullGeometry || { type: 'LineString', coordinates: [] },
          },
        });

        map.addLayer({
          id: 'full-route-layer',
          type: 'line',
          source: 'full-route-source',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#93c5fd', // Lighter dashed blue
            'line-width': 4,
            'line-dasharray': [2, 2],
          },
        });

        // Source & Layer for Current Active Route segment (#2F6FED blue, width 5)
        map.addSource('route-source', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: routeData?.route_geometry || { type: 'LineString', coordinates: [] },
          },
        });

        map.addLayer({
          id: 'route-layer',
          type: 'line',
          source: 'route-source',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#2F6FED',
            'line-width': 5,
          },
        });
      });

      // Cleanup on unmount: remove markers and map
      return () => {
        stopMarkersRef.current.forEach((m) => m.remove());
        stopMarkersRef.current.clear();
        depotMarkerRef.current?.remove();
        driverMarkerRef.current?.remove();
        map.remove();
        mapRef.current = null;
      };
    }, [isTokenMissing, mapboxToken]);

    // 2. Update Route Geometry Lines on Data Updates
    useEffect(() => {
      const map = mapRef.current;
      if (!map) return;

      const routeSource = map.getSource('route-source') as mapboxgl.GeoJSONSource | undefined;
      if (routeSource && routeData?.route_geometry) {
        routeSource.setData({
          type: 'Feature',
          properties: {},
          geometry: routeData.route_geometry,
        });
      }

      const fullSource = map.getSource('full-route-source') as mapboxgl.GeoJSONSource | undefined;
      if (fullSource && fullGeometry) {
        fullSource.setData({
          type: 'Feature',
          properties: {},
          geometry: fullGeometry,
        });
      }
    }, [routeData?.route_geometry, fullGeometry]);

    // 3. Update Depot Marker
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !routeData?.depot) return;

      const depot = routeData.depot;
      if (!depotMarkerRef.current) {
        const el = createDepotMarkerElement(depot.name);
        depotMarkerRef.current = new mapboxgl.Marker({ element: el })
          .setLngLat([depot.lng, depot.lat])
          .addTo(map);
      } else {
        depotMarkerRef.current.setLngLat([depot.lng, depot.lat]);
      }
    }, [routeData?.depot]);

    // 4. Update Driver Location Marker (pulsing blue dot)
    useEffect(() => {
      const map = mapRef.current;
      if (!map) return;

      if (driverLocation && driverLocation.lat && driverLocation.lng) {
        if (!driverMarkerRef.current) {
          const el = createDriverMarkerElement();
          driverMarkerRef.current = new mapboxgl.Marker({ element: el })
            .setLngLat([driverLocation.lng, driverLocation.lat])
            .addTo(map);
        } else {
          driverMarkerRef.current.setLngLat([driverLocation.lng, driverLocation.lat]);
        }
      }
    }, [driverLocation]);

    // 5. Update Stop Markers with Diffing (exclude REMOVED)
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !routeData?.stops) return;

      const visibleStops = filterVisibleStops(routeData.stops);
      const currentStopIds = new Set<string>();
      const nextStopId = routeData.next_stop?.stop_id;

      visibleStops.forEach((stop) => {
        const id = stop.stop_id || `${stop.seq}`;
        currentStopIds.add(id);

        const isNext = stop.stop_id === nextStopId;
        const existingMarker = stopMarkersRef.current.get(id);

        if (!existingMarker) {
          const el = createStopMarkerElement(stop, isNext, () => {
            if (onSelectStop) onSelectStop(stop.stop_id);
          });
          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat([stop.lng, stop.lat])
            .addTo(map);
          stopMarkersRef.current.set(id, marker);
        } else {
          // Update location and element if status changed
          existingMarker.setLngLat([stop.lng, stop.lat]);
        }
      });

      // Remove obsolete markers that are no longer in visible stops
      stopMarkersRef.current.forEach((marker, id) => {
        if (!currentStopIds.has(id)) {
          marker.remove();
          stopMarkersRef.current.delete(id);
        }
      });
    }, [routeData?.stops, routeData?.next_stop, onSelectStop]);

    // 6. Camera Bounds Management: FitBounds on first load or next stop change
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !routeData) return;

      const currentNextStopId = routeData.next_stop?.stop_id || null;
      const shouldFit =
        !hasInitialFittedRef.current ||
        (currentNextStopId && currentNextStopId !== lastFittedNextStopIdRef.current);

      if (shouldFit) {
        const bounds = new mapboxgl.LngLatBounds();

        // 1. Depot
        if (routeData.depot) {
          bounds.extend([routeData.depot.lng, routeData.depot.lat]);
        }

        // 2. Next Stop
        if (routeData.next_stop) {
          const nextStopObj = routeData.stops.find(
            (s) => s.stop_id === routeData.next_stop?.stop_id
          );
          if (nextStopObj) {
            bounds.extend([nextStopObj.lng, nextStopObj.lat]);
          }
        }

        // 3. Driver Location
        if (driverLocation) {
          bounds.extend([driverLocation.lng, driverLocation.lat]);
        }

        // 4. If geometry exists, extend with initial points
        if (routeData.route_geometry?.coordinates?.length) {
          routeData.route_geometry.coordinates.forEach((coord) => {
            bounds.extend(coord as [number, number]);
          });
        }

        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, {
            padding: { top: 200, bottom: 320, left: 60, right: 60 },
            maxZoom: 15,
            duration: hasInitialFittedRef.current ? 1200 : 0,
          });
          hasInitialFittedRef.current = true;
          lastFittedNextStopIdRef.current = currentNextStopId;
        }
      }
    }, [routeData, driverLocation]);

    // Token Missing Friendly State
    if (isTokenMissing) {
      return (
        <div
          className="waypoint-map-unavailable-container"
          style={{
            width: '100%',
            height: '100%',
            minHeight: '480px',
            backgroundColor: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            textAlign: 'center',
            border: '2px dashed #cbd5e1',
            borderRadius: 20,
            margin: '10px 0',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <MapPinOff size={28} />
          </div>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
            Interactive Map Unavailable
          </h2>
          <p
            style={{
              fontSize: 13,
              color: '#64748b',
              maxWidth: 300,
              margin: '0 0 16px 0',
              lineHeight: 1.4,
            }}
          >
            VITE_MAPBOX_TOKEN is not configured. Navigation instructions, stop lists, and delivery
            actions are fully functional above and below.
          </p>
        </div>
      );
    }

    return (
      <div
        ref={mapContainerRef}
        className="waypoint-mapbox-canvas"
        style={{
          width: '100%',
          height: '100%',
          minHeight: '520px',
          position: 'relative',
        }}
      />
    );
  }
);
