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
  Briefcase,
  Sparkles,
  Zap,
  Mail,
  FileSearch,
  BarChart3,
  Layers,
} from 'lucide-react';
import { fetchComplaints } from '../store/complaintsSlice';
import { resetForm } from '../store/complaintsSlice';
import { resetChat, setSessionId } from '../store/chatSlice';
import { setWorkspace } from '../store/workspaceSlice';
import { v4 as uuidv4 } from 'uuid';

export default function Dashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { list: complaints, loading } = useSelector((state) => state.complaints);
  const { activeWorkspace, workspaces } = useSelector((state) => state.workspace);
  const currentWs = workspaces[activeWorkspace] || workspaces.general;

  useEffect(() => {
    dispatch(fetchComplaints());
  }, [dispatch]);

  const total = complaints.length;
  const committed = complaints.filter((c) => c.status === 'committed').length;
  const services = complaints.filter((c) => c.record_type === 'service_request' || c.record_type === 'proposal').length;
  const issues = complaints.filter((c) => c.record_type === 'issue' || !c.record_type).length;
  const critical = complaints.filter((c) => c.severity === 'Critical' || c.severity === 'High').length;

  const handleNewRecord = () => {
    const newSessionId = uuidv4();
    dispatch(resetForm());
    dispatch(resetChat());
    dispatch(setSessionId(newSessionId));
    localStorage.setItem('ccms_active_session_id', newSessionId);
    navigate(`/log-complaint?session_id=${newSessionId}`);
  };

  const handleReviewRecord = (session_id) => {
    if (!session_id) return;
    dispatch(setSessionId(session_id));
    localStorage.setItem('ccms_active_session_id', session_id);
    navigate(`/log-complaint?session_id=${session_id}`);
  };

  const recentComplaints = [...complaints].slice(0, 6);

  return (
    <div className="dashboard-page">
      {/* Page Title & Workspace Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px' }}>
              Operations Overview
            </h1>
            <span className="workspace-banner-pill" style={{ background: currentWs.gradient }}>
              {currentWs.badge}
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Real-time operations, service fulfillment, and issue resolution metrics across all business lines.
          </p>
        </div>

        <button
          id="btn-new-complaint-dashboard"
          className="dashboard-new-btn"
          onClick={handleNewRecord}
        >
          <Plus size={15} />
          New Operation
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-card-icon primary">
            <Layers size={20} />
          </div>
          <div className="stat-value">{total}</div>
          <div className="stat-label">Total Operations Logged</div>
        </div>

        <div className="stat-card success">
          <div className="stat-card-icon success">
            <CheckCircle2 size={20} />
          </div>
          <div className="stat-value">{committed}</div>
          <div className="stat-label">Committed to Ledger</div>
        </div>

        <div className="stat-card warning" style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }}>
          <div className="stat-card-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Briefcase size={20} />
          </div>
          <div className="stat-value">{services}</div>
          <div className="stat-label">Services &amp; Proposals</div>
        </div>

        <div className="stat-card danger">
          <div className="stat-card-icon danger">
            <AlertTriangle size={20} />
          </div>
          <div className="stat-value">{critical}</div>
          <div className="stat-label">High / Critical Priority</div>
        </div>
      </div>

      {/* Quick Launchpad AI Tool Cards */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Sparkles size={16} color="var(--color-primary)" />
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            AI Operations Launchpad
          </h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          {/* Card 1 */}
          <div
            className="tool-workspace-card"
            style={{
              cursor: 'pointer',
              padding: 16,
              marginBottom: 0,
              background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
              color: '#fff',
            }}
            onClick={handleNewRecord}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Zap size={16} color="#a5b4fc" />
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Operations Copilot</h4>
            </div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>
              Extract, triage, and evaluate any customer issue or service request automatically.
            </p>
          </div>

          {/* Card 2 */}
          <div
            className="tool-workspace-card"
            style={{ cursor: 'pointer', padding: 16, marginBottom: 0 }}
            onClick={() => navigate('/tools')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Briefcase size={16} color="#10b981" />
              <h4 style={{ fontSize: 14, fontWeight: 700 }}>Proposal Generator</h4>
            </div>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
              Generate itemized quotes, milestones, and deliverable budgets in 1 click.
            </p>
          </div>

          {/* Card 3 */}
          <div
            className="tool-workspace-card"
            style={{ cursor: 'pointer', padding: 16, marginBottom: 0 }}
            onClick={() => navigate('/tools')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Mail size={16} color="#8b5cf6" />
              <h4 style={{ fontSize: 14, fontWeight: 700 }}>Client Email Studio</h4>
            </div>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
              Draft personalized resolution responses, quote follow-ups, and project updates.
            </p>
          </div>

          {/* Card 4 */}
          <div
            className="tool-workspace-card"
            style={{ cursor: 'pointer', padding: 16, marginBottom: 0 }}
            onClick={() => navigate('/datalens')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <BarChart3 size={16} color="#38bdf8" />
              <h4 style={{ fontSize: 14, fontWeight: 700 }}>DataLens Analytics</h4>
            </div>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
              Universal AI data profiling, interactive chart builder, and trend intelligence.
            </p>
          </div>

          {/* Card 5 */}
          <div
            className="tool-workspace-card"
            style={{ cursor: 'pointer', padding: 16, marginBottom: 0 }}
            onClick={() => navigate('/tools')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <FileSearch size={16} color="#06b6d4" />
              <h4 style={{ fontSize: 14, fontWeight: 700 }}>DocuMind OCR Scanner</h4>
            </div>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
              Extract data and summaries from invoices, receipts, error logs, and PDF files.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Operations Table */}
      <div className="table-card">
        <div className="table-header">
          <h3>Recent Operations &amp; Services</h3>
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/ledger')}
            style={{ fontSize: 12 }}
          >
            View Universal Ledger
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
            <h4>No operations recorded yet</h4>
            <p>Use the ahsi Copilot or AI Tool Suite to log your first record.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Workspace / Type</th>
                <th>Client / Customer</th>
                <th>Item / Service</th>
                <th>Reference #</th>
                <th>Priority</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentComplaints.map((c) => {
                const wsMeta = workspaces[c.workspace] || workspaces.general;
                const isService = c.record_type === 'service_request' || c.record_type === 'proposal';
                return (
                  <tr
                    key={c.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleReviewRecord(c.session_id)}
                    title="Click to review & edit record"
                  >
                    <td className="td-muted">#{c.id}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: wsMeta.color + '20',
                            color: wsMeta.color,
                          }}
                        >
                          {wsMeta.name.split('&')[0]}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                          {isService ? '💼 Service' : '🚨 Issue'}
                        </span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{c.customer_name || '—'}</td>
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
                );
              })}
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
