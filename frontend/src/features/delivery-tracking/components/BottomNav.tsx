import React from 'react';
import { Home, Map, User } from 'lucide-react';
import { BottomTab } from '../types';

interface BottomNavProps {
  activeTab: BottomTab;
  onTabChange: (tab: BottomTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav className="driver-bottom-nav">
      <button
        type="button"
        className={`driver-nav-item ${activeTab === 'today' ? 'active' : ''}`}
        onClick={() => onTabChange('today')}
        aria-label="Today tab"
      >
        <div className="driver-nav-icon-container">
          <Home size={24} strokeWidth={2.4} />
        </div>
        <span className="driver-nav-label">Today</span>
      </button>

      <button
        type="button"
        className={`driver-nav-item ${activeTab === 'map' ? 'active' : ''}`}
        onClick={() => onTabChange('map')}
        aria-label="Map tab"
      >
        <div className="driver-nav-icon-container">
          <Map size={24} strokeWidth={2.4} />
        </div>
        <span className="driver-nav-label">Map</span>
      </button>

      <button
        type="button"
        className={`driver-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
        onClick={() => onTabChange('profile')}
        aria-label="Profile tab"
      >
        <div className="driver-nav-icon-container">
          <User size={24} strokeWidth={2.4} />
        </div>
        <span className="driver-nav-label">Profile</span>
      </button>
    </nav>
  );
};
