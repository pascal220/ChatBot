import { apiClient } from './client'
import type { ChatMessage, ChatSession, MessageCreate } from '@/types'

export const chatApi = {
  listSessions: () =>
    apiClient.get<ChatSession[]>('/chat/sessions').then((r) => r.data),

  createSession: (title = 'New Chat') =>
    apiClient.post<ChatSession>('/chat/sessions', { title }).then((r) => r.data),

  renameSession: (id: string, title: string) =>
    apiClient.patch<ChatSession>(`/chat/sessions/${id}`, { title }).then((r) => r.data),

  deleteSession: (id: string) =>
    apiClient.delete(`/chat/sessions/${id}`),

  listMessages: (sessionId: string) =>
    apiClient.get<ChatMessage[]>(`/chat/sessions/${sessionId}/messages`).then((r) => r.data),

  /**
   * Open an SSE stream for a new message. Returns an EventSource.
   * The caller is responsible for closing it.
   */
  streamMessage: (sessionId: string, body: MessageCreate): EventSource => {
    // We POST the body then stream — SSE with POST requires fetch-based approach
    // Using native EventSource only supports GET; we use fetchEventSource pattern below.
    // This function returns a controller so callers can abort.
    throw new Error('Use useStreamChat hook instead')
  },
}
