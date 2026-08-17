import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Zap,
  ClipboardList,
  Sparkles,
  Wrench,
  BarChart3,
  Layers,
  Menu,
  X,
  FilePlus2,
  ChevronRight,
} from 'lucide-react';
import { resetForm } from '../../store/complaintsSlice';
import { resetChat, setSessionId } from '../../store/chatSlice';
import { setWorkspace } from '../../store/workspaceSlice';
import { v4 as uuidv4 } from 'uuid';
import ThemeToggle from '../Theme/ThemeToggle';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Zap, label: 'Operations Hub', path: '/log-complaint' },
  { icon: BarChart3, label: 'DataLens Analytics', path: '/datalens' },
  { icon: Wrench, label: 'AI Tool Suite', path: '/tools' },
  { icon: ClipboardList, label: 'Universal Ledger', path: '/ledger' },
];

export default function Sidebar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { activeWorkspace, workspaces } = useSelector((state) => state.workspace);
  const currentWs = workspaces[activeWorkspace] || workspaces.general;

  const handleNav = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const handleNewRecord = () => {
    const newSessionId = uuidv4();
    dispatch(resetForm());
    dispatch(resetChat());
    dispatch(setSessionId(newSessionId));
    localStorage.setItem('ccms_active_session_id', newSessionId);
    navigate(`/log-complaint?session_id=${newSessionId}`);
    setMobileOpen(false);
  };

  const handleWorkspaceChange = (e) => {
    dispatch(setWorkspace(e.target.value));
  };

  return (
    <>
      {/* Mobile Top Header */}
      <header className="mobile-header">
        <div className="mobile-header-logo">
          <div className="sidebar-logo-icon" style={{ width: 28, height: 28, background: currentWs.gradient }}>
            <Sparkles size={15} color="white" />
          </div>
          <h2>ahsi AI</h2>
        </div>
        <button
          className="mobile-menu-btn"
          aria-label="Toggle navigation menu"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* Backdrop for Mobile */}
      <div
        className={`sidebar-backdrop ${mobileOpen ? 'active' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Sidebar Drawer */}
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Brand Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon" style={{ background: currentWs.gradient }}>
            <Sparkles size={18} color="white" />
          </div>
          <div className="sidebar-logo-text">
            <h2>ahsi AI</h2>
            <span>Universal Operations</span>
          </div>
        </div>

        {/* Workspace Selector */}
        <div className="workspace-selector-box">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              Active Industry
            </span>
            <Layers size={12} color="rgba(255,255,255,0.5)" />
          </div>
          <select
            className="workspace-select-dropdown"
            value={activeWorkspace}
            onChange={handleWorkspaceChange}
            id="sidebar-workspace-select"
          >
            {Object.values(workspaces).map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.badge}
              </option>
            ))}
          </select>
        </div>

        {/* Navigation */}
        <div className="sidebar-section-label">Navigation</div>
        <nav className="sidebar-nav">
          {navItems.map(({ icon: Icon, label, path }) => (
            <button
              key={path}
              className={`sidebar-nav-item ${location.pathname === path ? 'active' : ''}`}
              onClick={() => handleNav(path)}
            >
              <Icon className="nav-icon" size={17} />
              <span style={{ flex: 1 }}>{label}</span>
              {location.pathname === path && <ChevronRight size={13} style={{ opacity: 0.7 }} />}
            </button>
          ))}
        </nav>

        {/* New Operation / Service Button */}
        <div style={{ padding: '12px 12px 14px' }}>
          <button
            className="sidebar-new-btn"
            onClick={handleNewRecord}
          >
            <FilePlus2 size={14} style={{ marginRight: 6 }} />
            New Operation
          </button>
        </div>

        {/* Theme Mode Selector (Light, Dark, System) */}
        <div style={{ padding: '0 12px 12px' }}>
          <ThemeToggle />
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Zap size={12} color="#5b5bd6" />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
              POWERED BY LANGGRAPH &amp; GROQ
            </span>
          </div>
          <div className="sidebar-footer-text">Multi-Functional AI Operations Engine</div>
        </div>
      </aside>
    </>
  );
}
