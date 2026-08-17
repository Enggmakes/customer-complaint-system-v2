import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Zap, Paperclip, Send, User, Check, Sparkles, HelpCircle, Briefcase, AlertCircle } from 'lucide-react';
import { sendChatMessage, uploadChatDocument, addUserMessage } from '../../store/chatSlice';
import { populateFormFromAI } from '../../store/complaintsSlice';
import { addToast } from '../../store/uiSlice';

export default function AICopilot() {
  const dispatch = useDispatch();
  const [input, setInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const { messages, loading, session_id } = useSelector((state) => state.chat);
  const { activeWorkspace, activeRecordType, workspaces } = useSelector((state) => state.workspace);
  const currentWs = workspaces[activeWorkspace] || workspaces.general;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (overrideText) => {
    const text = (overrideText || input).trim();
    if (!text || loading) return;

    if (!overrideText) setInput('');
    dispatch(addUserMessage(text));

    try {
      const result = await dispatch(
        sendChatMessage({
          session_id,
          message: text,
          workspace: activeWorkspace,
          record_type: activeRecordType,
        })
      ).unwrap();

      if (result.extracted_data) {
        dispatch(populateFormFromAI({ ...result.extracted_data, status: result.status }));
        dispatch(addToast({ type: 'success', message: 'ahsi AI processed operational data.' }));
      }
    } catch (err) {
      dispatch(addToast({ type: 'error', message: `AI Error: ${String(err)}` }));
    }
  };

  const processFileUpload = async (file) => {
    if (!file) return;
    dispatch(addToast({ type: 'info', message: `Parsing ${file.name} with Document Engine...` }));

    try {
      const result = await dispatch(
        uploadChatDocument({
          session_id,
          file,
          workspace: activeWorkspace,
          record_type: activeRecordType,
        })
      ).unwrap();

      if (result.extracted_data) {
        dispatch(populateFormFromAI({ ...result.extracted_data, status: result.status }));
        dispatch(addToast({ type: 'success', message: `File analyzed! Form populated.` }));
      }
    } catch (err) {
      dispatch(addToast({ type: 'error', message: `Upload Error: ${String(err)}` }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFileUpload(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFileUpload(file);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className={`copilot-panel ${isDragging ? 'dragging' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        accept=".pdf,.png,.jpg,.jpeg,.bmp,.tiff,.txt,.csv,.json,.log"
      />

      {/* Header */}
      <div className="copilot-header">
        <div className="copilot-header-icon" style={{ background: currentWs.gradient }}>
          <Sparkles size={16} color="white" />
        </div>
        <div className="copilot-header-info">
          <h3>ahsi Copilot</h3>
          <p>Active in {currentWs.badge} • Drop files or paste text</p>
        </div>
        <div className={`copilot-status-dot ${loading ? 'loading' : ''}`} />
      </div>

      {/* Quick Sample Action Chips */}
      <div style={{ padding: '8px 16px 4px', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
          Quick Templates ({currentWs.badge})
        </div>
        <div className="quick-chip-grid">
          {currentWs.samplePrompts?.map((sp, idx) => (
            <button
              key={idx}
              type="button"
              className="quick-chip"
              onClick={() => handleSend(sp.text)}
              disabled={loading}
              title={sp.text}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              {sp.type === 'service_request' ? (
                <Briefcase size={12} color="var(--color-primary)" />
              ) : (
                <AlertCircle size={12} color="#ef4444" />
              )}
              <span>{sp.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="chat-message" style={{ alignItems: 'flex-start' }}>
            <div className="chat-avatar bot" style={{ background: currentWs.gradient }}>
              <Sparkles size={13} color="white" />
            </div>
            <div className="typing-indicator">
              <div className="typing-dot" />
              <div className="typing-dot" />
              <div className="typing-dot" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="chat-input-area">
        <div className="chat-input-wrapper">
          <button
            id="chat-attach-btn"
            className="chat-attach-btn"
            title="Attach PDF, Invoice, Image or Log file"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip size={15} />
          </button>
          <input
            id="copilot-input"
            type="text"
            placeholder="Type any issue, service request, or paste text..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <button
            id="copilot-send-btn"
            className="chat-send-btn"
            style={{ background: currentWs.gradient }}
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
          >
            <Send size={14} color="white" />
          </button>
        </div>
        <div className="chat-footer">Universal AI Copilot • OCR, Proposals &amp; Triage Engine</div>
      </div>
    </div>
  );
}

function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  const isSuccess = message.success;

  if (isUser) {
    return (
      <div className="chat-message user">
        <div className="chat-avatar user-avatar">
          <User size={13} color="#94a3b8" />
        </div>
        <div className="chat-bubble user">{message.content}</div>
      </div>
    );
  }

  return (
    <div className="chat-message">
      {isSuccess ? (
        <div className="chat-success-icon">
          <Check size={13} color="#10b981" />
        </div>
      ) : (
        <div className="chat-avatar bot">
          <Sparkles size={13} color="white" />
        </div>
      )}
      <div
        className="chat-bubble bot"
        style={message.isError ? { borderColor: '#fca5a5', color: '#dc2626' } : {}}
        dangerouslySetInnerHTML={{
          __html: message.content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br/>'),
        }}
      />
    </div>
  );
}
