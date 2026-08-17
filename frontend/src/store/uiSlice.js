import { createSlice } from '@reduxjs/toolkit';

const savedTheme = localStorage.getItem('ahsi_theme') || 'system';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    toasts: [],
    activePage: 'log-complaint',
    theme: savedTheme, // 'light' | 'dark' | 'system'
  },
  reducers: {
    addToast: (state, action) => {
      const toast = {
        id: `toast-${Date.now()}`,
        type: action.payload.type || 'info', // success | error | info
        message: action.payload.message,
      };
      state.toasts.push(toast);
    },
    removeToast: (state, action) => {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
    setActivePage: (state, action) => {
      state.activePage = action.payload;
    },
    setTheme: (state, action) => {
      state.theme = action.payload;
      localStorage.setItem('ahsi_theme', action.payload);
    },
  },
});

export const { addToast, removeToast, setActivePage, setTheme } = uiSlice.actions;
export default uiSlice.reducer;
