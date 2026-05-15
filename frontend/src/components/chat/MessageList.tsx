import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useChatStore } from '@/store/chatStore'
import { format } from 'date-fns'
import { clsx } from 'clsx'

interface Props {
  sessionId: string
}

export default function MessageList({ sessionId }: Props) {
  const messages = useChatStore((s) => s.messages[sessionId] ?? [])
  const streamingContent = useChatStore((s) => s.streamingContent)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, streamingContent])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={clsx('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
        >
          <div
            className={clsx(
              'max-w-2xl rounded-2xl px-4 py-3 text-sm leading-relaxed',
              msg.role === 'user'
                ? 'bg-brand-600 text-white rounded-br-sm'
                : 'bg-white text-gray-800 shadow-sm rounded-bl-sm',
            )}
          >
            {msg.role === 'assistant' ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                className="prose prose-sm max-w-none"
              >
                {msg.content}
              </ReactMarkdown>
            ) : (
              <p className="whitespace-pre-wrap">{msg.content}</p>
            )}
            <p
              className={clsx(
                'text-xs mt-1',
                msg.role === 'user' ? 'text-brand-100 text-right' : 'text-gray-400',
              )}
            >
              {format(new Date(msg.created_at), 'HH:mm')}
            </p>
          </div>
        </div>
      ))}

      {/* Streaming assistant bubble */}
      {streamingContent && (
        <div className="flex justify-start">
          <div className="max-w-2xl rounded-2xl rounded-bl-sm px-4 py-3 text-sm bg-white shadow-sm text-gray-800">
            <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm max-w-none">
              {streamingContent}
            </ReactMarkdown>
            <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1 align-text-bottom rounded-sm" />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
