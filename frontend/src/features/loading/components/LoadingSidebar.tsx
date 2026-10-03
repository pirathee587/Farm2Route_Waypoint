import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutGrid,
  Truck,
  ListChecks,
  AlertTriangle,
  Send,
  ChevronUp,
  MoreVertical,
  X,
  LogOut,
} from 'lucide-react';
import waypointLogoImg from '@/assets/waypoint-logo.png';

interface LoadingSidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  onLogout?: () => void;
}

export const LoadingSidebar: React.FC<LoadingSidebarProps> = ({
  activeTab,
  onTabChange,
  isOpenMobile = false,
  onCloseMobile,
  onLogout,
}) => {
  const session=(()=>{try{return JSON.parse(localStorage.getItem('waypoint_loader_session')||'{}')}catch{return {}}})();
  const userProfile={name:session.email||'Signed in user',role:session.role||'',initials:(session.email||'U').slice(0,2).toUpperCase()};
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);
  const navItems = [
    { id: 'todays-loads', label: "Today's Loads", icon: LayoutGrid },
    { id: 'trip-detail', label: 'Trip Detail', icon: Truck },
    { id: 'item-checklist', label: 'Item Checklist', icon: ListChecks },
    { id: 'flag-shortfall', label: 'Flag Shortfall', icon: AlertTriangle },
    { id: 'departure', label: 'Departure', icon: Send },
  ];

  return (
    <>
      {/* Mobile/Tablet Backdrop Overlay */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 998,
          }}
          className="lg:hidden"
        />
      )}

      {/* Main Sidebar Drawer */}
      <aside
        className={`waypoint-sidebar ${isOpenMobile ? 'sidebar-open-tablet' : ''}`}
        style={{
          width: '240px',
          minWidth: '240px',
          height: '100vh',
          backgroundColor: '#111315',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '20px 16px',
          borderRight: '1px solid #1F2328',
          position: 'sticky',
          top: 0,
          zIndex: 999,
          boxSizing: 'border-box',
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Top: Logo & Menu */}
        <div>
          {/* Brand Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '32px',
              paddingLeft: '4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: '#F59E0B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                <img
                  src={waypointLogoImg}
                  alt="Waypoint"
                  style={{
                    width: '32px',
                    height: '32px',
                    objectFit: 'contain',
                  }}
                  onError={(e) => {
                    // Fallback to stylized vector mark if asset fails
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span
                  style={{
                    color: '#FFFFFF',
                    fontSize: '16px',
                    fontWeight: 700,
                    letterSpacing: '-0.01em',
                    lineHeight: 1.15,
                  }}
                >
                  Waypoint
                </span>
                <span
                  style={{
                    color: '#94A3B8',
                    fontSize: '11.5px',
                    fontWeight: 400,
                    letterSpacing: '0.02em',
                    marginTop: '2px',
                  }}
                >
                  Warehouse
                </span>
              </div>
            </div>

            {/* Close button for tablet / mobile drawer */}
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="tablet-close-btn"
                style={{
                  color: '#94A3B8',
                  padding: '6px',
                  borderRadius: '8px',
                  display: 'none',
                }}
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Section: LOAD OPERATIONS */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 8px 10px 8px',
                color: '#64748B',
                fontSize: '10.5px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              <span>LOAD OPERATIONS</span>
              <ChevronUp size={14} style={{ color: '#64748B' }} />
            </div>

            {/* Navigation items list */}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {navItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onTabChange(item.id);
                      if (onCloseMobile) onCloseMobile();
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      fontSize: '13.5px',
                      fontWeight: isActive ? 600 : 500,
                      backgroundColor: isActive ? '#F5A623' : 'transparent',
                      color: isActive ? '#111315' : '#94A3B8',
                      transition: 'all 0.18s ease',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.color = '#FFFFFF';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#94A3B8';
                      }
                    }}
                  >
                    <IconComponent
                      size={18}
                      style={{
                        color: isActive ? '#111315' : 'inherit',
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom User Card */}
        <div
          ref={userMenuRef}
          style={{
            position: 'relative',
          }}
        >
          {/* Sign Out Popover */}
          {isUserMenuOpen && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                right: 0,
                marginBottom: '8px',
                backgroundColor: '#1E2328',
                borderRadius: '10px',
                border: '1px solid #2B303A',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                padding: '6px',
                zIndex: 100,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  if (onLogout) onLogout();
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  color: '#EF4444',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  backgroundColor: 'transparent',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <LogOut size={14} />
                <span>Sign out (Logout)</span>
              </button>
            </div>
          )}

          <div
            style={{
              backgroundColor: '#181B1F',
              borderRadius: '12px',
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* User Initials Avatar */}
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#D9A05B',
                  color: '#181B1F',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  flexShrink: 0,
                }}
              >
                {userProfile.initials}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span
                  style={{
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    lineHeight: 1.2,
                  }}
                >
                  {userProfile.name}
                </span>
                <span
                  style={{
                    color: '#94A3B8',
                    fontSize: '11px',
                    fontWeight: 400,
                    marginTop: '1px',
                  }}
                >
                  {userProfile.role}
                </span>
              </div>
            </div>

            {/* Three Dots Button */}
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              style={{
                color: isUserMenuOpen ? '#FFFFFF' : '#64748B',
                padding: '4px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isUserMenuOpen ? 'rgba(255,255,255,0.1)' : 'transparent',
              }}
              aria-label="User settings"
              title="Click to sign out"
            >
              <MoreVertical size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
