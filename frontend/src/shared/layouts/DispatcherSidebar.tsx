// ============================================================
// DispatcherSidebar — Dispatcher App Navigation
// ============================================================

import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  Route,
  Clock,
  MapPin,
  Truck,
  BarChart2,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import waypointLogoImg from '@/assets/waypoint-logo.png';

export type DispatcherPage =
  | 'dashboard'
  | 'orders'
  | 'route-planning'
  | 'deferred-orders'
  | 'live-tracking'
  | 'fleet'
  | 'reports';

interface NavItem {
  id: DispatcherPage;
  label: string;
  icon: LucideIcon;
}

interface NavSection {
  sectionLabel?: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'orders', label: 'Orders Queue', icon: ClipboardList },
      { id: 'route-planning', label: 'Route Planning', icon: Route },
      { id: 'deferred-orders', label: 'Deferred Orders', icon: Clock },
      { id: 'live-tracking', label: 'Live Tracking', icon: MapPin },
      { id: 'fleet', label: 'Fleet / Capacity', icon: Truck },
    ],
  },
  {
    sectionLabel: 'INSIGHTS',
    items: [{ id: 'reports', label: 'Reports', icon: BarChart2 }],
  },
];

interface DispatcherSidebarProps {
  activePage: DispatcherPage;
  onNavigate: (page: DispatcherPage) => void;
  collapsed?: boolean;
}

export const DispatcherSidebar: React.FC<DispatcherSidebarProps> = ({
  activePage,
  onNavigate,
  collapsed = false,
}) => {
  return (
    <aside
      className="dispatcher-sidebar"
      style={{
        width: collapsed ? '64px' : '200px',
        minWidth: collapsed ? '64px' : '200px',
        height: '100vh',
        backgroundColor: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        transition: 'width 0.2s ease',
        zIndex: 100,
        flexShrink: 0,
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: collapsed ? '20px 12px' : '20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            backgroundColor: '#F59E0B',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <img
            src={waypointLogoImg}
            alt="Waypoint"
            style={{ width: '22px', height: '22px', objectFit: 'contain' }}
          />
        </div>
        {!collapsed && (
          <div>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: '#FFFFFF',
                lineHeight: 1.2,
              }}
            >
              Waypoint
            </div>
            <div
              style={{
                fontSize: '11px',
                color: '#94a3b8',
                fontWeight: 500,
                lineHeight: 1,
                marginTop: '2px',
              }}
            >
              Dispatcher
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav
        style={{
          flex: 1,
          padding: '12px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}
      >
        {navSections.map((section, sIdx) => (
          <div key={sIdx} style={{ marginBottom: '8px' }}>
            {section.sectionLabel && !collapsed && (
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  color: '#475569',
                  letterSpacing: '0.08em',
                  padding: '8px 8px 4px',
                  textTransform: 'uppercase',
                }}
              >
                {section.sectionLabel}
              </div>
            )}
            {section.items.map((item) => {
              const isActive = activePage === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  title={collapsed ? item.label : undefined}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: collapsed ? '10px 0' : '9px 10px',
                    borderRadius: '8px',
                    backgroundColor: isActive ? '#F59E0B' : 'transparent',
                    color: isActive ? '#0f172a' : '#94a3b8',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                    border: 'none',
                    textAlign: 'left',
                    transition: 'background-color 0.15s ease, color 0.15s ease',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                        'rgba(255,255,255,0.07)';
                      (e.currentTarget as HTMLButtonElement).style.color = '#e2e8f0';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                      (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8';
                    }
                  }}
                >
                  <Icon
                    size={16}
                    color={isActive ? '#0f172a' : 'currentColor'}
                  />
                  {!collapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom User Area */}
      <div
        style={{
          borderTop: '1px solid rgba(255,255,255,0.07)',
          padding: '12px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          justifyContent: collapsed ? 'center' : 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          {/* Avatar */}
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              backgroundColor: '#334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#e2e8f0',
              fontSize: '13px',
              fontWeight: 700,
              flexShrink: 0,
              backgroundImage:
                'linear-gradient(135deg, #475569 0%, #334155 100%)',
            }}
          >
            N
          </div>
          {!collapsed && (
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#e2e8f0',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                Nivethan
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Dispatcher</div>
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            type="button"
            title="Sign out"
            disabled
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '6px',
              borderRadius: '6px',
              color: '#64748b', opacity: 0.55, cursor: 'not-allowed',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = '#e2e8f0';
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                'rgba(255,255,255,0.07)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = '#64748b';
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
            }}
          >
            <LogOut size={15} />
          </button>
        )}
      </div>
    </aside>
  );
};
