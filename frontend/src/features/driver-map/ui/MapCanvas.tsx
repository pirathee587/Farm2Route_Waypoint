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
  autoFocus: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resize: () => void;
}

interface MapCanvasProps {
  routeData: TripRouteResponse | null;
  fullGeometry: GeoJSONLineString | null;
  driverLocation: DriverGeoLocation | null;
  mapboxToken?: string;
  isFullScreen?: boolean;
  onSelectStop?: (stopId: string) => void;
}

export const MapCanvas = forwardRef<MapCanvasHandles, MapCanvasProps>(
  ({ routeData, fullGeometry, driverLocation, mapboxToken: propToken, isFullScreen = false, onSelectStop }, ref) => {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);

    // Marker tracking maps for diffing
    const stopMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
    const depotMarkerRef = useRef<mapboxgl.Marker | null>(null);
    const driverMarkerRef = useRef<mapboxgl.Marker | null>(null);

    // Tracking fitBounds triggers
    const hasInitialFittedRef = useRef<boolean>(false);
    const hasFittedDriverRef = useRef<boolean>(false);
    const lastFittedNextStopIdRef = useRef<string | null>(null);

    const mapboxToken = (propToken !== undefined ? propToken : (import.meta.env.VITE_MAPBOX_TOKEN || '')).trim();
    const isTokenMissing = !mapboxToken;

    const isValidCoordinate = (lng?: number | null, lat?: number | null): boolean => {
      return Boolean(
        lng !== undefined &&
        lat !== undefined &&
        Number.isFinite(lng) &&
        Number.isFinite(lat) &&
        (lng !== 0 || lat !== 0) &&
        Math.abs(lat!) <= 90 &&
        Math.abs(lng!) <= 180
      );
    };

    const fitDriverAndTarget = (animated: boolean = true) => {
      const map = mapRef.current;
      if (!map || !routeData) return;

      const nextStopId = routeData.next_stop?.stop_id;
      const targetStop =
        (nextStopId ? routeData.stops?.find((s) => s.stop_id === nextStopId) : null) ||
        routeData.stops?.find((s) => {
          const st = (s.status || '').toUpperCase();
          return st === 'IN_PROGRESS' || st === 'ARRIVED' || st === 'PENDING' || st === 'WAITING_FOR_WINDOW';
        }) ||
        routeData.stops?.find((s) => isValidCoordinate(s.lng, s.lat));

      const hasDriver = isValidCoordinate(driverLocation?.lng, driverLocation?.lat);
      const hasTarget = targetStop && isValidCoordinate(targetStop.lng, targetStop.lat);

      // Case 1: Both Driver Location and Target Arrival Stop exist!
      // Core requirement: Auto focus both driver current location AND destination arrival stop
      if (hasDriver && hasTarget && driverLocation && targetStop) {
        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend([driverLocation.lng, driverLocation.lat]);
        bounds.extend([targetStop.lng, targetStop.lat]);

        // Optional: Include nearby points of active route leg
        if (routeData.route_geometry?.coordinates?.length) {
          const minLng = Math.min(driverLocation.lng, targetStop.lng) - 0.08;
          const maxLng = Math.max(driverLocation.lng, targetStop.lng) + 0.08;
          const minLat = Math.min(driverLocation.lat, targetStop.lat) - 0.08;
          const maxLat = Math.max(driverLocation.lat, targetStop.lat) + 0.08;

          routeData.route_geometry.coordinates.forEach(([lng, lat]) => {
            if (isValidCoordinate(lng, lat)) {
              if (lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat) {
                bounds.extend([lng, lat]);
              }
            }
          });
        }

        map.fitBounds(bounds, {
          padding: isFullScreen
            ? { top: 90, bottom: 90, left: 60, right: 60 }
            : { top: 170, bottom: 220, left: 60, right: 60 },
          maxZoom: 15.5,
          duration: animated ? 1100 : 0,
        });
        return;
      }

      // Case 2: Only Driver Location is known
      if (hasDriver && driverLocation) {
        const hasDepot = isValidCoordinate(routeData.depot?.lng, routeData.depot?.lat);
        if (hasDepot && routeData.depot) {
          const bounds = new mapboxgl.LngLatBounds();
          bounds.extend([driverLocation.lng, driverLocation.lat]);
          bounds.extend([routeData.depot.lng, routeData.depot.lat]);
          map.fitBounds(bounds, {
            padding: isFullScreen
              ? { top: 90, bottom: 90, left: 60, right: 60 }
              : { top: 170, bottom: 220, left: 60, right: 60 },
            maxZoom: 15.5,
            duration: animated ? 1000 : 0,
          });
        } else {
          map.flyTo({
            center: [driverLocation.lng, driverLocation.lat],
            zoom: 14.5,
            essential: true,
          });
        }
        return;
      }

      // Case 3: Only Target Arrival Stop is known
      if (hasTarget && targetStop) {
        map.flyTo({
          center: [targetStop.lng, targetStop.lat],
          zoom: 14.5,
          essential: true,
        });
        return;
      }

      // Case 4: Fallback to Depot
      if (isValidCoordinate(routeData.depot?.lng, routeData.depot?.lat)) {
        map.flyTo({
          center: [routeData.depot.lng, routeData.depot.lat],
          zoom: 13,
          essential: true,
        });
      }
    };

    // Expose control handles to parent
    useImperativeHandle(ref, () => ({
      recenterOnDriver: () => {
        fitDriverAndTarget(true);
      },
      autoFocus: () => {
        fitDriverAndTarget(true);
      },
      zoomIn: () => {
        mapRef.current?.zoomIn();
      },
      zoomOut: () => {
        mapRef.current?.zoomOut();
      },
      resize: () => {
        mapRef.current?.resize();
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

        // Initial auto-focus on driver + arrival target stop as soon as map finishes loading
        setTimeout(() => {
          map.resize();
          fitDriverAndTarget(false);
        }, 100);
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
      if (
        !map ||
        !routeData?.depot ||
        (!routeData.depot.lat && !routeData.depot.lng)
      ) return;

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

    // 6. Camera Bounds Management: Auto focus driver and arrival target stop
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !routeData) return;

      const currentNextStopId = routeData.next_stop?.stop_id || null;
      const hasUsableDriverLocation = isValidCoordinate(driverLocation?.lng, driverLocation?.lat);

      const shouldFit =
        !hasInitialFittedRef.current ||
        (hasUsableDriverLocation && !hasFittedDriverRef.current) ||
        (currentNextStopId && currentNextStopId !== lastFittedNextStopIdRef.current);

      if (shouldFit) {
        fitDriverAndTarget(hasInitialFittedRef.current);
        hasInitialFittedRef.current = true;
        if (hasUsableDriverLocation) hasFittedDriverRef.current = true;
        lastFittedNextStopIdRef.current = currentNextStopId;
      }
    }, [routeData, driverLocation]);

    // Handle isFullScreen toggle resize and autoFocus
    useEffect(() => {
      const map = mapRef.current;
      if (!map) return;
      const t = setTimeout(() => {
        map.resize();
        fitDriverAndTarget(true);
      }, 150);
      return () => clearTimeout(t);
    }, [isFullScreen]);

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
          minHeight: isFullScreen ? '100vh' : '520px',
          position: 'relative',
        }}
      />
    );
  }
);
