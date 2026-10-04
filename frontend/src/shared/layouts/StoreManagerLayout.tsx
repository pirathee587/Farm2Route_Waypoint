import { LayoutDashboard, LogOut, Package, Truck, Warehouse } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { authSession } from '@/features/auth/authSession';
import waypointLogoImg from '@/assets/waypoint-logo.png';
import './StoreManagerLayout.css';

const navigation = [
  { label: 'Dashboard', to: '/store-manager', icon: LayoutDashboard, end: true },
  { label: 'Orders', to: '/store-manager/orders', icon: Package },
  // Temporary mapping until a dedicated active-deliveries list exists.
  { label: 'Deliveries', to: '/store-manager/orders?status=ALLOCATED', icon: Truck },
  { label: 'Receiving', to: '/store-manager/receiving', icon: Warehouse },
];

export function StoreManagerLayout() {
  const user = authSession.get()?.user;

  const signOut = () => {
    authSession.clear();
    window.location.assign('/');
  };

  return (
    <div className="store-shell">
      <aside className="store-sidebar">
        <div className="store-brand">
          <img alt="Waypoint Logo" className="store-brand-img" src={waypointLogoImg} />
          <span>WAYPOINT</span>
        </div>
        <div className="store-sidebar-label">Store Manager</div>
        <nav className="store-nav" aria-label="Store Manager navigation">
          {navigation.map(({ label, to, icon: Icon, end }) => (
            <NavLink
              className={({ isActive }: { isActive: boolean }) =>
                `store-nav-link${isActive ? ' is-active' : ''}`}
              end={end}
              key={label}
              to={to}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <button className="store-signout" onClick={signOut} type="button">
          <LogOut size={17} />
          <span>Sign out</span>
        </button>
      </aside>
      <main className="store-main">
        <header className="store-topbar">
          <div>
            <p className="store-eyebrow">Store operations</p>
            <h1>Welcome back{user?.fullName ? `, ${user.fullName}` : ''}</h1>
          </div>
          <div className="store-account" aria-label="Signed-in account">
            <span className="store-avatar">{user?.fullName?.charAt(0) || 'S'}</span>
            <span>{user?.email || 'Store Manager'}</span>
          </div>
        </header>
        <section className="store-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}