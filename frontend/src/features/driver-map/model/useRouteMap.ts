import { useState, useEffect, useRef, useCallback } from 'react';
import {
  TripRouteResponse,
  RouteGeometryResponse,
  DriverGeoLocation,
  GeoJSONLineString,
} from './types';
import { calculateDistanceMeters, roundCoordinate } from '../lib/geo';
import { authSession } from '@/features/auth/authSession';
import { apiRequest } from '@/shared/api/apiClient';

const ROUTE_CACHE_PREFIX = 'waypoint_route_cache_';
const TODAY_CACHE_KEY = 'waypoint_driver_today_cache';

interface UseRouteMapOptions {
  pollingIntervalMs?: number; // default: 20000 (20s)
  movementThresholdMeters?: number; // default: 50m
  initialTripId?: string;
}

export function useRouteMap(options: UseRouteMapOptions = {}) {
  const {
    pollingIntervalMs = 20000,
    movementThresholdMeters = 50,
    initialTripId,
  } = options;

  const [tripId, setTripId] = useState<string | null>(initialTripId || null);
  const [routeData, setRouteData] = useState<TripRouteResponse | null>(null);
  const [fullGeometry, setFullGeometry] = useState<GeoJSONLineString | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOfflineCache, setIsOfflineCache] = useState<boolean>(false);
  const [routeUpdatedToast, setRouteUpdatedToast] = useState<string | null>(null);
  const [todayRetryNonce, setTodayRetryNonce] = useState(0);

  // Driver Geolocation
  const [driverLocation, setDriverLocation] = useState<DriverGeoLocation | null>(null);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState<boolean>(false);
  const lastFetchedLocationRef = useRef<DriverGeoLocation | null>(null);
  const driverLocationRef = useRef<DriverGeoLocation | null>(null);
  const hasRouteDataRef = useRef<boolean>(false);
  const lastLocationSentAtRef = useRef<number>(0);

  // Ref tracking in-flight fetch and debounce
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchTimestampRef = useRef<number>(0);
  const pollTimerRef = useRef<any>(null);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const session = authSession.get();
    if (session?.accessToken) {
      headers['Authorization'] = `Bearer ${session.accessToken}`;
    }
    return headers;
  }, []);

  const sendLocation = useCallback(async (location: DriverGeoLocation) => {
    const now = Date.now();
    if (now - lastLocationSentAtRef.current < 10000) return;
    lastLocationSentAtRef.current = now;
    try {
      await apiRequest('/delivery/driver/location', {
        method: 'POST',
        body: JSON.stringify({
          latitude: location.lat,
          longitude: location.lng,
          accuracy_meters: location.accuracy ?? 0,
          heading: location.heading,
          speed_meters_per_sec: location.speed,
        }),
      });
    } catch {
      // Route refresh remains available when a transient location update fails.
    }
  }, []);

  // 1. Initial lookup: discover active trip if not provided
  useEffect(() => {
    if (tripId) return;

    let isMounted = true;
    async function fetchTodayTrip() {
      try {
        const res = await fetch('/api/delivery/driver/today', {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.trips && data.trips.length > 0 && isMounted) {
            setError(null);
            setTripId(data.trips[0].id || data.trips[0].trip_id);
            localStorage.setItem(TODAY_CACHE_KEY, JSON.stringify(data));
            return;
          }
          if (isMounted) {
            setError('No active trip is assigned to this driver yet.');
            setLoading(false);
          }
        } else if (isMounted) {
          const body = await res.json().catch(() => ({}));
          if (res.status === 401) {
            setError('Authentication expired. Please log in again.');
          } else if (res.status === 403) {
            setError(body.error || 'This account cannot access the driver portal.');
          } else if (res.status === 404) {
            setError(body.error || 'No active trip is assigned to this driver.');
          } else {
            setError(body.error || `Unable to load today's trip (HTTP ${res.status}).`);
          }
          setLoading(false);
          return;
        }
      } catch (err) {
        // Fallback to cache if offline
        const cached = localStorage.getItem(TODAY_CACHE_KEY);
        if (cached && isMounted) {
          try {
            const data = JSON.parse(cached);
            if (data.trips && data.trips.length > 0) {
              setTripId(data.trips[0].id || data.trips[0].trip_id);
              return;
            }
          } catch {}
        }
      }
      if (isMounted) {
        setError('Unable to check for an assigned trip. Retrying automatically.');
        setLoading(false);
      }
    }

    fetchTodayTrip();
    const todayPoll = window.setInterval(fetchTodayTrip, pollingIntervalMs);
    return () => {
      isMounted = false;
      window.clearInterval(todayPoll);
    };
  }, [tripId, getAuthHeaders, pollingIntervalMs, todayRetryNonce]);

  // 2. Fetch Route Data (with AbortController, rounding, and cache fallback)
  const fetchRoute = useCallback(
    async (manualLocation?: DriverGeoLocation, isSilent: boolean = false) => {
      if (!tripId) return;

      const loc = manualLocation || driverLocationRef.current;
      let queryParams = '';
      if (loc && loc.lat && loc.lng) {
        const roundedLat = roundCoordinate(loc.lat, 4);
        const roundedLng = roundCoordinate(loc.lng, 4);
        queryParams = `?lat=${roundedLat}&lng=${roundedLng}`;
      }

      // Abort in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      if (!isSilent && !hasRouteDataRef.current) {
        setLoading(true);
      }
      setError(null);

      try {
        const res = await fetch(`/api/delivery/driver/trips/${tripId}/route${queryParams}`, {
          headers: getAuthHeaders(),
          signal: controller.signal,
        });

        if (res.status === 401) {
          // Token expired or invalid
          setError('Authentication expired. Please log in again.');
          return;
        }

        if (!res.ok) {
          throw new Error(`Failed to load route: HTTP ${res.status}`);
        }

        const data: TripRouteResponse = await res.json();
        setRouteData(data);
        hasRouteDataRef.current = true;
        setIsOfflineCache(false);
        lastFetchTimestampRef.current = Date.now();
        if (loc) {
          lastFetchedLocationRef.current = loc;
        }

        // Cache successful response in localStorage
        try {
          localStorage.setItem(`${ROUTE_CACHE_PREFIX}${tripId}`, JSON.stringify(data));
        } catch {}

        // Optionally fetch full geometry for lighter dashed background line
        fetchFullGeometry(tripId, controller.signal);
      } catch (err: any) {
        if (err.name === 'AbortError') return;

        // Offline / Error: try loading from cache
        const cached = localStorage.getItem(`${ROUTE_CACHE_PREFIX}${tripId}`);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            setRouteData(parsed);
            setIsOfflineCache(true);
            setError(null);
            return;
          } catch {}
        }

        setError(err.message || 'Unable to connect to route service');
      } finally {
        setLoading(false);
      }
    },
    [tripId, getAuthHeaders]
  );

  const fetchFullGeometry = async (currentTripId: string, signal: AbortSignal) => {
    try {
      const res = await fetch(`/api/delivery/driver/trips/${currentTripId}/route/geometry`, {
        headers: getAuthHeaders(),
        signal,
      });
      if (res.ok) {
        const data: RouteGeometryResponse = await res.json();
        if (data.route_geometry) {
          setFullGeometry(data.route_geometry);
        }
      }
    } catch {}
  };

  // 3. Geolocation Tracker: navigator.geolocation.watchPosition
  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationPermissionDenied(true);
      return;
    }

    let lastThrottleTime = 0;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setLocationPermissionDenied(false);
        const now = Date.now();
        // Throttle updates to ~10s unless moved significantly
        const newLoc: DriverGeoLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
        };

        setDriverLocation(newLoc);
        driverLocationRef.current = newLoc;
        void sendLocation(newLoc);

        // Check if driver moved > 50m from last fetched location
        if (lastFetchedLocationRef.current) {
          const distanceMoved = calculateDistanceMeters(
            lastFetchedLocationRef.current.lat,
            lastFetchedLocationRef.current.lng,
            newLoc.lat,
            newLoc.lng
          );
          if (distanceMoved >= movementThresholdMeters && now - lastThrottleTime > 5000) {
            lastThrottleTime = now;
            fetchRoute(newLoc, true);
          }
        } else {
          lastThrottleTime = now;
          lastFetchedLocationRef.current = newLoc;
          // Replace the initial depot-based route as soon as the first usable
          // device position arrives, instead of waiting for the next poll.
          fetchRoute(newLoc, true);
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLocationPermissionDenied(true);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [movementThresholdMeters, fetchRoute, sendLocation]);

  // 4. Polling Timer: 20s while page is visible, pause on document.hidden
  useEffect(() => {
    if (!tripId) return;

    // Initial fetch
    fetchRoute();

    function scheduleNextPoll() {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = setTimeout(() => {
        if (document.visibilityState === 'visible') {
          fetchRoute(undefined, true).finally(() => {
            scheduleNextPoll();
          });
        } else {
          // Check again later when document becomes visible
          scheduleNextPoll();
        }
      }, pollingIntervalMs);
    }

    scheduleNextPoll();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const timeSinceLastFetch = Date.now() - lastFetchTimestampRef.current;
        if (timeSinceLastFetch >= pollingIntervalMs) {
          fetchRoute(undefined, true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(pollTimerRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [tripId, pollingIntervalMs, fetchRoute]);

  // 5. Notification / Event listener for ROUTE_UPDATED
  useEffect(() => {
    // Listen for custom window event dispatched by notification service / websocket
    const handleRouteUpdated = (e?: any) => {
      setRouteUpdatedToast('Route updated by dispatcher');
      setTimeout(() => setRouteUpdatedToast(null), 4000);
      fetchRoute(undefined, true);
    };

    window.addEventListener('waypoint:route_updated', handleRouteUpdated);
    window.addEventListener('storage', (e) => {
      if (e.key === 'waypoint_route_updated_trigger') {
        handleRouteUpdated();
      }
    });

    return () => {
      window.removeEventListener('waypoint:route_updated', handleRouteUpdated);
    };
  }, [fetchRoute]);

  return {
    tripId,
    setTripId,
    routeData,
    fullGeometry,
    loading,
    error,
    isOfflineCache,
    isFallbackSource: routeData?.route_source === 'fallback',
    driverLocation,
    locationPermissionDenied,
    routeUpdatedToast,
    refetch: () => {
      if (tripId) {
        return fetchRoute(undefined, false);
      }
      setLoading(true);
      setTodayRetryNonce((value) => value + 1);
      return Promise.resolve();
    },
  };
}
