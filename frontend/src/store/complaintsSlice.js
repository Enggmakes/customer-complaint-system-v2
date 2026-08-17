import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

// ─── Async Thunks ──────────────────────────────────────────────────────────

export const fetchComplaints = createAsyncThunk(
  'complaints/fetchAll',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = {};
      if (filters.workspace && filters.workspace !== 'all') params.workspace = filters.workspace;
      if (filters.record_type && filters.record_type !== 'all') params.record_type = filters.record_type;
      if (filters.status && filters.status !== 'all') params.status = filters.status;
      if (filters.severity && filters.severity !== 'all') params.severity = filters.severity;
      if (filters.search) params.search = filters.search;

      const res = await api.get('/api/complaints', { params });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to fetch records');
    }
  }
);

export const commitComplaint = createAsyncThunk(
  'complaints/commit',
  async ({ session_id, complaint_data }, { rejectWithValue }) => {
    try {
      const res = await api.post('/api/complaints/commit', { session_id, complaint_data });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to commit record');
    }
  }
);

export const deleteComplaint = createAsyncThunk(
  'complaints/delete',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/api/complaints/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to delete record');
    }
  }
);

export const fetchComplaintBySession = createAsyncThunk(
  'complaints/fetchBySession',
  async (session_id, { rejectWithValue }) => {
    try {
      const res = await api.get(`/api/complaints/session/${session_id}`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to fetch session record');
    }
  }
);

// ─── Slice ─────────────────────────────────────────────────────────────────

const initialForm = {
  workspace: 'general',
  record_type: 'issue',
  title: '',
  complaint_source: '',
  customer_name: '',
  product_name: '',
  product_strength: '',
  batch_lot_number: '',
  affected_quantity: '',
  manufacturing_date: '',
  expiry_date: '',
  originating_site: '',
  impacted_npm: '',
  defect_summary: '',
  complaint_category: '',
  complaint_description: '',
  severity: 'Major',
  suggested_action: '',
  initial_risk_assessment: '',
  response_draft: '',
};

const complaintsSlice = createSlice({
  name: 'complaints',
  initialState: {
    list: [],
    loading: false,
    error: null,
    commitStatus: 'idle', // idle | loading | succeeded | failed
    currentForm: { ...initialForm },
    formStatus: 'pending_triage', // pending_triage | ready_to_commit | committed
  },
  reducers: {
    updateFormField: (state, action) => {
      const { field, value } = action.payload;
      state.currentForm[field] = value;
    },
    populateFormFromAI: (state, action) => {
      const data = action.payload;
      const INVALID_BATCHES = ['ber', 'number', 'numbers', 'no', 'num', 'id', 'null', 'none', 'n/a'];
      Object.keys(state.currentForm).forEach((key) => {
        if (data[key] !== null && data[key] !== undefined && data[key] !== '') {
          if (key === 'batch_lot_number' && INVALID_BATCHES.includes(String(data[key]).trim().toLowerCase())) {
            return;
          }
          state.currentForm[key] = data[key];
        }
      });
      state.formStatus = data.status || 'ready_to_commit';
    },
    resetForm: (state) => {
      state.currentForm = { ...initialForm };
      state.formStatus = 'pending_triage';
      state.commitStatus = 'idle';
    },
    setFormStatus: (state, action) => {
      state.formStatus = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch
    builder.addCase(fetchComplaints.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(fetchComplaints.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload;
    });
    builder.addCase(fetchComplaints.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload;
    });

    // Fetch By Session
    builder.addCase(fetchComplaintBySession.fulfilled, (state, action) => {
      const data = action.payload;
      const INVALID_BATCHES = ['ber', 'number', 'numbers', 'no', 'num', 'id', 'null', 'none', 'n/a'];
      Object.keys(state.currentForm).forEach((key) => {
        if (data[key] !== null && data[key] !== undefined) {
          if (key === 'batch_lot_number' && INVALID_BATCHES.includes(String(data[key]).trim().toLowerCase())) {
            return;
          }
          state.currentForm[key] = data[key];
        }
      });
      state.formStatus = data.status || 'ready_to_commit';
    });

    // Commit
    builder.addCase(commitComplaint.pending, (state) => {
      state.commitStatus = 'loading';
    });
    builder.addCase(commitComplaint.fulfilled, (state, action) => {
      state.commitStatus = 'succeeded';
      state.formStatus = 'committed';
      const idx = state.list.findIndex((c) => c.id === action.payload.id);
      if (idx >= 0) {
        state.list[idx] = action.payload;
      } else {
        state.list.unshift(action.payload);
      }
    });
    builder.addCase(commitComplaint.rejected, (state, action) => {
      state.commitStatus = 'failed';
      state.error = action.payload;
    });

    // Delete
    builder.addCase(deleteComplaint.fulfilled, (state, action) => {
      state.list = state.list.filter((c) => c.id !== action.payload);
    });
  },
});

export const {
  updateFormField,
  populateFormFromAI,
  resetForm,
  setFormStatus,
  clearError,
} = complaintsSlice.actions;

export default complaintsSlice.reducer;
