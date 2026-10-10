import React, { useEffect, useState } from 'react';
import { AlertCircle, Bell, ChevronLeft } from 'lucide-react';
import { driverDeliveryApi, DriverNotification } from '../driverDeliveryApi';

interface Props { onBack: () => void; onViewUpdatedRoute: () => void; }
const ago = (value: string) => new Date(value).toLocaleString([], { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });

export const NotificationsView: React.FC<Props> = ({ onBack, onViewUpdatedRoute }) => {
  const [items, setItems] = useState<DriverNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState('');
  const load = () => driverDeliveryApi.notifications().then(data => {
    const combined = data.pinned ? [data.pinned, ...data.items.filter(x => x.id !== data.pinned?.id)] : data.items;
    setItems(combined); setUnread(data.unread_count);
  }).catch((e: Error) => setError(e.message));
  useEffect(() => { void load(); }, []);
  const open = async (item: DriverNotification) => {
    if (!item.is_read) { await driverDeliveryApi.reviewNotification(item.id); await load(); }
    if (item.type === 'ROUTE_UPDATED') onViewUpdatedRoute();
  };
  const readAll = async () => { await driverDeliveryApi.readAllNotifications(); await load(); };
  return <div className="driver-screen-content animate-fade-in">
    <div className="driver-header-nav"><button type="button" className="driver-back-btn" onClick={onBack}><ChevronLeft size={22}/></button><h1 className="driver-header-title">Notifications</h1>{unread > 0 && <span style={{marginLeft:'auto',padding:'4px 10px',borderRadius:999,background:'#facc15',fontWeight:800}}>{unread} new</span>}</div>
    <p style={{color:'#64748b'}}>Live operational updates from the database</p>
    {error && <div style={{padding:14,borderRadius:14,background:'#fef2f2',color:'#b91c1c'}}><AlertCircle size={18}/> {error}</div>}
    {!error && items.length === 0 && <div style={{textAlign:'center',padding:42,color:'#64748b'}}><Bell size={34}/><p>No notifications for today.</p></div>}
    <div style={{display:'grid',gap:12}}>{items.map(item => <button key={item.id} type="button" onClick={() => void open(item)} style={{textAlign:'left',padding:16,borderRadius:18,border:item.is_read?'1px solid #e2e8f0':'2px solid #facc15',background:'#fff',cursor:'pointer'}}><div style={{display:'flex',justifyContent:'space-between',gap:12}}><strong>{item.title}</strong><span style={{fontSize:11,color:'#64748b'}}>{ago(item.created_at)}</span></div><p style={{margin:'8px 0 0',color:'#475569'}}>{item.body}</p><div style={{marginTop:8,fontSize:11,color:'#64748b'}}>{item.type.replaceAll('_',' ')}</div></button>)}</div>
    {unread > 0 && <button type="button" onClick={() => void readAll()} style={{marginTop:18,width:'100%',padding:12,borderRadius:12,border:'1px solid #cbd5e1',background:'#fff',fontWeight:700}}>Mark all as read</button>}
  </div>;
};
