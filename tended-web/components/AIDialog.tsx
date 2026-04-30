'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  X, Camera, Barcode, Receipt,
  Zap, Send,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuthStore } from '@/store/authStore';

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
  onTriggerScanner: (action: 'camera' | 'barcode' | 'receipt') => void;
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

export default function AIDialog({ open, onClose, onTriggerScanner }: AIDialogProps) {
  const { profile } = useAuthStore();
  
  const [mode, setMode] = useState<Mode>('scanner');
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: 'Scan items or tell me what you bought today!' },
  ]);
  const [input, setInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);

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

  const openCamera  = useCallback(() => { onClose(); onTriggerScanner('camera'); }, [onClose, onTriggerScanner]);
  const openBarcode = useCallback(() => { onClose(); onTriggerScanner('barcode'); }, [onClose, onTriggerScanner]);
  const openReceipt = useCallback(() => { onClose(); onTriggerScanner('receipt'); }, [onClose, onTriggerScanner]);

  const MODAL_OPENERS = [openCamera, openBarcode, openReceipt] as const;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/5 backdrop-blur-[20px] transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Dialog container */}
      <div className="glass relative w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-white/20 animate-in fade-in zoom-in slide-in-from-bottom-5 duration-300">
        
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-white/5 bg-white/2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue/15 flex items-center justify-center">
              <Zap size={13} className="text-blue" />
            </div>
            <span className="text-sm font-semibold text-foreground">AI Assistant</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-0.5 rounded-full p-0.5 text-xs bg-white/5 border border-white/5" role="group" aria-label="Mode selection">
              {(['scanner', 'chat'] as Mode[]).map(m => (
                <button
                  key={m}
                  aria-pressed={mode === m}
                  onClick={() => setMode(m)}
                  className={clsx(
                    'px-3 py-1 rounded-full font-medium capitalize transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue',
                    mode === m ? 'bg-blue text-white' : 'text-text-secondary hover:text-foreground'
                  )}
                >
                  {m === 'scanner' ? 'Scanner' : 'Chat'}
                </button>
              ))}
            </div>

            <button onClick={onClose} aria-label="Close AI Assistant" className="text-text-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue rounded-md">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        {mode === 'scanner' ? (
          <div className="p-4 space-y-2">
            <p className="text-xs text-text-secondary text-center pb-1">Choose how to add inventory</p>
            {SCANNER_ACTIONS.map(({ icon: Icon, label, description, color, bg }, idx) => (
              <button
                key={label}
                onClick={MODAL_OPENERS[idx]}
                className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-all text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue"
              >
                <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center transition-colors', bg)}>
                  <Icon size={20} className={color} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{label}</div>
                  <div className="text-xs text-text-secondary">{description}</div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col h-[400px]">
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.map(m => (
                <div key={m.id} className={clsx('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div className={clsx('max-w-[85%] rounded-2xl px-4 py-2 text-sm', m.role === 'user' ? 'bg-blue text-white' : 'bg-white/10 text-foreground')}>
                    {m.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-white/5 bg-white/2">
              <div className="flex items-center gap-2 bg-white/5 rounded-2xl px-4 py-2 border border-white/5">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Tend anything..."
                  className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-text-secondary"
                />
                <button onClick={handleSend} aria-label="Send message" disabled={!input.trim()} className="text-blue disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue rounded-md">
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
