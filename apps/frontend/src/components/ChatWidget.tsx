import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComments, faPaperPlane, faTimes, faGripVertical, faRotateRight, faTrashCan, faExpand, faCompress } from '@fortawesome/free-solid-svg-icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChatStream } from '../hooks/useChatStream';
import './ChatWidget.css';

const generateId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export interface ChatToolAction {
  tool: 'add_item' | 'delete_item' | 'edit_item';
  params: Record<string, unknown>;
}

interface ChatWidgetProps {
  data: DiscoveryData;
  setData: React.Dispatch<React.SetStateAction<DiscoveryData | null>>;
  backendAvailable: boolean;
  onToolAction: (action: ChatToolAction) => void;
  requestConfirm: (message: string, onConfirm: () => void) => void;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ data, setData, backendAvailable, onToolAction, requestConfirm }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputText, setInputText] = useState('');
  const [references, setReferences] = useState<string[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [showMention, setShowMention] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionStartPos, setMentionStartPos] = useState(-1);

  // Dragging
  const [position, setPosition] = useState({ x: -1, y: -1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { sendMessage, isStreaming, streamingContent, toolCalls, error, messageId, resetStream } = useChatStream();

  // Load chat history from data on mount / discovery change
  useEffect(() => {
    if (data.chat_history) {
      setChatHistory(data.chat_history);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.discovery_id]);

  // Persist chat history to discovery data whenever it changes
  useEffect(() => {
    setData(prevData => prevData ? { ...prevData, chat_history: chatHistory } : prevData);
  }, [chatHistory, setData]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, streamingContent]);

  // Handle completed stream — save assistant message and dispatch tool actions
  useEffect(() => {
    if (messageId && !isStreaming) {
      const assistantMessage: ChatMessage = {
        id: messageId,
        role: 'assistant',
        content: streamingContent,
        tool_calls: toolCalls.map(tc => ({ ...tc, status: 'pending' as const })),
        created_at: new Date().toISOString(),
      };

      setChatHistory(prev => [...prev, assistantMessage]);

      // Dispatch each tool call to the parent to open existing modals
      for (const tc of toolCalls) {
        onToolAction({ tool: tc.tool, params: tc.params });
      }

      resetStream();
    }
  }, [messageId, isStreaming]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle stream error
  useEffect(() => {
    if (error && !isStreaming) {
      const errorMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: `Error: ${error}`,
        created_at: new Date().toISOString(),
      };
      setChatHistory(prev => [...prev, errorMsg]);
      resetStream();
    }
  }, [error, isStreaming]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build discovery context for the API
  const discoveryContext = useMemo(() => ({
    title: data.title,
    goal: data.goal,
    inputs: data.inputs.map(i => ({ input_id: i.input_id, type: i.type, title: i.title, text: i.text, status: i.status })),
    facts: data.facts.map(f => ({ fact_id: f.fact_id, text: f.text, related_inputs: f.related_inputs, status: f.status })),
    insights: data.insights.map(n => ({ insight_id: n.insight_id, text: n.text, related_facts: n.related_facts, status: n.status })),
    recommendations: data.recommendations.map(r => ({ recommendation_id: r.recommendation_id, text: r.text, related_insights: r.related_insights, status: r.status })),
    outputs: data.outputs.map(o => ({ output_id: o.output_id, text: o.text, type: o.type, related_recommendations: o.related_recommendations, status: o.status })),
  }), [data]);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || isStreaming) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
      references: [...references],
    };

    setChatHistory(prev => [...prev, userMessage]);

    const historyForApi = chatHistory.map(m => ({ role: m.role, content: m.content }));
    sendMessage(text, references, historyForApi, discoveryContext);

    setInputText('');
    setReferences([]);
  }, [inputText, isStreaming, references, chatHistory, discoveryContext, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape' && showMention) {
      setShowMention(false);
    }
  }, [handleSend, showMention]);

  const handleRetry = useCallback((msgId: string) => {
    if (isStreaming) return;
    const msgIndex = chatHistory.findIndex(m => m.id === msgId);
    if (msgIndex < 0) return;
    const msg = chatHistory[msgIndex];
    if (msg.role !== 'user') return;

    // Remove the assistant response (everything after this user message)
    // Re-add the user message with a new id
    const trimmedHistory = chatHistory.slice(0, msgIndex);
    const retriedMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: msg.content,
      created_at: new Date().toISOString(),
      references: msg.references || [],
    };
    setChatHistory([...trimmedHistory, retriedMessage]);

    const historyForApi = trimmedHistory.map(m => ({ role: m.role, content: m.content }));
    sendMessage(msg.content, msg.references || [], historyForApi, discoveryContext);
  }, [isStreaming, chatHistory, discoveryContext, sendMessage]);

  // @mention logic
  const allItems = useMemo(() => {
    const items: { id: string; label: string; group: string }[] = [];
    data.inputs.forEach(i => items.push({ id: i.input_id, label: `${i.input_id} — ${i.title.substring(0, 40)}`, group: 'Inputs' }));
    data.facts.forEach(f => items.push({ id: f.fact_id, label: `${f.fact_id} — ${f.text.substring(0, 40)}`, group: 'Facts' }));
    data.insights.forEach(n => items.push({ id: n.insight_id, label: `${n.insight_id} — ${n.text.substring(0, 40)}`, group: 'Insights' }));
    data.recommendations.forEach(r => items.push({ id: r.recommendation_id, label: `${r.recommendation_id} — ${r.text.substring(0, 40)}`, group: 'Recommendations' }));
    data.outputs.forEach(o => items.push({ id: o.output_id, label: `${o.output_id} — ${o.text.substring(0, 40)}`, group: 'Outputs' }));
    return items;
  }, [data]);

  const filteredMentionItems = useMemo(() => {
    if (!mentionFilter) return allItems;
    const lower = mentionFilter.toLowerCase();
    return allItems.filter(item => item.id.toLowerCase().includes(lower) || item.label.toLowerCase().includes(lower));
  }, [allItems, mentionFilter]);

  const groupedMentionItems = useMemo(() => {
    const groups: Record<string, typeof allItems> = {};
    filteredMentionItems.forEach(item => {
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push(item);
    });
    return groups;
  }, [filteredMentionItems]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputText(value);

    const cursorPos = e.target.selectionStart;
    const textBefore = value.substring(0, cursorPos);
    const atIndex = textBefore.lastIndexOf('@');

    if (atIndex >= 0 && (atIndex === 0 || textBefore[atIndex - 1] === ' ')) {
      const filter = textBefore.substring(atIndex + 1);
      if (!filter.includes(' ')) {
        setShowMention(true);
        setMentionFilter(filter);
        setMentionStartPos(atIndex);
        return;
      }
    }
    setShowMention(false);
  }, []);

  const selectMention = useCallback((itemId: string) => {
    const before = inputText.substring(0, mentionStartPos);
    const after = inputText.substring(mentionStartPos + mentionFilter.length + 1);
    setInputText(`${before}[${itemId}]${after}`);
    setReferences(prev => prev.includes(itemId) ? prev : [...prev, itemId]);
    setShowMention(false);
    inputRef.current?.focus();
  }, [inputText, mentionStartPos, mentionFilter]);

  // Dragging handlers
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    const panel = (e.target as HTMLElement).closest('.chat-panel');
    if (panel) {
      const rect = panel.getBoundingClientRect();
      dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const x = Math.max(0, Math.min(e.clientX - dragOffset.current.x, window.innerWidth - 400));
      const y = Math.max(0, Math.min(e.clientY - dragOffset.current.y, window.innerHeight - 500));
      setPosition({ x, y });
    };
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Render item references in assistant messages as styled tags
  const renderContent = useCallback((content: string) => {
    const parts = content.split(/(\[[A-Z]-[^\]]+\])/g);
    if (parts.length === 1) {
      return <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>;
    }
    return (
      <div className="chat-message-content">
        {parts.map((part, i) => {
          const match = part.match(/^\[([A-Z]-[^\]]+)\]$/);
          if (match) {
            return <span key={i} className="chat-item-ref">{match[1]}</span>;
          }
          return <ReactMarkdown key={i} remarkPlugins={[remarkGfm]}>{part}</ReactMarkdown>;
        })}
      </div>
    );
  }, []);

  const toggleExpand = useCallback(() => {
    setIsExpanded(prev => {
      const next = !prev;
      const w = next ? 700 : 400;
      const h = next ? window.innerHeight * 0.8 : 500;
      if (position.x >= 0) {
        // Clamp to viewport
        setPosition({
          x: Math.min(position.x, window.innerWidth - w - 8),
          y: Math.max(0, Math.min(position.y, window.innerHeight - h - 8)),
        });
      }
      return next;
    });
  }, [position]);

  const panelStyle = position.x >= 0 ? { left: position.x, top: position.y, bottom: 'auto', right: 'auto' } : {};

  return (
    <>
      {/* Chat toggle button */}
      <button
        className={`chat-fab ${isOpen ? 'chat-fab-active' : ''}`}
        onClick={() => { setIsOpen(!isOpen); if (!isOpen) setTimeout(() => inputRef.current?.focus(), 100); }}
        title="Chat with Factly"
      >
        <FontAwesomeIcon icon={isOpen ? faTimes : faComments} />
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className={`chat-panel${isExpanded ? ' chat-panel-expanded' : ''}`} style={panelStyle}>
          {/* Header */}
          <div className="chat-header" onMouseDown={handleDragStart}>
            <FontAwesomeIcon icon={faGripVertical} className="chat-drag-handle" />
            <span className="chat-title">Factly Chat</span>
            <button className="chat-expand" onClick={toggleExpand} title={isExpanded ? 'Reduce' : 'Expand'}>
              <FontAwesomeIcon icon={isExpanded ? faCompress : faExpand} />
            </button>
            <button className="chat-close" onClick={() => setIsOpen(false)}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {chatHistory.length > 0 && !isStreaming && (
              <button
                className="chat-clear"
                onClick={() => requestConfirm('Clear chat history?', () => setChatHistory([]))}
                title="Clear chat history"
              >
                <FontAwesomeIcon icon={faTrashCan} />
              </button>
            )}
            {chatHistory.map((msg) => {
              if (msg.role === 'assistant' && !msg.content) return null;
              return (
                <div key={msg.id} className={`chat-msg chat-msg-${msg.role}`}>
                  {msg.role === 'assistant' ? renderContent(msg.content) : <p>{msg.content}</p>}
                  {msg.role === 'user' && !isStreaming && (
                    <button className="chat-retry" onClick={() => handleRetry(msg.id)} title="Retry">
                      <FontAwesomeIcon icon={faRotateRight} />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Streaming content */}
            {isStreaming && streamingContent && (
              <div className="chat-msg chat-msg-assistant chat-msg-streaming">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingContent}</ReactMarkdown>
              </div>
            )}

            {/* Loading indicator */}
            {isStreaming && !streamingContent && (
              <div className="chat-msg chat-msg-assistant chat-msg-loading">
                <span className="chat-typing-dots">
                  <span>.</span><span>.</span><span>.</span>
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* @mention dropdown */}
          {showMention && (
            <div className="chat-mention-dropdown">
              {Object.entries(groupedMentionItems).map(([group, items]) => (
                <div key={group} className="chat-mention-group">
                  <div className="chat-mention-group-label">{group}</div>
                  {items.map(item => (
                    <button key={item.id} className="chat-mention-item" onClick={() => selectMention(item.id)}>
                      {item.label}
                    </button>
                  ))}
                </div>
              ))}
              {filteredMentionItems.length === 0 && (
                <div className="chat-mention-empty">No matching items</div>
              )}
            </div>
          )}

          {/* Input area */}
          <div className="chat-input-area">
            {references.length > 0 && (
              <div className="chat-references">
                {references.map(ref => (
                  <span key={ref} className="chat-ref-tag">
                    {ref}
                    <button onClick={() => setReferences(prev => prev.filter(r => r !== ref))}>×</button>
                  </span>
                ))}
              </div>
            )}
            <div className="chat-input-row">
              <textarea
                ref={inputRef}
                className="chat-input"
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={backendAvailable ? 'Ask Factly about your discovery...' : 'Backend unavailable'}
                disabled={isStreaming || !backendAvailable}
                rows={1}
              />
              <button
                className="chat-send"
                onClick={handleSend}
                disabled={isStreaming || !inputText.trim() || !backendAvailable}
                title="Send message"
              >
                <FontAwesomeIcon icon={faPaperPlane} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
