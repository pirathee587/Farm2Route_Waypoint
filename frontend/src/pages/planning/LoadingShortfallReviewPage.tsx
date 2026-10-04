import React, { useEffect, useState } from 'react';
import { ChevronLeft, ExternalLink, AlertTriangle } from 'lucide-react';
import { DispatcherSidebar } from '@/shared/layouts/DispatcherSidebar';
import { loadingApi } from '@/features/loading/api';
import type { ShortfallDetail, TripDetail } from '@/features/loading/types';

interface Props { tripId: string; issueId?: string; onNavigateGlobal?: (page: string) => void; }

export const LoadingShortfallReviewPage: React.FC<Props> = ({ tripId, issueId, onNavigateGlobal }) => {
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [shortfall, setShortfall] = useState<ShortfallDetail | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([loadingApi.trip(tripId), loadingApi.shortfalls(tripId)]).then(([loadedTrip, issues]) => {
      if (!active) return;
      setTrip(loadedTrip);
      setShortfall(issues.find(issue => !issueId || issue.issueId === issueId) ?? null);
    }).catch(err => active && setError(err instanceof Error ? err.message : 'Unable to load the shortfall review.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [tripId, issueId]);

  const resolve = async () => {
    if (!shortfall) return;
    setSaving(true);
    try {
      await loadingApi.resolveShortfall(shortfall.issueId, notes);
      setShortfall({ ...shortfall, resolved: true, resolutionNotes: notes });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to resolve the shortfall.');
    } finally { setSaving(false); }
  };

  const back = () => onNavigateGlobal?.('dashboard');
  if (loading) return <Shell onNavigateGlobal={onNavigateGlobal}><p>Loading shortfall review...</p></Shell>;
  if (error || !trip || !shortfall) return <Shell onNavigateGlobal={onNavigateGlobal}><p style={{ color: '#b91c1c' }}>{error || 'Shortfall report not found.'}</p></Shell>;
  const stop = trip.stops.find(item => item.stopId === shortfall.stopId);
  const item = shortfall.itemId ? undefined : undefined;
  const expected = stop?.crates ?? shortfall.qtyAffected;
  const available = Math.max(0, expected - shortfall.qtyAffected);

  return <Shell onNavigateGlobal={onNavigateGlobal}>
    <button onClick={back} style={styles.back}><ChevronLeft size={16} /> Back to Dashboard</button>
    <div style={styles.header}><div><h1 style={styles.title}>Loading Shortfall Review</h1><p style={styles.subtitle}>Review the loader's report and update the confirmed trip before departure.</p></div><span style={styles.hold}>DEPARTURE HOLD</span></div>
    <div style={styles.warning}><AlertTriangle size={22} /><div><strong>LOADER REPORTED A SHORTFALL</strong><div>{trip.header.tripCode} cannot leave with the original manifest until the change is reviewed.</div></div></div>
    <div style={styles.grid}>
      <section style={styles.card}><h2 style={styles.cardTitle}>Trip Summary</h2><Info label="Trip ID" value={trip.header.tripCode} /><Info label="Loading status" value={trip.header.status} /><Info label="Vehicle" value={trip.vehicle.vehicleId} /><Info label="Driver" value={trip.driver.name} /><Info label="Dock" value={trip.dock} /><Info label="Operational status" value="Departure Hold" /></section>
      <section style={styles.card}><h2 style={styles.cardTitle}>Loader Report</h2><Info label="Report reference" value={shortfall.ref} /><Info label="Affected item" value={shortfall.itemId || 'Item reference unavailable'} /><Info label="Reason" value={shortfall.reason || shortfall.issueType} /><Info label="Shortfall" value={`${shortfall.qtyAffected} crates missing`} /><Info label="Reported by" value={shortfall.flaggedBy} /><Info label="Reported at" value={new Date(shortfall.dispatcherNotifiedAt).toLocaleString()} /><p style={styles.note}>{shortfall.description || 'No loader note supplied.'}</p>{shortfall.evidenceUrl ? <a href={shortfall.evidenceUrl} target="_blank" rel="noreferrer" style={styles.link}>View Evidence <ExternalLink size={14} /></a> : <span style={styles.muted}>No evidence attached.</span>}</section>
      <section style={styles.card}><h2 style={styles.cardTitle}>Plan Impact</h2><Info label="Affected order" value={shortfall.orderId || 'Order reference unavailable'} /><Info label="Original manifest" value={`${expected} crates`} /><Info label="Available now" value={`${available} crates`} /><Info label="Difference" value={`-${shortfall.qtyAffected} crates`} /><span style={styles.change}>MANIFEST CHANGE</span></section>
    </div>
    <section style={styles.decision}><h2 style={styles.cardTitle}>If the plan is updated</h2><ol style={{ margin: 0, paddingLeft: 20, color: '#475569', lineHeight: 1.9 }}><li>Trip manifest updates ({expected} → {available} crates)</li><li>Loader receives the change</li><li>Loader acknowledgement is required</li><li>Departure resumes only after resolution</li><li>Driver receives the recorded quantity</li></ol></section>
    <section style={styles.decision}><h2 style={styles.cardTitle}>Dispatcher Decision</h2><p>Hold for resolution while the warehouse issue is investigated. Approve only the operational amendment you have reviewed.</p><textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Operational reason or review note (optional)" maxLength={500} style={styles.textarea} /><div style={styles.actions}><button onClick={back} style={styles.secondary}>View Confirmed Trip</button><button onClick={resolve} disabled={saving || shortfall.resolved} style={styles.primary}>{shortfall.resolved ? 'Resolved' : saving ? 'Saving...' : 'Confirm Plan Update'}</button></div></section>
  </Shell>;
};

const Info = ({ label, value }: { label: string; value: string }) => <div style={styles.info}><span>{label}</span><strong>{value}</strong></div>;
const Shell: React.FC<{ children: React.ReactNode; onNavigateGlobal?: (page: string) => void }> = ({ children, onNavigateGlobal }) => <div style={styles.shell}><DispatcherSidebar activePage="route-planning" onNavigate={onNavigateGlobal || (() => {})} /><main style={styles.main}>{children}</main></div>;
const styles: Record<string, React.CSSProperties> = { shell:{display:'flex',height:'100vh',background:'#f1f5f9'},main:{flex:1,overflowY:'auto',padding:'28px 36px'},back:{display:'flex',alignItems:'center',gap:5,border:0,background:'none',color:'#2563eb',fontWeight:700,cursor:'pointer',padding:0,marginBottom:18},header:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20},title:{margin:0,color:'#1e293b',fontSize:26},subtitle:{color:'#64748b',margin:'8px 0 0'},hold:{background:'#fee2e2',color:'#b91c1c',fontWeight:800,fontSize:11,padding:'8px 12px',borderRadius:20},warning:{display:'flex',gap:12,alignItems:'center',background:'#fee2e2',border:'1px solid #fca5a5',color:'#991b1b',padding:16,borderRadius:10,marginBottom:20},grid:{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:18},card:{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:22},cardTitle:{fontSize:16,color:'#1e293b',margin:'0 0 18px'},info:{display:'flex',justifyContent:'space-between',gap:12,borderBottom:'1px solid #f1f5f9',padding:'10px 0',fontSize:13},infoSpan:{color:'#64748b'},note:{color:'#475569',fontSize:13,lineHeight:1.5},link:{display:'inline-flex',gap:5,alignItems:'center',color:'#2563eb',fontWeight:700,fontSize:13},muted:{color:'#94a3b8',fontSize:13},change:{display:'inline-block',marginTop:18,background:'#fef3c7',color:'#92400e',fontWeight:800,fontSize:11,padding:'6px 10px',borderRadius:5},decision:{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:22,marginTop:18},textarea:{width:'100%',minHeight:70,border:'1px solid #cbd5e1',borderRadius:8,padding:10,boxSizing:'border-box',resize:'vertical'},actions:{display:'flex',justifyContent:'flex-end',gap:10,marginTop:16},secondary:{padding:'10px 14px',border:'1px solid #cbd5e1',borderRadius:7,background:'#fff',fontWeight:700},primary:{padding:'10px 16px',border:0,borderRadius:7,background:'#facc15',color:'#422006',fontWeight:800,cursor:'pointer'}};
