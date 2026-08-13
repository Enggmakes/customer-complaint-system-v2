import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Trash2, RefreshCw, FilePlus2, Search, Eye } from 'lucide-react';
import { fetchComplaints, deleteComplaint } from '../store/complaintsSlice';
import { resetForm } from '../store/complaintsSlice';
import { resetChat, setSessionId } from '../store/chatSlice';
import { addToast } from '../store/uiSlice';
import { v4 as uuidv4 } from 'uuid';

function StatusBadge({ status }) {
  const label =
    status === 'pending_triage' ? 'Pending Triage' :
    status === 'ready_to_commit' ? 'Ready to Commit' : 'Committed';
  const cls =
    status === 'pending_triage' ? 'pending' :
    status === 'ready_to_commit' ? 'ready' : 'committed';
  return <span className={`status-badge ${cls}`}>{label}</span>;
}

export default function QMSLedger() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { list: complaints, loading } = useSelector((state) => state.complaints);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');

  useEffect(() => {
    dispatch(fetchComplaints());
  }, [dispatch]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this complaint from the QMS ledger?')) return;
    try {
      await dispatch(deleteComplaint(id)).unwrap();
      dispatch(addToast({ type: 'success', message: 'Complaint removed from ledger.' }));
    } catch (err) {
      dispatch(addToast({ type: 'error', message: `Delete failed: ${err}` }));
    }
  };

  const handleNewComplaint = () => {
    const newSession = uuidv4();
    dispatch(resetForm());
    dispatch(resetChat());
    dispatch(setSessionId(newSession));
    localStorage.setItem('ccms_active_session_id', newSession);
    navigate(`/log-complaint?session_id=${newSession}`);
  };

  const handleReviewComplaint = (session_id) => {
    if (!session_id) return;
    dispatch(setSessionId(session_id));
    localStorage.setItem('ccms_active_session_id', session_id);
    navigate(`/log-complaint?session_id=${session_id}`);
  };

  const filtered = complaints.filter((c) => {
    const matchSearch =
      !search ||
      [c.customer_name, c.product_name, c.batch_lot_number, c.complaint_category]
        .some((f) => f?.toLowerCase().includes(search.toLowerCase()));
    const matchSeverity = severityFilter === 'all' || c.severity?.toLowerCase() === severityFilter;
    return matchSearch && matchSeverity;
  });

  return (
    <div className="ledger-page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px' }}>
            QMS Ledger
          </h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            All committed and pending pharmaceutical complaints
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-secondary"
            onClick={() => dispatch(fetchComplaints())}
            id="btn-refresh-ledger"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <button
            className="btn-new-session"
            onClick={handleNewComplaint}
            id="btn-new-complaint-ledger"
          >
            <FilePlus2 size={14} />
            New Complaint
          </button>
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 16,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 320 }}>
          <Search size={14} color="var(--color-text-muted)" />
          <input
            id="ledger-search"
            className="field-input"
            placeholder="Search by customer, product, batch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', padding: '4px 0', boxShadow: 'none' }}
          />
        </div>
        <select
          id="ledger-severity-filter"
          className="field-input field-select"
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          style={{ width: 160 }}
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="major">Major</option>
          <option value="minor">Minor</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-card">
        <div className="table-header">
          <h3>
            Complaints ({filtered.length})
          </h3>
        </div>

        {loading ? (
          <div className="empty-state" style={{ padding: 48 }}>
            <div
              className="spinner"
              style={{
                width: 28, height: 28,
                border: '3px solid var(--color-border)',
                borderTopColor: 'var(--color-primary)',
              }}
            />
            <p style={{ marginTop: 12 }}>Loading ledger...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: 48 }}>
            <div className="empty-state-icon">
              <FilePlus2 size={24} color="var(--color-text-muted)" />
            </div>
            <h4>No complaints found</h4>
            <p>Try adjusting your search or create a new complaint.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Batch / Lot</th>
                  <th>Category</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td className="td-muted font-mono">#{c.id}</td>
                    <td style={{ fontWeight: 500 }}>{c.customer_name || '—'}</td>
                    <td>
                      <div>{c.product_name || '—'}</div>
                      {c.product_strength && (
                        <div className="td-muted" style={{ fontSize: 11 }}>{c.product_strength}</div>
                      )}
                    </td>
                    <td>
                      {c.batch_lot_number ? (
                        <span className="td-batch">{c.batch_lot_number}</span>
                      ) : '—'}
                    </td>
                    <td className="td-muted" style={{ fontSize: 12 }}>
                      {c.complaint_category || '—'}
                    </td>
                    <td>
                      {c.severity ? (
                        <span className={`severity-badge ${c.severity.toLowerCase()}`}>
                          {c.severity}
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="td-muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      {c.created_at
                        ? new Date(c.created_at).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleReviewComplaint(c.session_id)}
                          id={`btn-review-${c.id}`}
                          style={{ padding: '4px 8px', fontSize: 11 }}
                          title="Open & Review Complaint"
                        >
                          <Eye size={12} />
                          Review
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => handleDelete(c.id)}
                          id={`btn-delete-${c.id}`}
                          style={{ padding: '4px 8px' }}
                          title="Delete Record"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
