import { create } from 'zustand'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  file_keys: string[]
  created_at: string
}

interface ChatSession {
  id: string
  title: string
  updated_at: string
}

interface ChatState {
  sessions: ChatSession[]
  messages: Record<string, ChatMessage[]>
  streamingContent: string
  setSessions: (s: ChatSession[]) => void
  setMessages: (sessionId: string, messages: ChatMessage[]) => void
  appendMessage: (sessionId: string, message: ChatMessage) => void
  appendStreamToken: (token: string) => void
  commitStreamedMessage: (sessionId: string, message: ChatMessage) => void
}

export const useChatStore = create<ChatState>((set) => ({
  sessions: [],
  messages: {},
  streamingContent: '',

  setSessions: (sessions) => set({ sessions }),
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
