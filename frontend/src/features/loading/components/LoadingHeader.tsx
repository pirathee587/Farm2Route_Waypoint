import React from 'react';
import { Search, Clock, Menu } from 'lucide-react';
import { ShiftInfo } from '../types';

interface LoadingHeaderProps {
  shiftInfo: ShiftInfo;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenMobileMenu?: () => void;
}

export const LoadingHeader: React.FC<LoadingHeaderProps> = ({
  shiftInfo,
  searchQuery,
  onSearchChange,
  onOpenMobileMenu,
}) => {
  return (
    <header
      className="loading-header"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px',
      }}
    >
      {/* Left: Hamburger (Tablet/Mobile) + Title & Subtitle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Tablet/Mobile Hamburger Toggle */}
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="tablet-menu-btn"
            style={{
              display: 'none',
              padding: '8px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              color: '#1E293B',
            }}
            aria-label="Toggle navigation menu"
          >
            <Menu size={20} />
          </button>
        )}

        <div>
          <h1
            style={{
              fontSize: '26px',
              fontWeight: 700,
              color: '#0F172A',
              letterSpacing: '-0.02em',
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            Today’s Loads
          </h1>
          <p
            style={{
              fontSize: '13.5px',
              color: '#64748B',
              marginTop: '4px',
              fontWeight: 400,
              letterSpacing: '0.01em',
            }}
          >
            {shiftInfo.warehouseName} · {shiftInfo.dateStr}
          </p>
        </div>
      </div>

      {/* Right: Search Box + Shift Pill */}
      <div
        className="header-controls"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        {/* Search Bar */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              color: '#64748B',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Search trips"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              height: '38px',
              paddingLeft: '36px',
              paddingRight: '14px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              color: '#0F172A',
              fontSize: '13px',
              width: '180px',
              transition: 'all 0.15s ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#F59E0B';
              e.currentTarget.style.boxShadow = '0 0 0 2px rgba(245, 158, 11, 0.15)';
              e.currentTarget.style.width = '210px';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#E2E8F0';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.width = '180px';
            }}
          />
        </div>

        {/* Shift Badge Pill */}
        <div
          style={{
            height: '38px',
            backgroundColor: '#181B1F',
            color: '#FFFFFF',
            borderRadius: '8px',
            padding: '0 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            fontWeight: 600,
            letterSpacing: '0.01em',
            userSelect: 'none',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
            whiteSpace: 'nowrap',
          }}
        >
          <Clock size={15} style={{ color: '#FFFFFF' }} />
          <span>
            {shiftInfo.shiftName} · {shiftInfo.shiftHours}
          </span>
        </div>
      </div>
    </header>
  );
};
