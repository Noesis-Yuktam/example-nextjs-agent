'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { AgentResponse } from '@/types';
import { DEMO_SCENARIOS, getRandomScenario } from '@/lib/scenarios';

interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  traceId?: string;
  intent?: string;
  confidence?: number;
  timestamp: Date;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [autoSimEnabled, setAutoSimEnabled] = useState(false);
  const [interval, setIntervalTime] = useState(5);
  const [eventCount, setEventCount] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText }),
      });

      const data: AgentResponse = await response.json();

      const agentMessage: Message = {
        id: `agent-${Date.now()}`,
        role: 'agent',
        content: data.message,
        traceId: data.traceId,
        intent: data.intent.intent,
        confidence: data.intent.confidence,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, agentMessage]);
      setSessionCount(prev => prev + 1);
      setEventCount(prev => prev + 2 + data.toolCalls.length + data.toolResults.length + 1);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'agent',
        content: 'Sorry, there was an error processing your request.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || autoSimEnabled) return;
    await sendMessage(input);
    setInput('');
  };

  const runSimulation = useCallback(async () => {
    const scenario = getRandomScenario();
    await sendMessage(scenario.message);
  }, [sendMessage]);

  useEffect(() => {
    if (autoSimEnabled) {
      runSimulation();
      intervalRef.current = setInterval(runSimulation, interval * 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoSimEnabled, interval, runSimulation]);

  const toggleAutoSim = () => {
    setAutoSimEnabled(prev => !prev);
  };

  const clearMessages = () => {
    setMessages([]);
    setEventCount(0);
    setSessionCount(0);
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Customer Support Agent Demo</h1>
        <p>Example Next.js agent with Noesis SDK integration</p>
      </header>

      <div className="controls">
        <div className="toggle-group">
          <span>Auto-Simulation</span>
          <div
            className={`toggle ${autoSimEnabled ? 'active' : ''}`}
            onClick={toggleAutoSim}
            role="button"
            tabIndex={0}
            aria-label="Toggle auto-simulation"
          />
        </div>

        <div className="interval-control">
          <label htmlFor="interval">Interval:</label>
          <input
            id="interval"
            type="number"
            min="1"
            max="60"
            value={interval}
            onChange={(e) => setIntervalTime(Math.max(1, Math.min(60, parseInt(e.target.value) || 5)))}
            disabled={autoSimEnabled}
          />
          <span>sec</span>
        </div>

        {autoSimEnabled && (
          <div className="simulation-indicator">
            <div className="pulse" />
            <span>Simulation Running</span>
          </div>
        )}

        <div className="stats">
          <div className="stat">
            <span className="stat-value">{sessionCount}</span>
            <span className="stat-label">Sessions</span>
          </div>
          <div className="stat">
            <span className="stat-value">{eventCount}</span>
            <span className="stat-label">Events</span>
          </div>
        </div>

        <button className="btn secondary" onClick={clearMessages}>
          Clear
        </button>
      </div>

      <div className="chat-container">
        <div className="messages">
          {messages.length === 0 ? (
            <div className="empty-state">
              <p>No messages yet</p>
              <p>Type a message or enable auto-simulation to start</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.role}`}>
                <div className="message-header">
                  <span>{msg.role === 'user' ? 'Customer' : 'Agent'}</span>
                  <span>{msg.timestamp.toLocaleTimeString()}</span>
                </div>
                <div className="message-content">{msg.content}</div>
                {msg.role === 'agent' && (msg.intent || msg.traceId) && (
                  <div className="message-meta">
                    {msg.intent && (
                      <span className="badge intent">
                        {msg.intent} ({Math.round((msg.confidence || 0) * 100)}%)
                      </span>
                    )}
                    {msg.traceId && (
                      <span className="badge trace">{msg.traceId}</span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="input-area" onSubmit={handleSubmit}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={autoSimEnabled ? 'Auto-simulation active...' : 'Type your message...'}
            disabled={isLoading || autoSimEnabled}
          />
          <button type="submit" className="btn" disabled={isLoading || autoSimEnabled || !input.trim()}>
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>

      <footer className="footer">
        <p>
          Events are ingested to <a href="https://noesis.dev" target="_blank" rel="noopener noreferrer">Noesis</a> for observability.
          View the <a href="https://github.com/Noesis-Yuktam/example-nextjs-agent" target="_blank" rel="noopener noreferrer">source code</a>.
        </p>
      </footer>
    </div>
  );
}
