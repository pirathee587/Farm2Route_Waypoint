import React from 'react';
import { RouteMapPage } from '@/features/driver-map';

interface RouteMapViewProps {
  onViewStop?: (stopId?: string) => void;
  onViewSummary?: () => void;
}

export const RouteMapView: React.FC<RouteMapViewProps> = ({ onViewStop, onViewSummary }) => {
  return (
    <RouteMapPage
      onViewStop={onViewStop}
      onViewSummary={onViewSummary}
    />
  );
};

export default RouteMapView;
