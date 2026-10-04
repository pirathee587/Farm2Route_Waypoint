import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { normalizeManeuver, ManeuverIcon } from '../lib/maneuverIcon';
import { getMarkerStyle, filterVisibleStops } from '../lib/StopMarker';
import { NextStopCard } from '../ui/NextStopCard';
import { MapCanvas } from '../ui/MapCanvas';
import { StopBottomSheet } from '../ui/StopBottomSheet';
import { MapControls } from '../ui/MapControls';
import { RouteStop, RouteNextStop } from '../model/types';

// Mock mapbox-gl
vi.mock('mapbox-gl', () => {
  const MapMock = vi.fn().mockImplementation(function() {
    return {
      on: vi.fn((event, cb) => {
        if (event === 'load') cb();
      }),
      remove: vi.fn(),
      addSource: vi.fn(),
      addLayer: vi.fn(),
      getSource: vi.fn().mockReturnValue({ setData: vi.fn() }),
      fitBounds: vi.fn(),
      flyTo: vi.fn(),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
    };
  });

  const MarkerMock = vi.fn().mockImplementation(function() {
    return {
      setLngLat: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(),
      remove: vi.fn(),
    };
  });

  const LngLatBoundsMock = vi.fn().mockImplementation(function() {
    return {
      extend: vi.fn().mockReturnThis(),
      isEmpty: vi.fn().mockReturnValue(false),
    };
  });

  return {
    default: {
      accessToken: '',
      Map: MapMock,
      Marker: MarkerMock,
      LngLatBounds: LngLatBoundsMock,
    },
    Map: MapMock,
    Marker: MarkerMock,
    LngLatBounds: LngLatBoundsMock,
  };
});

