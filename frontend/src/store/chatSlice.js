import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

// ─── Async Thunks ──────────────────────────────────────────────────────────

export const sendChatMessage = createAsyncThunk(
  'chat/sendMessage',
  async ({ session_id, message, workspace, record_type }, { rejectWithValue }) => {
    try {
      const res = await api.post('/api/chat/message', {
        session_id,
        message,
        workspace: workspace || 'general',
        record_type: record_type || 'issue',
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to send message');
    }
  }
);

export const uploadChatDocument = createAsyncThunk(
  'chat/uploadDocument',
  async ({ session_id, file, workspace, record_type }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('session_id', session_id);
      formData.append('workspace', workspace || 'general');
      formData.append('record_type', record_type || 'issue');
      formData.append('file', file);

      const res = await api.post('/api/chat/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to upload document');
    }
  }
);

export const fetchChatHistory = createAsyncThunk(
  'chat/fetchHistory',
  async (session_id, { rejectWithValue }) => {
    try {
      const res = await api.get(`/api/chat/${session_id}/history`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to fetch history');
    }
  }
);

// ─── Slice ─────────────────────────────────────────────────────────────────

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    session_id: null,
    messages: [
      {
        id: 'welcome',
        role: 'assistant',
        content:
          "**Welcome to ahsi AI!** I am your universal operations copilot. You can describe any customer issue, submit a service request, generate a client proposal, or upload documents/PDFs for automated analysis.",
      },
    ],
    loading: false,
    error: null,
    lastExtractedData: null,
  },
  reducers: {
    setSessionId: (state, action) => {
      state.session_id = action.payload;
    },
    addUserMessage: (state, action) => {
      state.messages.push({
        id: `user-${Date.now()}`,
        role: 'user',
        content: action.payload,
      });
    },
    resetChat: (state) => {
      state.messages = [
        {
          id: 'welcome',
          role: 'assistant',
          content:
            "⚡ **Welcome to ahsi AI!** I am your universal operations copilot. You can describe any customer issue, submit a service request, generate a client proposal, or upload documents/PDFs for automated analysis.",
        },
      ];
      state.lastExtractedData = null;
      state.error = null;
      state.loading = false;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(sendChatMessage.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(sendChatMessage.fulfilled, (state, action) => {
      state.loading = false;
      const { ai_response, extracted_data } = action.payload;
      state.messages.push({
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: ai_response,
        success: true,
      });
      state.lastExtractedData = extracted_data;
    });
    builder.addCase(sendChatMessage.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload;
      state.messages.push({
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Encountered an error: ${action.payload}. Please try again.`,
        isError: true,
      });
    });

    // Upload Document
    builder.addCase(uploadChatDocument.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(uploadChatDocument.fulfilled, (state, action) => {
      state.loading = false;
      const { filename, ai_response, extracted_data } = action.payload;
      state.messages.push({
        id: `user-doc-${Date.now()}`,
        role: 'user',
        content: `📄 Uploaded File: **${filename}**`,
      });
      state.messages.push({
        id: `ai-doc-${Date.now()}`,
        role: 'assistant',
        content: ai_response,
        success: true,
      });
      state.lastExtractedData = extracted_data;
    });
    builder.addCase(uploadChatDocument.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload;
      state.messages.push({
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Document parsing error: ${action.payload}`,
        isError: true,
      });
    });

    builder.addCase(fetchChatHistory.fulfilled, (state, action) => {
      if (Array.isArray(action.payload) && action.payload.length > 0) {
        const mapped = action.payload.map((m) => ({
          id: `hist-${m.created_at}-${m.role}`,
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        }));
        const welcome = state.messages.find((m) => m.id === 'welcome') || {
          id: 'welcome',
          role: 'assistant',
          content:
            "⚡ **Welcome to ahsi AI!** I am your universal operations copilot. Describe any customer issue, submit a service request, generate a client proposal, or upload documents for automated analysis.",
        };
        state.messages = [welcome, ...mapped];
      }
    });
  },
});

export const { setSessionId, addUserMessage, resetChat, clearError } = chatSlice.actions;
export default chatSlice.reducer;
