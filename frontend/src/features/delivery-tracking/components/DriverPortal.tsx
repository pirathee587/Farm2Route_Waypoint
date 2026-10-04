import React, { useState } from 'react';
import { DriverView, BottomTab } from '../types';
import { DriverHomeView } from './DriverHomeView';
import { StopDetailsView } from './StopDetailsView';
import { ProofOfDeliveryView } from './ProofOfDeliveryView';
import { TripSummaryView } from './TripSummaryView';
import { WaitingWindowView } from './WaitingWindowView';
import { CantDeliverView } from './CantDeliverView';
import { RouteMapView } from './RouteMapView';
import { ProfileView } from './ProfileView';
import { NotificationsView } from './NotificationsView';
import { BottomNav } from './BottomNav';
import '../styles/driver-portal.css';

interface DriverPortalProps {
  onLogout?: () => void;
  currentUser?: { email: string; role?: string; fullName?: string } | null;
}

export const DriverPortal: React.FC<DriverPortalProps> = ({ onLogout, currentUser }) => {
  const [currentView, setCurrentView] = useState<DriverView>('home');
  const [activeTab, setActiveTab] = useState<BottomTab>('today');
  const [deviceFrameMode, setDeviceFrameMode] = useState<boolean>(true);
  const [notificationToast, setNotificationToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setNotificationToast(message);
    setTimeout(() => {
      setNotificationToast(null);
    }, 3200);
  };

  // Handle Tab Switch
  const handleTabChange = (tab: BottomTab) => {
    setActiveTab(tab);
    if (tab === 'today') {
      setCurrentView('home');
    } else if (tab === 'map') {
      setCurrentView('route-map');
    } else if (tab === 'profile') {
      setCurrentView('profile');
    }
  };

  // Handle reporting issue
  const handleReportIssue = (reason: string, note: string) => {
    showToast(`Issue reported: "${reason}". Outlet deferral recorded.`);
    setCurrentView('home');
  };

  return (
    <div className="driver-portal-wrapper">
      {/* Toast Notification */}
      {notificationToast && (
        <div
          style={{
            position: 'fixed',
            top: 20,
            zIndex: 9999,
            backgroundColor: '#0f172a',
            color: '#facc15',
            padding: '12px 24px',
            borderRadius: 14,
            fontWeight: 700,
            fontSize: 13.5,
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          ✓ {notificationToast}
        </div>
      )}

      {/* Desktop Helper Bar: Quick Screen Jump & Mode Switch */}
      <div
        style={{
          position: 'fixed',
          top: 12,
          right: 16,
          zIndex: 1000,
          display: 'none',
          gap: 6,
          alignItems: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '6px 10px',
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          backdropFilter: 'blur(8px)',
          border: '1px solid #e2e8f0',
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: '#64748b',
            textTransform: 'uppercase',
            marginRight: 4,
          }}
        >
          Screens:
        </span>
        <button
          type="button"
          onClick={() => {
            setCurrentView('home');
            setActiveTab('today');
          }}
          style={{
            fontSize: 11,
            fontWeight: currentView === 'home' ? 800 : 600,
            backgroundColor: currentView === 'home' ? '#fef08a' : '#f1f5f9',
            color: '#0f172a',
            padding: '4px 8px',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          0. Home
        </button>
        <button
          type="button"
          onClick={() => {
            setCurrentView('stop-details');
            setActiveTab('today');
          }}
          style={{
            fontSize: 11,
            fontWeight: currentView === 'stop-details' ? 800 : 600,
            backgroundColor: currentView === 'stop-details' ? '#fef08a' : '#f1f5f9',
            color: '#0f172a',
            padding: '4px 8px',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          1. Stop 3
        </button>
        <button
          type="button"
          onClick={() => {
            setCurrentView('proof-of-delivery');
            setActiveTab('today');
          }}
          style={{
            fontSize: 11,
            fontWeight: currentView === 'proof-of-delivery' ? 800 : 600,
            backgroundColor: currentView === 'proof-of-delivery' ? '#fef08a' : '#f1f5f9',
            color: '#0f172a',
            padding: '4px 8px',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          2. Driver-POD
        </button>
        <button
          type="button"
          onClick={() => {
            setCurrentView('trip-summary');
            setActiveTab('today');
          }}
          style={{
            fontSize: 11,
            fontWeight: currentView === 'trip-summary' ? 800 : 600,
            backgroundColor: currentView === 'trip-summary' ? '#fef08a' : '#f1f5f9',
            color: '#0f172a',
            padding: '4px 8px',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          3. Summary
        </button>
        <button
          type="button"
          onClick={() => {
            setCurrentView('waiting-window');
            setActiveTab('today');
          }}
          style={{
            fontSize: 11,
            fontWeight: currentView === 'waiting-window' ? 800 : 600,
            backgroundColor: currentView === 'waiting-window' ? '#fef08a' : '#f1f5f9',
            color: '#0f172a',
            padding: '4px 8px',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          3. Waiting
        </button>
        <button
          type="button"
          onClick={() => {
            setCurrentView('cant-deliver');
            setActiveTab('today');
          }}
          style={{
            fontSize: 11,
            fontWeight: currentView === 'cant-deliver' ? 800 : 600,
            backgroundColor: currentView === 'cant-deliver' ? '#fef08a' : '#f1f5f9',
            color: '#0f172a',
            padding: '4px 8px',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          4. Can't Deliver
        </button>
        <button
          type="button"
          onClick={() => {
            setCurrentView('route-map');
            setActiveTab('map');
          }}
          style={{
            fontSize: 11,
            fontWeight: currentView === 'route-map' ? 800 : 600,
            backgroundColor: currentView === 'route-map' ? '#fef08a' : '#f1f5f9',
            color: '#0f172a',
            padding: '4px 8px',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          5. Route Map
        </button>
        <button
          type="button"
          onClick={() => {
            setCurrentView('profile');
            setActiveTab('profile');
          }}
          style={{
            fontSize: 11,
            fontWeight: currentView === 'profile' ? 800 : 600,
            backgroundColor: currentView === 'profile' ? '#fef08a' : '#f1f5f9',
            color: '#0f172a',
            padding: '4px 8px',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          6. Profile
        </button>
        <button
          type="button"
          onClick={() => {
            setCurrentView('notifications');
            setActiveTab('profile');
          }}
          style={{
            fontSize: 11,
            fontWeight: currentView === 'notifications' ? 800 : 600,
            backgroundColor: currentView === 'notifications' ? '#fef08a' : '#f1f5f9',
            color: '#0f172a',
            padding: '4px 8px',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          7. Notifications
        </button>
      </div>

      {/* Mobile Device Frame */}
      <div
        className="driver-portal-device"
        style={{
          maxWidth: deviceFrameMode ? '430px' : '640px',
        }}
      >
        {/* Render Current Screen */}
        {currentView === 'home' && (
          <DriverHomeView
            onSelectStop={(stopId) => {
              setCurrentView('stop-details');
              setActiveTab('today');
            }}
            onOpenNotifications={() => {
              setCurrentView('notifications');
            }}
            onOpenMap={() => {
              setCurrentView('route-map');
              setActiveTab('map');
            }}
          />
        )}

        {currentView === 'stop-details' && (
          <StopDetailsView
            onBack={() => setCurrentView('home')}
            onOpenCantDeliver={() => setCurrentView('cant-deliver')}
            onEnterWaitingWindow={() => setCurrentView('waiting-window')}
            onArrived={() => setCurrentView('proof-of-delivery')}
            onCompleteDelivery={() => {
              showToast('Delivery completed & POD recorded!');
              setCurrentView('home');
            }}
            onOpenNotifications={() => setCurrentView('notifications')}
          />
        )}

        {currentView === 'proof-of-delivery' && (
          <ProofOfDeliveryView
            onBack={() => setCurrentView('stop-details')}
            onConfirmDelivery={() => {
              showToast('Delivery completed & POD recorded!');
              setCurrentView('trip-summary');
            }}
            onOpenNotifications={() => setCurrentView('notifications')}
          />
        )}

        {currentView === 'trip-summary' && (
          <TripSummaryView
            onReturnToRoute={() => {
              setCurrentView('home');
              setActiveTab('today');
            }}
            onOpenNotifications={() => setCurrentView('notifications')}
          />
        )}

        {currentView === 'waiting-window' && (
          <WaitingWindowView
            onBack={() => setCurrentView('stop-details')}
            onOpenCantDeliver={() => setCurrentView('cant-deliver')}
          />
        )}

        {currentView === 'cant-deliver' && (
          <CantDeliverView
            onBack={() => setCurrentView('waiting-window')}
            onSubmitReport={handleReportIssue}
          />
        )}

        {currentView === 'route-map' && (
          <RouteMapView
            onViewStop={(stopId) => {
              setCurrentView('stop-details');
              setActiveTab('today');
            }}
            onViewSummary={() => {
              setCurrentView('trip-summary');
              setActiveTab('today');
            }}
          />
        )}

        {currentView === 'profile' && (
          <ProfileView
            onOpenNotifications={() => setCurrentView('notifications')}
            onLogout={onLogout}
            currentUser={currentUser}
          />
        )}

        {currentView === 'notifications' && (
          <NotificationsView
            onBack={() => setCurrentView('profile')}
            onViewUpdatedRoute={() => {
              setCurrentView('route-map');
              setActiveTab('map');
            }}
          />
        )}

        {/* Persistent Bottom Navigation Bar */}
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </div>
    </div>
  );
};
