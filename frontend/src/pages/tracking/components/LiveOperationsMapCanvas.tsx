// ============================================================
// LiveOperationsMapCanvas.tsx — Visual SVG Map for Live Tracking
// ============================================================

import React, { useState } from 'react';
import { Plus, Minus, Crosshair } from 'lucide-react';
import type { ActiveTrip } from '@/entities/tracking/trackingTypes';

interface LiveOperationsMapCanvasProps {
  trip?: ActiveTrip;
  isLargeView?: boolean;
}

export const LiveOperationsMapCanvas: React.FC<LiveOperationsMapCanvasProps> = ({
  trip,
  isLargeView = false,
}) => {
  const [mapType, setMapType] = useState<'map' | 'satellite'>('map');
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  if (!trip) {
    return <div style={{ height: isLargeView ? '560px' : '340px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', backgroundColor: '#eef2ea', borderRadius: '16px' }}>Live position unavailable.</div>;
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: isLargeView ? '560px' : '340px',
        backgroundColor: '#eef2ea',
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
        userSelect: 'none',
      }}
    >
      {/* Top right map controls if large view */}
      {isLargeView && (
        <div
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            alignItems: 'flex-end',
          }}
        >
          {/* Map / Satellite Toggle */}
          <div
            style={{
              display: 'flex',
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '3px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              border: '1px solid #e2e8f0',
            }}
          >
            <button
              onClick={() => setMapType('map')}
              style={{
                padding: '4px 12px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '16px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: mapType === 'map' ? '#0f172a' : 'transparent',
                color: mapType === 'map' ? '#ffffff' : '#64748b',
                transition: 'all 0.15s ease',
              }}
            >
              Map
            </button>
            <button
              onClick={() => setMapType('satellite')}
              style={{
                padding: '4px 12px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '16px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: mapType === 'satellite' ? '#0f172a' : 'transparent',
                color: mapType === 'satellite' ? '#ffffff' : '#64748b',
                transition: 'all 0.15s ease',
              }}
            >
              Satellite
            </button>
          </div>

          {/* Zoom & Recenter controls */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
            }}
          >
            <button
              onClick={() => setZoomLevel((z) => Math.min(z + 0.2, 1.6))}
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                borderBottom: '1px solid #f1f5f9',
                color: '#334155',
              }}
              title="Zoom In"
            >
              <Plus size={16} />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(z - 0.2, 0.8))}
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                borderBottom: '1px solid #f1f5f9',
                color: '#334155',
              }}
              title="Zoom Out"
            >
              <Minus size={16} />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: '#334155',
              }}
              title="Recenter"
            >
              <Crosshair size={16} />
            </button>
          </div>
        </div>
      )}

      {/* SVG Map Canvas */}
      <svg
        viewBox="0 0 800 500"
        style={{
          width: '100%',
          height: '100%',
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'center center',
          transition: 'transform 0.2s ease',
        }}
      >
        <defs>
          <linearGradient id="routeGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EAB308" />
          </linearGradient>
          <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="130%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodOpacity="0.12" />
          </filter>
        </defs>

        {/* Land / District Green Patches */}
        <rect x="0" y="0" width="800" height="500" fill="#edf1e8" />

        {/* District Areas (rounded polygons) */}
        <rect x="25" y="80" width="130" height="85" rx="16" fill="#dde8d7" />
        <text x="40" y="125" fill="#71866d" fontSize="13" fontWeight="600">Peliyagoda</text>

        <rect x="180" y="180" width="150" height="120" rx="16" fill="#dde8d7" opacity="0.8" />
        <text x="210" y="245" fill="#71866d" fontSize="13" fontWeight="600">Wattala</text>

        <rect x="60" y="320" width="140" height="100" rx="16" fill="#dde8d7" opacity="0.7" />
        <text x="95" y="375" fill="#71866d" fontSize="13" fontWeight="600">Nugegoda</text>

        <rect x="580" y="70" width="130" height="80" rx="16" fill="#dde8d7" opacity="0.7" />
        <text x="610" y="115" fill="#71866d" fontSize="13" fontWeight="600">Colombo 07</text>

        <rect x="580" y="330" width="130" height="90" rx="16" fill="#dde8d7" opacity="0.7" />
        <text x="615" y="380" fill="#71866d" fontSize="13" fontWeight="600">Gampaha</text>

        {/* Building blocks (City grid feel) */}
        <rect x="30" y="200" width="70" height="50" rx="8" fill="#e2e7dd" />
        <rect x="110" y="200" width="60" height="50" rx="8" fill="#e2e7dd" />
        <rect x="30" y="260" width="70" height="45" rx="8" fill="#e2e7dd" />
        <rect x="110" y="260" width="60" height="45" rx="8" fill="#e2e7dd" />

        <rect x="360" y="180" width="80" height="55" rx="8" fill="#e2e7dd" />
        <rect x="450" y="180" width="75" height="55" rx="8" fill="#e2e7dd" />
        <rect x="360" y="245" width="80" height="50" rx="8" fill="#e2e7dd" />
        <rect x="450" y="245" width="75" height="50" rx="8" fill="#e2e7dd" />

        <rect x="360" y="340" width="75" height="55" rx="8" fill="#e2e7dd" />
        <rect x="445" y="340" width="80" height="55" rx="8" fill="#e2e7dd" />

        {/* Primary and secondary road network (White lines with subtle border) */}
        {/* Horizontal major roads */}
        <path d="M 0 160 L 800 160" stroke="#fefefe" strokeWidth="26" strokeLinecap="round" />
        <path d="M 0 160 L 800 160" stroke="#e0e5db" strokeWidth="28" strokeLinecap="round" strokeDasharray="none" style={{ zIndex: -1 }} />

        <path d="M 0 320 L 800 320" stroke="#fefefe" strokeWidth="20" strokeLinecap="round" />
        <path d="M 120 440 L 750 440" stroke="#fefefe" strokeWidth="18" strokeLinecap="round" />

        {/* Vertical major roads */}
        <path d="M 200 0 L 200 500" stroke="#fefefe" strokeWidth="22" strokeLinecap="round" />
        <path d="M 340 0 L 340 500" stroke="#fefefe" strokeWidth="22" strokeLinecap="round" />
        <path d="M 545 0 L 545 500" stroke="#fefefe" strokeWidth="26" strokeLinecap="round" />

        {/* Diagonal road */}
        <path d="M 80 470 L 320 370" stroke="#fefefe" strokeWidth="16" strokeLinecap="round" />

        {/* Road labels */}
        <text x="350" y="215" fill="#a4b3a2" fontSize="9" fontWeight="600" letterSpacing="0.5">Ingram Road</text>
        <text x="400" y="315" fill="#a4b3a2" fontSize="9" fontWeight="600" letterSpacing="0.5">Baseline Road</text>

        {/* PLANNED ROUTE PATH (Thick yellow line) */}
        {/* Depot (105, 160) -> (490, 160) -> (490, 340) -> Stop 4 (640, 340) */}
        <path
          d="M 105 160 L 490 160 L 490 340 L 640 340"
          stroke="#F59E0B"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Upcoming gray route to Stop 5 and Stop 6 */}
        <path
          d="M 640 340 L 640 450"
          stroke="#cbd5e1"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="4 4"
          fill="none"
        />

        {/* MARKER 1: DEPOT (Peliyagoda) */}
        <g transform="translate(60, 138)">
          <rect x="0" y="0" width="84" height="42" rx="8" fill="#1e293b" filter="url(#cardShadow)" />
          <text x="42" y="16" fill="#94a3b8" fontSize="8" fontWeight="700" textAnchor="middle" letterSpacing="0.5">DEPOT</text>
          <text x="42" y="32" fill="#ffffff" fontSize="10" fontWeight="700" textAnchor="middle">{trip.origin}</text>
        </g>

        {/* STOP 1: Wattala (Delivered) */}
        <g transform="translate(355, 160)">
          <circle cx="0" cy="0" r="14" fill="#10B981" />
          <path d="M -5 -1 L -1 3 L 5 -3" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          {/* Tooltip */}
          {isLargeView && (
            <g transform="translate(-40, -42)">
              <rect x="0" y="0" width="80" height="30" rx="6" fill="#ffffff" filter="url(#cardShadow)" stroke="#e2e8f0" strokeWidth="1" />
              <text x="40" y="13" fill="#1e293b" fontSize="9" fontWeight="700" textAnchor="middle">{trip.stops[1]?.locationArea ?? trip.stops[1]?.name ?? 'Stop 1'}</text>
              <text x="40" y="23" fill="#10B981" fontSize="8" fontWeight="600" textAnchor="middle">Delivered · 09:05</text>
            </g>
          )}
        </g>

        {/* STOP 2: Colombo 03 (Delivered) */}
        <g transform="translate(490, 230)">
          <circle cx="0" cy="0" r="14" fill="#10B981" />
          <path d="M -5 -1 L -1 3 L 5 -3" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          {/* Tooltip */}
          {isLargeView && (
            <g transform="translate(20, -15)">
              <rect x="0" y="0" width="90" height="32" rx="6" fill="#ffffff" filter="url(#cardShadow)" stroke="#e2e8f0" strokeWidth="1" />
              <text x="45" y="14" fill="#1e293b" fontSize="9" fontWeight="700" textAnchor="middle">{trip.stops[2]?.locationArea ?? trip.stops[2]?.name ?? 'Stop 2'}</text>
              <text x="45" y="24" fill="#10B981" fontSize="8" fontWeight="600" textAnchor="middle">Delivered · 09:38</text>
            </g>
          )}
        </g>

        {/* VEHICLE MARKER: VEH014 (Live In Transit) */}
        <g transform="translate(490, 305)">
          {/* Pulsing radar ring */}
          <circle cx="0" cy="0" r="26" fill="#F59E0B" opacity="0.25">
            <animate attributeName="r" values="18;28;18" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.35;0.1;0.35" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="0" cy="0" r="18" fill="#F59E0B" stroke="#ffffff" strokeWidth="3" />
          <text x="0" y="5" fill="#ffffff" fontSize="11" fontWeight="800" textAnchor="middle">{trip.vehicleId.replace('VEH', 'V')}</text>

          {/* If Screen 1 overview: pill on right */}
          {!isLargeView && (
            <g transform="translate(24, -14)">
              <rect x="0" y="0" width="60" height="28" rx="6" fill="#0f172a" />
              <text x="30" y="18" fill="#ffffff" fontSize="10" fontWeight="700" textAnchor="middle">{trip.vehicleId}</text>
            </g>
          )}

          {/* If Screen 3 large view: Detailed vehicle card */}
          {isLargeView && (
            <g transform="translate(22, -45)">
              <rect x="0" y="0" width="145" height="92" rx="10" fill="#ffffff" filter="url(#cardShadow)" stroke="#e2e8f0" strokeWidth="1" />
              {/* Header */}
              <text x="12" y="20" fill="#0f172a" fontSize="12" fontWeight="800">{trip.vehicleId}</text>
              <circle cx="106" cy="16" r="3.5" fill="#10B981" />
              <text x="114" y="19" fill="#10B981" fontSize="9" fontWeight="700">LIVE</text>
              
              <text x="12" y="34" fill="#64748b" fontSize="9">{trip.vehicleFullName}</text>
              <text x="12" y="48" fill="#334155" fontSize="10" fontWeight="600">{trip.driverName}</text>
              
              <line x1="12" y1="54" x2="133" y2="54" stroke="#f1f5f9" strokeWidth="1" />
              <text x="12" y="67" fill="#F59E0B" fontSize="9" fontWeight="700">Next: Colombo 07 · 10:52</text>
              
              {/* Warning box */}
              <rect x="12" y="72" width="121" height="15" rx="3" fill="#fffbeb" stroke="#fef3c7" strokeWidth="1" />
              <text x="16" y="83" fill="#d97706" fontSize="7.5" fontWeight="600">Delivery window at risk</text>
            </g>
          )}
        </g>

        {/* STOP 3 / NEXT: Colombo 07 */}
        <g transform="translate(640, 340)">
          <circle cx="0" cy="0" r="14" fill={isLargeView ? '#EF4444' : '#3B82F6'} stroke="#ffffff" strokeWidth="2" />
          <text x="0" y="4" fill="#ffffff" fontSize="10" fontWeight="800" textAnchor="middle">4</text>
        </g>

        {/* STOP 5: Nugegoda (Upcoming) */}
        <g transform="translate(640, 395)">
          <circle cx="0" cy="0" r="13" fill="#ffffff" stroke="#94a3b8" strokeWidth="2.5" />
          <text x="0" y="4" fill="#64748b" fontSize="10" fontWeight="700" textAnchor="middle">5</text>
        </g>

        {/* STOP 6: Dehiwala (Upcoming) */}
        <g transform="translate(640, 445)">
          <circle cx="0" cy="0" r="13" fill="#ffffff" stroke="#94a3b8" strokeWidth="2.5" />
          <text x="0" y="4" fill="#64748b" fontSize="10" fontWeight="700" textAnchor="middle">6</text>
        </g>
      </svg>

      {/* Map Legend */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          padding: '6px 14px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
          border: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          gap: isLargeView ? '16px' : '12px',
          fontSize: '11px',
          fontWeight: 600,
          color: '#475569',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }} />
          <span>{isLargeView ? 'Delivered' : 'On time'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
          <span>{isLargeView ? 'Live vehicle' : 'At risk'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
          <span>{isLargeView ? 'Next / At risk' : 'Issue'}</span>
        </div>
        {isLargeView && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '16px', height: '4px', borderRadius: '2px', backgroundColor: '#F59E0B' }} />
            <span>Planned route</span>
          </div>
        )}
      </div>
    </div>
  );
};
