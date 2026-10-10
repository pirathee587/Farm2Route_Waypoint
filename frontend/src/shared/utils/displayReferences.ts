export function orderReference(id: string, createdAt?: string): string {
  const date = createdAt ? new Date(createdAt) : null;
  const day = date && !Number.isNaN(date.getTime())
    ? `${String(date.getFullYear()).slice(-2)}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`
    : 'ORDER';
  return `ORD-${day}-${id.replace(/-/g,'').slice(0,6).toUpperCase()}`;
}
