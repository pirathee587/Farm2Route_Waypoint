export type DriverView =
  | 'home'
  | 'stop-details'
  | 'waiting-window'
  | 'cant-deliver'
  | 'proof-of-delivery'
  | 'trip-summary'
  | 'route-map'
  | 'profile'
  | 'notifications';

export type BottomTab = 'today' | 'map' | 'profile';

export interface RouteStop {
  id: string;
  stopNumber: number;
  outletName: string;
  outletCode: string;
  city: string;
  window: string;
  distance: string;
  eta: string;
  temperature: string;
  constraint: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'REMOVED';
  coordX: number; // percentage on map
  coordY: number;
}

export interface DriverNotification {
  id: string;
  title: string;
  time: string;
  description: string;
  type: 'danger' | 'info' | 'success';
  statusDotColor: string;
  isUnread?: boolean;
}
