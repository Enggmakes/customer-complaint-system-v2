import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { FileText, Sparkles } from 'lucide-react';
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
  const reduxSessionId = useSelector((state) => state.chat.session_id);

  const { activeWorkspace, workspaces } = useSelector((state) => state.workspace);
  const currentWs = workspaces[activeWorkspace] || workspaces.general;

  const urlSessionId = searchParams.get('session_id');

  useEffect(() => {
    let activeSession = urlSessionId;

    if (!activeSession) {
      activeSession = reduxSessionId || localStorage.getItem('ccms_active_session_id') || uuidv4();
      setSearchParams({ session_id: activeSession }, { replace: true });
    }

    localStorage.setItem('ccms_active_session_id', activeSession);

    if (reduxSessionId !== activeSession) {
      dispatch(setSessionId(activeSession));
    }

    if (activeSession) {
      dispatch(fetchComplaintBySession(activeSession));
      dispatch(fetchChatHistory(activeSession));
    }
  }, [urlSessionId, dispatch]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', overflow: 'hidden' }}>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-header-title-row">
            <h1>Operations Hub &amp; Triage</h1>
            <div className="page-header-pills-row">
              <span className="workspace-banner-pill" style={{ background: currentWs.gradient }}>
                {currentWs.badge}
              </span>
              <StatusBadge status={formStatus} />
            </div>
          </div>
          <p>{currentWs.name} — AI Assisted Intake, Scope &amp; Resolution</p>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="mobile-segmented-tabs">
        <button
          className={`mobile-tab-btn ${activeTab === 'copilot' ? 'active' : ''}`}
          onClick={() => setActiveTab('copilot')}
        >
          <Sparkles size={14} />
          ahsi Copilot
        </button>
        <button
          className={`mobile-tab-btn ${activeTab === 'form' ? 'active' : ''}`}
          onClick={() => setActiveTab('form')}
        >
          <FileText size={14} />
          Operations Form
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
