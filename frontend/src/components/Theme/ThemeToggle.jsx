import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Sun, Moon, Laptop } from 'lucide-react';
import { setTheme, addToast } from '../../store/uiSlice';

export default function ThemeToggle({ compact = false }) {
  const dispatch = useDispatch();
  const theme = useSelector((state) => state.ui.theme || 'system');

  const handleSelect = (selectedTheme) => {
    dispatch(setTheme(selectedTheme));
    const label =
      selectedTheme === 'dark' ? 'Dark Mode' :
      selectedTheme === 'light' ? 'Light Mode' : 'System Match';
    dispatch(addToast({ type: 'info', message: `Theme switched to ${label}` }));
  };

  return (
    <div className={`theme-toggle-container ${compact ? 'compact' : ''}`}>
      <div className="theme-toggle-pill">
        <button
          type="button"
          className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
          onClick={() => handleSelect('light')}
          title="Light Mode"
          aria-label="Switch to Light Mode"
        >
          <Sun size={14} />
          {!compact && <span>Light</span>}
        </button>

        <button
          type="button"
          className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
          onClick={() => handleSelect('dark')}
          title="Dark Mode"
          aria-label="Switch to Dark Mode"
        >
          <Moon size={14} />
          {!compact && <span>Dark</span>}
        </button>

        <button
          type="button"
          className={`theme-btn ${theme === 'system' ? 'active' : ''}`}
          onClick={() => handleSelect('system')}
          title="System Preference"
          aria-label="Switch to System Mode"
        >
          <Laptop size={14} />
          {!compact && <span>System</span>}
        </button>
      </div>
    </div>
  );
}
