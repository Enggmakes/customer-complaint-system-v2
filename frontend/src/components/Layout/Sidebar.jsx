import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FilePlus2,
  ClipboardList,
  Zap,
  Shield,
  Menu,
  X,
} from 'lucide-react';
import { resetForm } from '../../store/complaintsSlice';
import { resetChat, setSessionId } from '../../store/chatSlice';
import { v4 as uuidv4 } from 'uuid';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: FilePlus2, label: 'Log Complaint', path: '/log-complaint' },
  { icon: ClipboardList, label: 'QMS Ledger', path: '/ledger' },
];

export default function Sidebar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const handleNewComplaint = () => {
    const newSessionId = uuidv4();
    dispatch(resetForm());
    dispatch(resetChat());
    dispatch(setSessionId(newSessionId));
    localStorage.setItem('ccms_active_session_id', newSessionId);
    navigate(`/log-complaint?session_id=${newSessionId}`);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Top Header */}
      <header className="mobile-header">
        <div className="mobile-header-logo">
          <div className="sidebar-logo-icon" style={{ width: 28, height: 28 }}>
            <Shield size={15} color="white" />
          </div>
          <h2>CCMS Pharma QMS</h2>
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
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Shield size={18} color="white" />
          </div>
          <div className="sidebar-logo-text">
            <h2>CCMS</h2>
            <span>Pharma QMS</span>
          </div>
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
              {label}
            </button>
          ))}
        </nav>

        {/* New Complaint Button */}
        <div style={{ padding: '12px 12px 16px' }}>
          <button
            className="btn-commit"
            style={{ marginTop: 0, fontSize: '13px', padding: '10px 14px' }}
            onClick={handleNewComplaint}
          >
            <FilePlus2 size={14} style={{ marginRight: 6 }} />
            New Complaint
          </button>
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Zap size={12} color="#5b5bd6" />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
              POWERED BY LANGGRAPH
            </span>
          </div>
          <div className="sidebar-footer-text">API &amp; FDF Quality Assurance</div>
        </div>
      </aside>
    </>
  );
}
