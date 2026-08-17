import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Trash2, RefreshCw, FilePlus2, Search, Eye, Filter, Briefcase, AlertCircle, Layers } from 'lucide-react';
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
  const { workspaces } = useSelector((state) => state.workspace);

  const [search, setSearch] = useState('');
  const [workspaceFilter, setWorkspaceFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');

  useEffect(() => {
    dispatch(fetchComplaints());
  }, [dispatch]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this operational record from the Universal Ledger?')) return;
    try {
      await dispatch(deleteComplaint(id)).unwrap();
      dispatch(addToast({ type: 'success', message: 'Record removed from ledger.' }));
    } catch (err) {
      dispatch(addToast({ type: 'error', message: `Delete failed: ${err}` }));
    }
  };

  const handleNewRecord = () => {
    const newSession = uuidv4();
    dispatch(resetForm());
    dispatch(resetChat());
    dispatch(setSessionId(newSession));
    localStorage.setItem('ccms_active_session_id', newSession);
    navigate(`/log-complaint?session_id=${newSession}`);
  };

  const handleReviewRecord = (session_id) => {
    if (!session_id) return;
    dispatch(setSessionId(session_id));
    localStorage.setItem('ccms_active_session_id', session_id);
    navigate(`/log-complaint?session_id=${session_id}`);
  };

  const filtered = complaints.filter((c) => {
    const matchSearch =
      !search ||
      [c.customer_name, c.product_name, c.batch_lot_number, c.complaint_category, c.title]
        .some((f) => f?.toLowerCase().includes(search.toLowerCase()));
    const matchWs = workspaceFilter === 'all' || (c.workspace || 'general') === workspaceFilter;
    const matchType = typeFilter === 'all' || (c.record_type || 'issue') === typeFilter;
    const matchSeverity = severityFilter === 'all' || c.severity?.toLowerCase() === severityFilter.toLowerCase();
    return matchSearch && matchWs && matchType && matchSeverity;
  });

  return (
    <div className="ledger-page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px' }}>
            Universal Operations Ledger
          </h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Unified registry of all customer complaints, service requests, client proposals, and tickets.
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
            onClick={handleNewRecord}
            id="btn-new-complaint-ledger"
          >
            <FilePlus2 size={14} />
            New Record
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 16px',
        }}
      >
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 220 }}>
          <Search size={14} color="var(--color-text-muted)" />
          <input
            id="ledger-search"
            className="field-input"
            placeholder="Search by client, item, ref #, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', padding: '4px 0', boxShadow: 'none' }}
          />
        </div>

        {/* Workspace Filter */}
        <select
          id="ledger-workspace-filter"
          className="field-input field-select"
          value={workspaceFilter}
          onChange={(e) => setWorkspaceFilter(e.target.value)}
          style={{ width: 170 }}
        >
          <option value="all">All Workspaces</option>
          {Object.values(workspaces).map((ws) => (
            <option key={ws.id} value={ws.id}>
              {ws.badge}
            </option>
          ))}
        </select>

        {/* Record Type Filter */}
        <select
          id="ledger-type-filter"
          className="field-input field-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{ width: 160 }}
        >
          <option value="all">All Record Types</option>
          <option value="issue">Issues &amp; Defects</option>
          <option value="service_request">Service Requests</option>
          <option value="proposal">Proposals &amp; Quotes</option>
          <option value="inquiry">Inquiries</option>
        </select>

        {/* Severity Filter */}
        <select
          id="ledger-severity-filter"
          className="field-input field-select"
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          style={{ width: 140 }}
        >
          <option value="all">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="major">Major / High</option>
          <option value="moderate">Moderate</option>
          <option value="minor">Minor / Low</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-card">
        <div className="table-header">
          <h3>
            Operations Records ({filtered.length})
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
            <h4>No operations found</h4>
            <p>Try adjusting your search filters or create a new operation.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Workspace &amp; Type</th>
                  <th>Client / Customer</th>
                  <th>Item / Service</th>
                  <th>Reference #</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const wsMeta = workspaces[c.workspace] || workspaces.general;
                  const isService = c.record_type === 'service_request' || c.record_type === 'proposal';
                  return (
                    <tr key={c.id}>
                      <td className="td-muted font-mono">#{c.id}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: wsMeta.color + '15',
                              color: wsMeta.color,
                              display: 'inline-block',
                              width: 'fit-content',
                            }}
                          >
                            {wsMeta.name.split('&')[0]}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                            {isService ? 'Service' : 'Issue'}
                          </span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{c.customer_name || '—'}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{c.product_name || '—'}</div>
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
                            onClick={() => handleReviewRecord(c.session_id)}
                            id={`btn-review-${c.id}`}
                            style={{ padding: '4px 8px', fontSize: 11 }}
                            title="Open & Review Record"
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