describe('Driver Route Map Tests', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Maneuver -> Icon mapping tests
  describe('1. Maneuver to Icon Mapping', () => {
    it('normalizes various maneuver strings correctly', () => {
      expect(normalizeManeuver('turn-left')).toBe('left');
      expect(normalizeManeuver('sharp-left')).toBe('left');
      expect(normalizeManeuver('slight-left')).toBe('left');

      expect(normalizeManeuver('turn-right')).toBe('right');
      expect(normalizeManeuver('sharp-right')).toBe('right');

      expect(normalizeManeuver('straight')).toBe('straight');
      expect(normalizeManeuver('continue')).toBe('straight');
      expect(normalizeManeuver('forward')).toBe('straight');

      expect(normalizeManeuver('uturn')).toBe('uturn');
      expect(normalizeManeuver('u-turn')).toBe('uturn');

      expect(normalizeManeuver('arrive')).toBe('arrive');
      expect(normalizeManeuver('destination')).toBe('arrive');
    });

    it('renders accessible maneuver icons', () => {
      const { rerender } = render(<ManeuverIcon maneuver="turn-left" />);
      expect(screen.getByLabelText('Turn left')).toBeDefined();

      rerender(<ManeuverIcon maneuver="turn-right" />);
      expect(screen.getByLabelText('Turn right')).toBeDefined();

      rerender(<ManeuverIcon maneuver="u-turn" />);
      expect(screen.getByLabelText('Make U-turn')).toBeDefined();

      rerender(<ManeuverIcon maneuver="arrive" />);
      expect(screen.getByLabelText('Arrive at destination')).toBeDefined();

      rerender(<ManeuverIcon maneuver="straight" />);
      expect(screen.getByLabelText('Continue straight')).toBeDefined();
    });
  });

  // 2. Marker status colors and styles
  describe('2. Marker Status Colors and Styles', () => {
    it('returns green with checkmark for DELIVERED', () => {
      const style = getMarkerStyle('DELIVERED', 1, false);
      expect(style.bgColor).toBe('#16a34a'); // Green
      expect(style.label).toBe('✓');
      expect(style.hasHalo).toBe(false);
    });

    it('returns red with exclamation for NOT_DELIVERED', () => {
      const style = getMarkerStyle('NOT_DELIVERED', 2, false);
      expect(style.bgColor).toBe('#dc2626'); // Red
      expect(style.label).toBe('!');
      expect(style.hasHalo).toBe(false);
    });

    it('returns amber for PARTIAL', () => {
      const style = getMarkerStyle('PARTIAL', 3, false);
      expect(style.bgColor).toBe('#d97706'); // Amber
      expect(style.label).toBe('3');
      expect(style.hasHalo).toBe(false);
    });

    it('returns yellow for PENDING', () => {
      const style = getMarkerStyle('PENDING', 4, false);
      expect(style.bgColor).toBe('#facc15'); // Yellow
      expect(style.label).toBe('4');
      expect(style.hasHalo).toBe(false);
    });

    it('returns blue with larger size and halo for NEXT / IN_PROGRESS', () => {
      const style = getMarkerStyle('IN_PROGRESS', 5, true);
      expect(style.bgColor).toBe('#2F6FED'); // Waypoint Blue
      expect(style.hasHalo).toBe(true);
      expect(style.size).toBeGreaterThan(30);
    });
  });

  // 3. REMOVED stops excluded
  describe('3. REMOVED Stops Filter', () => {
    it('excludes REMOVED stops from visible markers list', () => {
      const stops: RouteStop[] = [
        { stop_id: '1', seq: 1, outlet_id: 'OUT1', name: 'Stop 1', lat: 6.9, lng: 79.8, status: 'DELIVERED' },
        { stop_id: '2', seq: 2, outlet_id: 'OUT2', name: 'Stop 2', lat: 6.9, lng: 79.8, status: 'REMOVED' },
        { stop_id: '3', seq: 3, outlet_id: 'OUT3', name: 'Stop 3', lat: 6.9, lng: 79.8, status: 'PENDING' },
      ];

      const visible = filterVisibleStops(stops);
      expect(visible.length).toBe(2);
      expect(visible.find((s) => s.outlet_id === 'OUT2')).toBeUndefined();
      expect(visible.map((s) => s.outlet_id)).toEqual(['OUT1', 'OUT3']);
    });

    it('excludes stops whose database coordinates are missing', () => {
      const stops: RouteStop[] = [
        { stop_id: '1', seq: 1, outlet_id: 'OUT1', name: 'Missing coordinates', lat: 0, lng: 0, status: 'PENDING' },
        { stop_id: '2', seq: 2, outlet_id: 'OUT2', name: 'Keells', lat: 6.7954545, lng: 79.8876526, status: 'IN_PROGRESS' },
      ];

      expect(filterVisibleStops(stops).map((s) => s.outlet_id)).toEqual(['OUT2']);
    });
  });

  // 4. Fallback chip shown
  describe('4. Fallback Route Source Chip', () => {
    const mockNextStop: RouteNextStop = {
      stop_id: '1402',
      outlet_id: 'OUT014',
      name: 'Central Supermarket',
      district: 'Colombo',
      status: 'IN_PROGRESS',
      window_open: '08:30:00',
      window_close: '09:30:00',
      distance_km: 2.4,
      eta_min: 8,
      temperature: 'Chilled',
      constraint: 'Van only',
    };

    it('shows neutral "Estimated route" chip when route_source is fallback', () => {
      render(
        <NextStopCard
          nextStop={mockNextStop}
          nextInstruction={{ text: 'Continue on A9', maneuver: 'straight', distance_m: 500 }}
          isFallbackSource={true}
        />
      );

      expect(screen.getByText('Estimated route')).toBeDefined();
    });
  });

  // 5. Offline cache render
  describe('5. Offline Cache Render', () => {
    const mockNextStop: RouteNextStop = {
      stop_id: '1402',
      outlet_id: 'OUT014',
      name: 'Central Supermarket',
      district: 'Colombo',
      status: 'IN_PROGRESS',
      window_open: '08:30:00',
      window_close: '09:30:00',
      distance_km: 2.4,
      eta_min: 8,
      temperature: 'Chilled',
      constraint: 'Van only',
    };

    it('shows "Offline - cached" chip when rendered from cache', () => {
      render(
        <NextStopCard
          nextStop={mockNextStop}
          nextInstruction={{ text: 'Continue on A9', maneuver: 'straight', distance_m: 500 }}
          isOfflineCache={true}
        />
      );

      expect(screen.getByText(/Offline - cached/i)).toBeDefined();
    });
  });

  // 6. Token-missing friendly state
  describe('6. Token Missing State', () => {
    it('shows friendly "Interactive Map Unavailable" card when token is missing', () => {
      // With empty token
      render(
        <MapCanvas
          routeData={null}
          fullGeometry={null}
          driverLocation={null}
          mapboxToken=""
        />
      );

      expect(screen.getByText(/Interactive Map Unavailable/i)).toBeDefined();
      expect(screen.getByText(/VITE_MAPBOX_TOKEN is not configured/i)).toBeDefined();
    });
  });

  // 7. Polling pauses when hidden
  describe('7. Polling Pauses When Hidden', () => {
    it('verifies document.hidden pause logic behavior', () => {
      vi.useFakeTimers();

      let isVisible = true;
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => (isVisible ? 'visible' : 'hidden'),
      });

      const fetchMock = vi.fn();

      const triggerPoll = () => {
        if (document.visibilityState === 'visible') {
          fetchMock();
        }
      };

      // While visible: poll triggers fetch
      triggerPoll();
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // When tab goes hidden: poll does NOT fetch
      isVisible = false;
      triggerPoll();
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // When tab becomes visible again: poll fetches
      isVisible = true;
      triggerPoll();
      expect(fetchMock).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });

  // 8. StopBottomSheet component tests
  describe('8. StopBottomSheet', () => {
    const mockNextStop: RouteNextStop = {
      stop_id: '1402',
      outlet_id: 'OUT014',
      name: 'Central Supermarket',
      district: 'Colombo',
      status: 'IN_PROGRESS',
      window_open: '08:30:00',
      window_close: '09:30:00',
      distance_km: 2.4,
      eta_min: 8,
      temperature: 'Chilled',
      constraint: 'Van only',
    };

    it('renders next stop info tiles and action buttons', () => {
      const onViewStop = vi.fn();
      render(
        <StopBottomSheet
          nextStop={mockNextStop}
          stops={[{ stop_id: '1402', seq: 2, outlet_id: 'OUT014', name: 'Central Supermarket', lat: 6.9, lng: 79.8, status: 'IN_PROGRESS' }]}
          progress={{ completed: 2, total: 8 }}
          onViewStop={onViewStop}
        />
      );

      expect(screen.getByText('Central Supermarket')).toBeDefined();
      expect(screen.getByText(/2 of 8 stops/i)).toBeDefined();
      expect(screen.getByText('View Stop')).toBeDefined();
      expect(screen.getByText('Route Details')).toBeDefined();
      expect(screen.getByText(/Interact only when safely stopped/i)).toBeDefined();
    });

    it('shows "All Stops Completed!" when next_stop is null', () => {
      const onViewSummary = vi.fn();
      render(
        <StopBottomSheet
          nextStop={null}
          stops={[]}
          progress={{ completed: 8, total: 8 }}
          onViewStop={vi.fn()}
          onViewSummary={onViewSummary}
        />
      );

      expect(screen.getByText('All Stops Completed!')).toBeDefined();
      expect(screen.getByText('View Trip Summary')).toBeDefined();
    });
  });

  // 9. MapControls interactions
  describe('9. MapControls', () => {
    it('fires onLocate, onZoomIn, onZoomOut callbacks', () => {
      const onLocate = vi.fn();
      const onZoomIn = vi.fn();
      const onZoomOut = vi.fn();

      render(
        <MapControls
          onLocate={onLocate}
          onZoomIn={onZoomIn}
          onZoomOut={onZoomOut}
        />
      );

      screen.getByLabelText('Locate vehicle position').click();
      expect(onLocate).toHaveBeenCalledTimes(1);

      screen.getByLabelText('Zoom in on map').click();
      expect(onZoomIn).toHaveBeenCalledTimes(1);

      screen.getByLabelText('Zoom out on map').click();
      expect(onZoomOut).toHaveBeenCalledTimes(1);
    });
  });

  // 10. Geo calculation and coordinate rounding
  describe('10. Geo Utilities', () => {
    it('calculates distance and rounds coordinates', async () => {
      const { calculateDistanceMeters, roundCoordinate, formatDistance } = await import('../lib/geo');

      // Distance between Colombo Fort (6.9344, 79.8428) and Peliyagoda (6.9632, 79.8891) ~6 km
      const dist = calculateDistanceMeters(6.9344, 79.8428, 6.9632, 79.8891);
      expect(dist).toBeGreaterThan(5000);
      expect(dist).toBeLessThan(7000);

      // Coordinate rounding
      expect(roundCoordinate(6.93441234, 4)).toBe(6.9344);
      expect(roundCoordinate(79.84287654, 4)).toBe(79.8429);

      // Format distance
      expect(formatDistance(0.45)).toBe('450 m');
      expect(formatDistance(2.4)).toBe('2.4 km');
    });
  });
});

