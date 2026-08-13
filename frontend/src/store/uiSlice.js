import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    toasts: [],
    activePage: 'log-complaint',
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
  },
});

export const { addToast, removeToast, setActivePage } = uiSlice.actions;
export default uiSlice.reducer;
