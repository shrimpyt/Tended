'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  X, Camera, Barcode, Receipt, MessageSquare,
  Zap, Send, Upload, ChevronRight,
} from 'lucide-react';
import { clsx } from 'clsx';

// ── Types ──────────────────────────────────────────────────────────

type Mode = 'scanner' | 'chat';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface AIDialogProps {
  open: boolean;
  onClose: () => void;
}

// ── Scanner actions ────────────────────────────────────────────────

const SCANNER_ACTIONS = [
  {
    icon: Camera,
    label: 'Scan Pantry',
    description: 'Use your camera to detect items visually',
    color: 'text-blue',
    bg: 'bg-blue/10 group-hover:bg-blue/18',
  },
  {
    icon: Barcode,
    label: 'Scan Barcode',
    description: 'Point at a product barcode to look it up',
    color: 'text-green',
    bg: 'bg-green/10 group-hover:bg-green/18',
  },
  {
    icon: Receipt,
    label: 'Upload Receipt',
    description: 'Extract purchased items from a receipt image',
    color: 'text-amber',
    bg: 'bg-amber/10 group-hover:bg-amber/18',
  },
] as const;

// ── Component ──────────────────────────────────────────────────────

export default function AIDialog({ open, onClose }: AIDialogProps) {
  const [mode, setMode] = useState<Mode>('scanner');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-focus chat input when switching to chat mode
  useEffect(() => {
    if (mode === 'chat' && open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [mode, open]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setMessages(prev => [
      ...prev,
      { id: `${Date.now()}`, role: 'user', content: trimmed },
    ]);
    setInput('');
    // TODO: wire up AI response
  }, [input]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // TODO: handle dropped image/file
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  if (!open) return null;

  return (
    /* ── Backdrop ─────────────────────────────────────────────── */
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="AI Assistant"
    >
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── Dialog panel ──────────────────────────────────────── */}
      <div className="relative w-full md:max-w-md glass rounded-2xl overflow-hidden flex flex-col">

        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--glass-border)' }}
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue/15 flex items-center justify-center">
              <Zap size={13} className="text-blue" />
            </div>
            <span className="text-sm font-semibold text-foreground">AI Assistant</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Mode toggle pill */}
            <div
              className="flex items-center gap-0.5 rounded-full p-0.5 text-xs"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)' }}
            >
              {(['scanner', 'chat'] as Mode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={clsx(
                    'px-3 py-1 rounded-full font-medium capitalize transition-all duration-150',
                    mode === m
                      ? 'bg-blue text-white shadow-sm'
                      : 'text-text-secondary hover:text-foreground'
                  )}
                >
                  {m === 'scanner' ? 'Scanner' : 'Chat'}
                </button>
              ))}
            </div>

            <button
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center rounded-lg text-text-secondary hover:text-foreground hover:bg-white/8 transition-all"
              aria-label="Close dialog"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── Mode A: Subtle Scanner ─────────────────────────── */}
        {mode === 'scanner' && (
          <div className="p-4 space-y-2">
            <p className="text-xs text-text-secondary text-center pb-1">
              Choose how to add or update inventory items
            </p>

            {SCANNER_ACTIONS.map(({ icon: Icon, label, description, color, bg }) => (
              <button
                key={label}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl hover:bg-white/6 transition-all group text-left"
                style={{ border: '1px solid var(--glass-border)' }}
              >
                <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors', bg)}>
                  <Icon size={18} className={color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{label}</div>
                  <div className="text-xs text-text-secondary truncate">{description}</div>
                </div>
                <ChevronRight
                  size={14}
                  className="text-text-secondary flex-shrink-0 group-hover:translate-x-0.5 transition-transform"
                />
              </button>
            ))}
          </div>
        )}

        {/* ── Mode B: Conversational Chat ────────────────────── */}
        {mode === 'chat' && (
          <div className="flex flex-col" style={{ height: '22rem' }}>

            {/* Message list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center gap-2 text-text-secondary select-none">
                  <MessageSquare size={30} className="opacity-20" />
                  <p className="text-xs leading-relaxed">
                    Ask about your inventory, request restocks,<br />
                    or drop an image to analyze
                  </p>
                </div>
              )}

              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={clsx('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={clsx(
                      'max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-blue text-white rounded-br-sm'
                        : 'text-foreground rounded-bl-sm'
                    )}
                    style={
                      msg.role === 'assistant'
                        ? { background: 'rgba(255,255,255,0.08)', border: '1px solid var(--glass-border)' }
                        : undefined
                    }
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar with file drop */}
            <div
              className={clsx(
                'px-3 pb-3 pt-2 border-t transition-colors duration-150',
                isDragging && 'bg-blue/6'
              )}
              style={{ borderColor: 'var(--glass-border)' }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {isDragging && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-blue pb-2">
                  <Upload size={13} />
                  Drop image to analyze
                </div>
              )}

              <div
                className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)' }}
              >
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-text-secondary hover:text-foreground transition-colors flex-shrink-0"
                  aria-label="Attach image"
                >
                  <Upload size={15} />
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                />

                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your inventory…"
                  className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-text-secondary min-w-0"
                />

                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="flex-shrink-0 text-blue disabled:opacity-25 hover:opacity-80 transition-opacity"
                  aria-label="Send message"
                >
                  <Send size={15} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
