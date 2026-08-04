// @ts-nocheck
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, Send, X, Lightbulb, BookOpen, Brain, GraduationCap, 
  Sparkles, ChevronDown, Loader2, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  action?: string;
}

interface QuestKnowledgeAgentProps {
  questId?: string;
  questTitle?: string;
}

const ACTION_BUTTONS = [
  { action: 'hint', icon: Lightbulb, label: 'Hint', color: 'from-amber-500/20 to-yellow-500/20 text-amber-400 border-amber-500/30' },
  { action: 'facts', icon: BookOpen, label: 'Facts', color: 'from-cyan-500/20 to-blue-500/20 text-cyan-400 border-cyan-500/30' },
  { action: 'quiz', icon: Brain, label: 'Quiz', color: 'from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/30' },
  { action: 'learn', icon: GraduationCap, label: 'Learn', color: 'from-emerald-500/20 to-green-500/20 text-emerald-400 border-emerald-500/30' },
];

export const QuestKnowledgeAgent: React.FC<QuestKnowledgeAgentProps> = ({ questId, questTitle }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async (action: string = 'chat', customMessage?: string) => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to use the Quest Guide.', variant: 'destructive' });
      return;
    }

    const msg = customMessage || input.trim();
    if (!msg && action === 'chat') return;

    if (action === 'chat' && msg) {
      setMessages(prev => [...prev, { role: 'user', content: msg, timestamp: new Date().toISOString() }]);
      setInput('');
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('quest-knowledge-agent', {
        body: {
          action,
          message: msg || undefined,
          questId: questId || undefined,
          conversationId: conversationId || undefined,
          factCategory: action === 'facts' || action === 'learn' ? 'exploration' : undefined,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      if (data?.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toISOString(),
        action: data.action,
      }]);
    } catch (e: any) {
      const msg = e.message || 'Failed to get response';
      if (msg.includes('Rate limit')) {
        toast({ title: 'Rate Limited', description: 'Too many requests. Wait a moment.', variant: 'destructive' });
      } else if (msg.includes('Payment')) {
        toast({ title: 'Credits Needed', description: 'Please add funds to continue.', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: msg, variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) {
    return (
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-primary via-purple-600 to-cyan-500 shadow-2xl shadow-primary/40 flex items-center justify-center hover:scale-110 transition-transform"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <Bot className="h-6 w-6 text-white" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-background animate-pulse" />
      </motion.button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed bottom-6 right-6 z-50 w-[380px] max-h-[560px] flex flex-col rounded-2xl overflow-hidden border border-primary/20 shadow-2xl shadow-black/40"
        style={{
          background: 'linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-primary/10 bg-gradient-to-r from-primary/10 via-purple-500/10 to-cyan-500/10">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border border-background" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Quest Guide</h3>
              <p className="text-[10px] text-muted-foreground">RAG-Powered Knowledge Agent</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={() => { setMessages([]); setConversationId(null); }}
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={() => setIsOpen(false)}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-1.5 px-3 py-2 border-b border-primary/5">
          {ACTION_BUTTONS.map(({ action, icon: Icon, label, color }) => (
            <button
              key={action}
              onClick={() => sendMessage(action)}
              disabled={loading}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-medium border bg-gradient-to-br transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 ${color}`}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-[200px] max-h-[340px] scrollbar-thin scrollbar-thumb-primary/20">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-cyan-500/20 flex items-center justify-center mb-3">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">Quest Knowledge Guide</p>
              <p className="text-xs text-muted-foreground max-w-[260px]">
                Ask me anything about quests, get hints, learn facts, or take a quiz challenge!
              </p>
              {questTitle && (
                <div className="mt-3 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                  <p className="text-[10px] text-primary font-medium">🎯 Context: {questTitle}</p>
                </div>
              )}
            </div>
          )}

          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-muted/50 text-foreground border border-border/50 rounded-bl-md'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </motion.div>
          ))}

          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-muted-foreground"
            >
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              </div>
              <span className="text-xs">Thinking...</span>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-3 py-2 border-t border-primary/10 bg-background/80">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about quests, history, nature..."
              disabled={loading}
              className="flex-1 bg-muted/30 border border-border/50 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50"
            />
            <Button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              size="icon"
              className="h-9 w-9 rounded-xl bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-500/90 shadow-lg shadow-primary/20"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
