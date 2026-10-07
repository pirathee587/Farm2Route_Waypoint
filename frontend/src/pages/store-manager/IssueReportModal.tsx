import { X } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { ApiError, CreateIssueRequest, ordersApi } from '@/shared/api/apiClient';
import './IssueReportModal.css';

interface IssueReportModalProps {
  orderId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function IssueReportModal({ orderId, onClose, onSuccess }: IssueReportModalProps) {
  const [issueType, setIssueType] = useState<CreateIssueRequest['issue_type']>('short');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!description.trim()) {
      setError('Add a short description of the issue.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await ordersApi.createIssue(orderId, {
        issue_type: issueType,
        description: description.trim(),
        photo_url: photoUrl.trim() || null,
      });
      onSuccess();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Unable to report the issue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="issue-modal-backdrop" onMouseDown={onClose} role="presentation">
      <div aria-labelledby="issue-modal-title" aria-modal="true" className="issue-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog">
        <div className="issue-modal-heading"><div><p className="dashboard-kicker">Order issue</p><h3 id="issue-modal-title">Report an issue</h3></div><button aria-label="Close issue report" className="issue-modal-close" onClick={onClose} type="button"><X size={18} /></button></div>
        {error && <div className="issue-modal-error" role="alert">{error}</div>}
        <form className="issue-modal-form" onSubmit={submit}>
          <label><span>Issue type</span><select onChange={(event) => setIssueType(event.target.value as CreateIssueRequest['issue_type'])} value={issueType}><option value="short">Short / missing item</option><option value="damaged">Damaged item</option><option value="wrong">Wrong item</option></select></label>
          <label><span>Description</span><textarea onChange={(event) => setDescription(event.target.value)} placeholder="What happened?" rows={4} value={description} /></label>
          <label><span>Photo URL <small>optional</small></span><input onChange={(event) => setPhotoUrl(event.target.value)} placeholder="https://..." type="url" value={photoUrl} /></label>
          <div className="issue-modal-actions"><button className="issue-cancel" onClick={onClose} type="button">Cancel</button><button className="issue-submit" disabled={isSubmitting} type="submit">{isSubmitting ? 'Reporting...' : 'Report issue'}</button></div>
        </form>
      </div>
    </div>
  );
}
