import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './store';
import Sidebar from './components/Layout/Sidebar';
import Dashboard from './pages/Dashboard';
import LogComplaint from './pages/LogComplaint';
import QMSLedger from './pages/QMSLedger';
import ToastContainer from './components/Toast';

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <div className="app-shell">
          <Sidebar />
          <div className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/log-complaint" element={<LogComplaint />} />
              <Route path="/ledger" element={<QMSLedger />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
        <ToastContainer />
      </BrowserRouter>
    </Provider>
  );
}
