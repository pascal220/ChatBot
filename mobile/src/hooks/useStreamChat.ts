import { useCallback, useRef, useState } from 'react'
import * as SecureStore from 'expo-secure-store'
import { SSE_BASE_URL, AUTH_TOKEN_KEY } from '@/api/client'
import { useChatStore } from '@/store/chatStore'

interface MessageCreate {
  content: string
  file_keys?: string[]
  include_web_search?: boolean
  model?: string
}

export function useStreamChat(sessionId: string) {
  const { appendMessage, appendStreamToken, commitStreamedMessage } = useChatStore()
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(
    async (body: MessageCreate) => {
      if (isStreaming) return
      setIsStreaming(true)

      // Optimistically add user message
      appendMessage(sessionId, {
        id: Math.random().toString(36).slice(2),
        role: 'user',
        content: body.content,
        file_keys: body.file_keys ?? [],
        created_at: new Date().toISOString(),
      })

      const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY)
      const abort = new AbortController()
      abortRef.current = abort

      try {
        const response = await fetch(
          `${SSE_BASE_URL}/chat/sessions/${sessionId}/messages/stream`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token ?? ''}`,
            },
            body: JSON.stringify(body),
            signal: abort.signal,
          },
        )

        if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`)

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let completedId: string | null = null

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            if (line.startsWith('data:')) {
              const raw = line.slice(5).trim()
              if (!raw) continue
              try {
                const parsed = JSON.parse(raw)
                if (parsed.content) appendStreamToken(parsed.content)
                if (parsed.message_id) completedId = parsed.message_id
              } catch { /* ignore */ }
            }
          }
        }

        const content = useChatStore.getState().streamingContent
        commitStreamedMessage(sessionId, {
          id: completedId ?? Math.random().toString(36).slice(2),
          role: 'assistant',
          content,
          file_keys: [],
          created_at: new Date().toISOString(),
        })
      } catch (err) {
        if ((err as Error).name !== 'AbortError') console.error('Stream error', err)
      } finally {
        setIsStreaming(false)
        abortRef.current = null
      }
    },
    [sessionId, isStreaming, appendMessage, appendStreamToken, commitStreamedMessage],
  )

  const abort = useCallback(() => abortRef.current?.abort(), [])

  return { sendMessage, isStreaming, abort }
}
