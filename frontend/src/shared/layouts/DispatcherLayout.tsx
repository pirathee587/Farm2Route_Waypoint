// ============================================================
// DispatcherLayout — Page shell wrapping Sidebar + main content
// ============================================================

import React, { useState } from 'react';
import { DispatcherSidebar, type DispatcherPage } from './DispatcherSidebar';

interface DispatcherLayoutProps {
  activePage: DispatcherPage;
  onNavigate: (page: DispatcherPage) => void;
  children: React.ReactNode;
}

export const DispatcherLayout: React.FC<DispatcherLayoutProps> = ({
  activePage,
  onNavigate,
  children,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100%',
        backgroundColor: '#f8fafc',
        overflow: 'hidden',
      }}
    >
      {/* Sidebar */}
      <DispatcherSidebar
        activePage={activePage}
        onNavigate={onNavigate}
        collapsed={sidebarCollapsed}
      />

      {/* Toggle button (tablet/mobile) — only visible on narrow screens */}
      <button
        type="button"
        id="sidebar-toggle"
        onClick={() => setSidebarCollapsed((c) => !c)}
        aria-label="Toggle sidebar"
        style={{
          position: 'fixed',
          bottom: '20px',
          left: sidebarCollapsed ? '76px' : '212px',
          zIndex: 200,
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          backgroundColor: '#0f172a',
          border: '2px solid #334155',
          color: '#94a3b8',
          display: 'none', // hidden by default; shown via CSS media query
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          cursor: 'pointer',
          transition: 'left 0.2s ease',
        }}
        className="sidebar-toggle-btn"
      >
        {sidebarCollapsed ? '›' : '‹'}
      </button>

      {/* Main content area */}
      <main
        style={{
          flex: 1,
          minWidth: 0,
          height: '100vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </main>
    </div>
  );
};
