import { useState, useCallback, useRef } from 'react';
import { API_URL } from '../config';

interface ToolCallEvent {
  tool: 'add_item' | 'delete_item' | 'edit_item';
  params: Record<string, unknown>;
}

interface UseChatStreamResult {
  sendMessage: (
    message: string,
    references: string[],
    chatHistory: { role: 'user' | 'assistant'; content: string }[],
    discoveryContext: Record<string, unknown>,
  ) => void;
  isStreaming: boolean;
  streamingContent: string;
  toolCalls: ToolCallEvent[];
  error: string | null;
  messageId: string | null;
  resetStream: () => void;
}

export function useChatStream(): UseChatStreamResult {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [toolCalls, setToolCalls] = useState<ToolCallEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [messageId, setMessageId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const resetStream = useCallback(() => {
    setStreamingContent('');
    setToolCalls([]);
    setError(null);
    setMessageId(null);
  }, []);

  const sendMessage = useCallback((
    message: string,
    references: string[],
    chatHistory: { role: 'user' | 'assistant'; content: string }[],
    discoveryContext: Record<string, unknown>,
  ) => {
    // Abort any existing stream
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setIsStreaming(true);
    setStreamingContent('');
    setToolCalls([]);
    setError(null);
    setMessageId(null);

    const body = {
      message,
      chat_history: chatHistory,
      discovery_context: discoveryContext,
      referenced_items: references.map(id => ({ id, type: 'unknown', text: '' })),
    };

    fetch(`${API_URL}/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: 'Chat service error' }));
          setError(err.error || 'Chat service error');
          setIsStreaming(false);
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          setError('No response stream');
          setIsStreaming(false);
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let eventType = '';
        let dataBuffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events from buffer
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              dataBuffer = line.slice(6);
            } else if (line === '' && eventType && dataBuffer) {
              // End of event
              console.log('[useChatStream] SSE event received', { eventType, dataPreview: dataBuffer.substring(0, 150) });
              try {
                const parsed = JSON.parse(dataBuffer);
                switch (eventType) {
                  case 'token':
                    setStreamingContent(prev => prev + parsed.text);
                    break;
                  case 'tool_call':
                    console.log('[useChatStream] Tool call parsed', { tool: parsed.tool, params: parsed.params });
                    setToolCalls(prev => {
                      const updated = [...prev, { tool: parsed.tool, params: parsed.params }];
                      console.log('[useChatStream] toolCalls state updated, count:', updated.length);
                      return updated;
                    });
                    break;
                  case 'done':
                    console.log('[useChatStream] Done event', { message_id: parsed.message_id });
                    setMessageId(parsed.message_id);
                    setIsStreaming(false);
                    break;
                  case 'error':
                    setError(parsed.error);
                    setIsStreaming(false);
                    break;
                }
              } catch (e) {
                console.warn('[useChatStream] Parse error', { eventType, dataBuffer, error: e });
              }
              eventType = '';
              dataBuffer = '';
            }
          }
        }

        // If we exited the loop without a done event
        setIsStreaming(false);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Connection failed');
        }
        setIsStreaming(false);
      });
  }, []);

  return { sendMessage, isStreaming, streamingContent, toolCalls, error, messageId, resetStream };
}
