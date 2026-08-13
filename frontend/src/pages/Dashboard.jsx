import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { fetchComplaints } from '../store/complaintsSlice';
import { resetForm, setFormStatus } from '../store/complaintsSlice';
import { resetChat, setSessionId } from '../store/chatSlice';
import { v4 as uuidv4 } from 'uuid';

export default function Dashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { list: complaints, loading } = useSelector((state) => state.complaints);

  useEffect(() => {
    dispatch(fetchComplaints());
  }, [dispatch]);

  const total = complaints.length;
  const committed = complaints.filter((c) => c.status === 'committed').length;
  const pending = complaints.filter((c) => c.status !== 'committed').length;
  const critical = complaints.filter((c) => c.severity === 'Critical').length;

  const handleNewComplaint = () => {
    const newSessionId = uuidv4();
    dispatch(resetForm());
    dispatch(resetChat());
    dispatch(setSessionId(newSessionId));
    localStorage.setItem('ccms_active_session_id', newSessionId);
    navigate(`/log-complaint?session_id=${newSessionId}`);
  };

  const handleReviewComplaint = (session_id) => {
    if (!session_id) return;
    dispatch(setSessionId(session_id));
    localStorage.setItem('ccms_active_session_id', session_id);
    navigate(`/log-complaint?session_id=${session_id}`);
  };

  const recentComplaints = [...complaints].slice(0, 5);

  return (
    <div className="dashboard-page">
      {/* Page Title */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px' }}>
          QMS Dashboard
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
          API &amp; FDF Quality Assurance Module — Overview
        </p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-card-icon primary">
            <FileText size={20} />
          </div>
          <div className="stat-value">{total}</div>
          <div className="stat-label">Total Complaints</div>
        </div>

        <div className="stat-card success">
          <div className="stat-card-icon success">
            <CheckCircle2 size={20} />
          </div>
          <div className="stat-value">{committed}</div>
          <div className="stat-label">Committed to Ledger</div>
        </div>

        <div className="stat-card warning">
          <div className="stat-card-icon warning">
            <Clock size={20} />
          </div>
          <div className="stat-value">{pending}</div>
          <div className="stat-label">Pending Triage</div>
        </div>

        <div className="stat-card danger">
          <div className="stat-card-icon danger">
            <AlertTriangle size={20} />
          </div>
          <div className="stat-value">{critical}</div>
          <div className="stat-label">Critical Severity</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
          borderRadius: 'var(--radius-lg)',
          padding: '28px 32px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div>
          <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
            Log a New Customer Complaint
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
            Paste the raw complaint text and let AIVOA Copilot extract and classify it automatically.
          </p>
        </div>
        <button
          id="btn-new-complaint-dashboard"
          className="btn-new-session"
          onClick={handleNewComplaint}
          style={{ flexShrink: 0, marginLeft: 24 }}
        >
          <Plus size={15} />
          New Complaint
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Recent Complaints */}
      <div className="table-card">
        <div className="table-header">
          <h3>Recent Complaints</h3>
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/ledger')}
            style={{ fontSize: 12 }}
          >
            View All
            <ArrowRight size={13} />
          </button>
        </div>

        {loading ? (
          <div className="empty-state">
            <div className="spinner" style={{ border: '2px solid var(--color-border)', borderTopColor: 'var(--color-primary)' }} />
          </div>
        ) : recentComplaints.length === 0 ? (
          <div className="empty-state" style={{ padding: 40 }}>
            <div className="empty-state-icon">
              <FileText size={22} color="var(--color-text-muted)" />
            </div>
            <h4>No complaints yet</h4>
            <p>Create your first complaint using the AIVOA Copilot.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Customer</th>
                <th>Product</th>
                <th>Batch</th>
                <th>Severity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentComplaints.map((c) => (
                <tr
                  key={c.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleReviewComplaint(c.session_id)}
                  title="Click to review & edit complaint"
                >
                  <td className="td-muted">#{c.id}</td>
                  <td>{c.customer_name || '—'}</td>
                  <td>{c.product_name || '—'}</td>
                  <td>
                    {c.batch_lot_number ? (
                      <span className="td-batch">{c.batch_lot_number}</span>
                    ) : '—'}
                  </td>
                  <td>
                    {c.severity && (
                      <span className={`severity-badge ${c.severity.toLowerCase()}`}>
                        {c.severity}
                      </span>
                    )}
                  </td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const label = status === 'pending_triage' ? 'Pending Triage'
    : status === 'ready_to_commit' ? 'Ready to Commit'
    : 'Committed';
  const cls = status === 'pending_triage' ? 'pending'
    : status === 'ready_to_commit' ? 'ready'
    : 'committed';
  return <span className={`status-badge ${cls}`}>{label}</span>;
}
