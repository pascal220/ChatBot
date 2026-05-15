import { create } from 'zustand'
import type { ChatMessage, ChatSession } from '@/types'

interface ChatState {
  sessions: ChatSession[]
  activeSessionId: string | null
  messages: Record<string, ChatMessage[]>
  streamingContent: string

  setSessions: (sessions: ChatSession[]) => void
  addSession: (session: ChatSession) => void
  removeSession: (id: string) => void
  setActiveSession: (id: string | null) => void
  setMessages: (sessionId: string, messages: ChatMessage[]) => void
  appendMessage: (sessionId: string, message: ChatMessage) => void
  appendStreamToken: (token: string) => void
  commitStreamedMessage: (sessionId: string, message: ChatMessage) => void
}

export const useChatStore = create<ChatState>((set) => ({
  sessions: [],
  activeSessionId: null,
  messages: {},
  streamingContent: '',

  setSessions: (sessions) => set({ sessions }),
  addSession: (session) =>
    set((s) => ({ sessions: [session, ...s.sessions], activeSessionId: session.id })),
  removeSession: (id) =>
    set((s) => ({
      sessions: s.sessions.filter((sess) => sess.id !== id),
      activeSessionId: s.activeSessionId === id ? null : s.activeSessionId,
    })),
  setActiveSession: (id) => set({ activeSessionId: id, streamingContent: '' }),
  setMessages: (sessionId, messages) =>
    set((s) => ({ messages: { ...s.messages, [sessionId]: messages } })),
  appendMessage: (sessionId, message) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [sessionId]: [...(s.messages[sessionId] ?? []), message],
      },
    })),
  appendStreamToken: (token) =>
    set((s) => ({ streamingContent: s.streamingContent + token })),
  commitStreamedMessage: (sessionId, message) =>
    set((s) => ({
      streamingContent: '',
      messages: {
        ...s.messages,
        [sessionId]: [...(s.messages[sessionId] ?? []), message],
      },
    })),
}))
