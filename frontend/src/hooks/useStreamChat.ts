import { useCallback, useRef, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useChatStore } from '@/store/chatStore'
import type { ChatMessage, MessageCreate } from '@/types'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export function useStreamChat(sessionId: string) {
  const token = useAuthStore((s) => s.token)
  const { appendMessage, appendStreamToken, commitStreamedMessage } = useChatStore()
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(
    async (body: MessageCreate) => {
      if (isStreaming) return
      setIsStreaming(true)

      // Optimistically add the user message
      const tempUserMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: body.content,
        file_keys: body.file_keys ?? [],
        created_at: new Date().toISOString(),
      }
      appendMessage(sessionId, tempUserMsg)

      const abort = new AbortController()
      abortRef.current = abort

      try {
        const response = await fetch(
          `${BASE_URL}/api/v1/chat/sessions/${sessionId}/messages/stream`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
            signal: abort.signal,
          },
        )

        if (!response.ok || !response.body) {
          throw new Error(`Request failed: ${response.status}`)
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let completedMessageId: string | null = null

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          // Parse SSE lines
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (line.startsWith('event:')) continue
            if (line.startsWith('data:')) {
              const raw = line.slice(5).trim()
              if (!raw) continue
              try {
                const parsed = JSON.parse(raw)
                if (parsed.content !== undefined) {
                  appendStreamToken(parsed.content)
                }
                if (parsed.message_id) {
                  completedMessageId = parsed.message_id
                }
              } catch {
                // ignore malformed chunks
              }
            }
          }
        }

        // Commit the streamed assistant message
        const streamingContent = useChatStore.getState().streamingContent
        commitStreamedMessage(sessionId, {
          id: completedMessageId ?? crypto.randomUUID(),
          role: 'assistant',
          content: streamingContent,
          file_keys: [],
          created_at: new Date().toISOString(),
        })
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Stream error:', err)
        }
      } finally {
        setIsStreaming(false)
        abortRef.current = null
      }
    },
    [sessionId, token, isStreaming, appendMessage, appendStreamToken, commitStreamedMessage],
  )

  const abort = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return { sendMessage, isStreaming, abort }
}
