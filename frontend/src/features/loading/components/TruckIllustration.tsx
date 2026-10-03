import React from 'react';

interface TruckIllustrationProps {
  className?: string;
  width?: number;
  height?: number;
}

export const TruckIllustration: React.FC<TruckIllustrationProps> = ({
  className = '',
  width = 82,
  height = 42,
}) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 100 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'block', flexShrink: 0 }}
      aria-label="Delivery vehicle"
    >
      {/* Truck Body / Cargo Container */}
      <rect
        x="3"
        y="6"
        width="60"
        height="32"
        rx="4"
        fill="#FFFFFF"
        stroke="#1E293B"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />

      {/* Cab Outline */}
      <path
        d="M63 16H78L88 26V38H63V16Z"
        fill="#FFFFFF"
        stroke="#1E293B"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />

      {/* Cab Window */}
      <path
        d="M67 19.5H77L84 26.5H67V19.5Z"
        fill="#F1F5F9"
        stroke="#1E293B"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />

      {/* Front Light / Bumper hint */}
      <rect x="88" y="32" width="2.5" height="4" rx="1" fill="#F59E0B" />

      {/* Ground clearance line (optional subtle) */}
      <line x1="28" y1="38" x2="68" y2="38" stroke="#1E293B" strokeWidth="2.4" />

      {/* Rear Wheel Well & Tire */}
      <circle cx="19" cy="38" r="7" fill="#FFFFFF" stroke="#1E293B" strokeWidth="2.4" />
      <circle cx="19" cy="38" r="2.8" fill="#1E293B" />

      {/* Front Wheel Well & Tire */}
      <circle cx="77" cy="38" r="7" fill="#FFFFFF" stroke="#1E293B" strokeWidth="2.4" />
      <circle cx="77" cy="38" r="2.8" fill="#1E293B" />
    </svg>
  );
};
