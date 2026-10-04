import React, { useRef, useState, useEffect } from 'react';
import { useRouteMap } from '../model/useRouteMap';
import { MapCanvas, MapCanvasHandles } from './MapCanvas';
import { NextStopCard } from './NextStopCard';
import { MapControls } from './MapControls';
import { StopBottomSheet } from './StopBottomSheet';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface RouteMapPageProps {
  onViewStop?: (stopId?: string) => void;
  onViewSummary?: () => void;
}

export const RouteMapPage: React.FC<RouteMapPageProps> = ({
  onViewStop,
  onViewSummary,
}) => {
  const {
    tripId,
    setTripId,
    routeData,
    fullGeometry,
    loading,
    error,
    isOfflineCache,
    isFallbackSource,
    driverLocation,
    locationPermissionDenied,
    routeUpdatedToast,
    refetch,
  } = useRouteMap();

  const mapCanvasRef = useRef<MapCanvasHandles | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  const handleSelectStop = (stopId: string) => {
    if (onViewStop) {
      onViewStop(stopId);
    }
  };

  const handleToggleFullScreen = () => {
    setIsFullScreen((prev) => {
      const next = !prev;
      if (next) {
        try {
          if (containerRef.current?.requestFullscreen) {
            containerRef.current.requestFullscreen().catch(() => {});
          }
        } catch {}
      } else {
        try {
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
        } catch {}
      }
      return next;
    });
  };

  // Sync fullscreen change from native browser / Escape key
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullScreen]);

  // Window resize listener to keep Mapbox canvas responsive
  useEffect(() => {
    const handleResize = () => {
      mapCanvasRef.current?.resize();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const currentTripNumber = routeData?.trip_number ?? 1;
  const currentVehicleId = routeData?.vehicle_id ?? 'VEH014';
  const tripTabs = routeData?.trip_tabs || [
    { trip_number: 1, label: 'Trip 1' },
    { trip_number: 2, label: 'Trip 2' },
  ];

  return (
    <div
      ref={containerRef}
      className={`driver-screen-content animate-fade-in ${isFullScreen ? 'waypoint-map-fullscreen-active' : ''}`}
      style={
        isFullScreen
          ? {
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 99999,
              backgroundColor: '#0f172a',
              margin: 0,
              padding: 0,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }
          : {
              padding: '16px 0 0 0',
              overflow: 'hidden',
              height: '100%',
              minHeight: '100vh',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
            }
      }
    >
      {/* Route Updated Floating Toast */}
      {routeUpdatedToast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'absolute',
            top: isFullScreen ? 20 : 80,
            left: 20,
            right: 20,
            zIndex: 9999,
            backgroundColor: '#0f172a',
            color: '#facc15',
            padding: '10px 18px',
            borderRadius: 14,
            fontWeight: 800,
            fontSize: 13,
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <RefreshCw size={15} className="animate-spin" />
          <span>{routeUpdatedToast}</span>
        </div>
      )}

      {/* Screen Header (Hidden in Full Screen Mode for Clean View) */}
      {!isFullScreen && (
        <div style={{ padding: '0 20px', marginBottom: 10, flexShrink: 0, zIndex: 10 }}>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: '#0f172a',
              margin: 0,
              letterSpacing: '-0.4px',
            }}
          >
            Route Map
          </h1>
          <div
            style={{
              fontSize: 13,
              color: '#64748b',
              fontWeight: 600,
              marginTop: 2,
            }}
          >
            Trip {currentTripNumber} • {currentVehicleId}
          </div>

          {/* Trip Tabs Switcher (Trip 1 / Trip 2) */}
          <div
            role="tablist"
            aria-label="Trip selector"
            style={{
              display: 'inline-flex',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 14,
              padding: 4,
              marginTop: 10,
              width: 210,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            {tripTabs.map((tab) => {
              const isActive = tab.trip_number === currentTripNumber;
              return (
                <button
                  key={tab.trip_number}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    if (tab.trip_id) {
                      setTripId(tab.trip_id);
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    borderRadius: 10,
                    backgroundColor: isActive ? '#facc15' : 'transparent',
                    color: isActive ? '#0f172a' : '#64748b',
                    fontWeight: 800,
                    fontSize: 13,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    minHeight: 34,
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Map Area */}
      <div
        style={{
          position: 'relative',
          flex: 1,
          width: '100%',
          height: isFullScreen ? '100vh' : '100%',
          overflow: 'hidden',
          backgroundColor: '#e2e8f0',
        }}
      >
        {/* Loading Skeleton */}
        {loading && !routeData && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 30,
              backgroundColor: '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                border: '4px solid #e2e8f0',
                borderTopColor: '#facc15',
                animation: 'spin 1s linear infinite',
                marginBottom: 14,
              }}
            />
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
              Loading Route Map...
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              Fetching turn-by-turn guidance and stop sequence
            </div>
          </div>
        )}

        {/* Error Banner (if fetch failed and no cache) */}
        {error && !routeData && (
          <div
            role="alert"
            style={{
              position: 'absolute',
              top: 20,
              left: 20,
              right: 20,
              zIndex: 30,
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              padding: '16px',
              borderRadius: 16,
              border: '1px solid #fecaca',
              textAlign: 'center',
            }}
          >
            <AlertCircle size={24} style={{ margin: '0 auto 8px auto' }} />
            <div style={{ fontWeight: 800, fontSize: 14 }}>Unable to Load Route</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>{error}</div>
            <button
              type="button"
              onClick={() => refetch()}
              style={{
                marginTop: 12,
                padding: '8px 16px',
                backgroundColor: '#dc2626',
                color: '#FFFFFF',
                borderRadius: 10,
                border: 'none',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Floating Top Next-Stop Card */}
        <NextStopCard
          nextStop={routeData?.next_stop ?? null}
          nextInstruction={routeData?.next_instruction ?? null}
          isFallbackSource={isFallbackSource}
          isOfflineCache={isOfflineCache}
          locationPermissionDenied={locationPermissionDenied}
          onViewSummary={onViewSummary}
        />

        {/* Floating Right Map Controls (Locate/AutoFocus, Zoom +, Zoom -, Fullscreen) */}
        <MapControls
          onLocate={() => mapCanvasRef.current?.recenterOnDriver()}
          onZoomIn={() => mapCanvasRef.current?.zoomIn()}
          onZoomOut={() => mapCanvasRef.current?.zoomOut()}
          onToggleFullScreen={handleToggleFullScreen}
          isFullScreen={isFullScreen}
        />

        {/* Mapbox Map Canvas */}
        <MapCanvas
          ref={mapCanvasRef}
          routeData={routeData}
          fullGeometry={fullGeometry}
          driverLocation={driverLocation}
          isFullScreen={isFullScreen}
          onSelectStop={handleSelectStop}
        />

        {/* Bottom Sheet for Stop Actions */}
        <StopBottomSheet
          nextStop={routeData?.next_stop ?? null}
          stops={routeData?.stops || []}
          progress={routeData?.progress || { completed: 0, total: 0 }}
          isFullScreen={isFullScreen}
          onViewStop={(stopId) => handleSelectStop(stopId)}
          onViewSummary={onViewSummary}
        />
      </div>
    </div>
  );
};

export default RouteMapPage;
