import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Zap, Paperclip, Send, User, Check, FileText } from 'lucide-react';
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    dispatch(addUserMessage(text));

    try {
      const result = await dispatch(
        sendChatMessage({ session_id, message: text })
      ).unwrap();

      if (result.extracted_data) {
        dispatch(populateFormFromAI({ ...result.extracted_data, status: result.status }));
        dispatch(addToast({ type: 'success', message: 'AI processed complaint data.' }));
      }
    } catch (err) {
      dispatch(addToast({ type: 'error', message: `AI Error: ${String(err)}` }));
    }
  };

  const processFileUpload = async (file) => {
    if (!file) return;
    dispatch(addToast({ type: 'info', message: `📄 Parsing ${file.name} with PDF/OCR Engine...` }));

    try {
      const result = await dispatch(
        uploadChatDocument({ session_id, file })
      ).unwrap();

      if (result.extracted_data) {
        dispatch(populateFormFromAI({ ...result.extracted_data, status: result.status }));
        dispatch(addToast({ type: 'success', message: `📄 Document parsed! Form populated.` }));
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
        accept=".pdf,.png,.jpg,.jpeg,.bmp,.tiff,.txt,.csv"
      />

      {/* Header */}
      <div className="copilot-header">
        <div className="copilot-header-icon">
          <Zap size={16} color="white" />
        </div>
        <div className="copilot-header-info">
          <h3>AIVOA Copilot</h3>
          <p>Drop PDF / paper images or paste text below.</p>
        </div>
        <div className={`copilot-status-dot ${loading ? 'loading' : ''}`} />
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="chat-message" style={{ alignItems: 'flex-start' }}>
            <div className="chat-avatar bot">
              <Zap size={13} color="white" />
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

      {/* Input */}
      <div className="chat-input-area">
        <div className="chat-input-wrapper">
          <button
            id="chat-attach-btn"
            className="chat-attach-btn"
            title="Attach PDF or paper document"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip size={15} />
          </button>
          <input
            id="copilot-input"
            type="text"
            placeholder="Type a message or paste a complaint..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <button
            id="copilot-send-btn"
            className="chat-send-btn"
            onClick={handleSend}
            disabled={loading || !input.trim()}
          >
            <Send size={14} color="white" />
          </button>
        </div>
        <div className="chat-footer">PDF &amp; OCR Engine Active • Powered by LangGraph</div>
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
          <Zap size={13} color="white" />
        </div>
      )}
      <div
        className="chat-bubble bot"
        style={message.isError ? { borderColor: '#fca5a5', color: '#dc2626' } : {}}
        dangerouslySetInnerHTML={{
          __html: message.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
        }}
      />
    </div>
  );
}
