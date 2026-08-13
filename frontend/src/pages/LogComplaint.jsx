import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { FileText, Zap } from 'lucide-react';
import ComplaintForm from '../components/ComplaintForm/ComplaintForm';
import AICopilot from '../components/AICopilot/AICopilot';
import { fetchComplaintBySession } from '../store/complaintsSlice';
import { fetchChatHistory, setSessionId } from '../store/chatSlice';

function StatusBadge({ status }) {
  const label =
    status === 'pending_triage' ? 'Pending Triage' :
    status === 'ready_to_commit' ? 'Ready to Commit' : 'Committed';
  const cls =
    status === 'pending_triage' ? 'pending' :
    status === 'ready_to_commit' ? 'ready' : 'committed';
  return <span className={`status-badge ${cls}`}>{label}</span>;
}

export default function LogComplaint() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('copilot'); // 'form' | 'copilot'
  const formStatus = useSelector((state) => state.complaints.formStatus);
  const session_id = useSelector((state) => state.chat.session_id);

  useEffect(() => {
    const paramSession = searchParams.get('session_id');
    const storedSession = localStorage.getItem('ccms_active_session_id');

    let targetSession = paramSession || session_id || storedSession;

    if (!targetSession) {
      targetSession = uuidv4();
    }

    // Sync URL param if missing
    if (paramSession !== targetSession) {
      setSearchParams({ session_id: targetSession }, { replace: true });
    }

    // Sync Redux & LocalStorage
    localStorage.setItem('ccms_active_session_id', targetSession);
    if (session_id !== targetSession) {
      dispatch(setSessionId(targetSession));
    }

    // Load complaint state and chat history from backend DB for this session
    dispatch(fetchComplaintBySession(targetSession));
    dispatch(fetchChatHistory(targetSession));
  }, [searchParams.get('session_id'), dispatch]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Log Customer Complaint</h1>
          <p>API &amp; FDF Quality Assurance Module</p>
        </div>
        <StatusBadge status={formStatus} />
      </div>

      {/* Mobile Tab Switcher (Visible on Mobile/Tablet only) */}
      <div className="mobile-segmented-tabs">
        <button
          className={`mobile-tab-btn ${activeTab === 'copilot' ? 'active' : ''}`}
          onClick={() => setActiveTab('copilot')}
        >
          <Zap size={14} />
          AIVOA Copilot
        </button>
        <button
          className={`mobile-tab-btn ${activeTab === 'form' ? 'active' : ''}`}
          onClick={() => setActiveTab('form')}
        >
          <FileText size={14} />
          Complaint Form
        </button>
      </div>

      {/* Split Panel */}
      <div className={`split-panel show-${activeTab}`}>
        <ComplaintForm />
        <AICopilot />
      </div>
    </div>
  );
}
