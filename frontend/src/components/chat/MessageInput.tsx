import { useCallback, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Paperclip, Send, Globe, X } from 'lucide-react'
import { filesApi } from '@/api/files'
import { useStreamChat } from '@/hooks/useStreamChat'
import { clsx } from 'clsx'

interface Props {
  sessionId: string
}

export default function MessageInput({ sessionId }: Props) {
  const [text, setText] = useState('')
  const [useWebSearch, setUseWebSearch] = useState(false)
  const [attachedKeys, setAttachedKeys] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { sendMessage, isStreaming, abort } = useStreamChat(sessionId)

  const handleSubmit = async () => {
    const trimmed = text.trim()
    if (!trimmed || isStreaming) return
    setText('')
    setAttachedKeys([])
    await sendMessage({
      content: trimmed,
      file_keys: attachedKeys,
      include_web_search: useWebSearch,
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const onDrop = useCallback(async (files: File[]) => {
    setUploading(true)
    try {
      const results = await Promise.all(files.map((f) => filesApi.upload(f)))
      setAttachedKeys((prev) => [...prev, ...results.map((r) => r.key)])
    } finally {
      setUploading(false)
    }
  }, [])

  const { getInputProps, open } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    noClick: true,
    noKeyboard: true,
  })

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3">
      {/* Attachment pills */}
      {attachedKeys.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachedKeys.map((key) => (
            <span
              key={key}
              className="flex items-center gap-1 bg-gray-100 text-gray-700 text-xs rounded-full px-3 py-1"
            >
              <Paperclip size={12} />
              {key.slice(0, 16)}…
              <button
                onClick={() => setAttachedKeys((k) => k.filter((x) => x !== key))}
                className="ml-1 text-gray-400 hover:text-gray-700"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Web search toggle */}
        <button
          title="Toggle web search"
          onClick={() => setUseWebSearch((v) => !v)}
          className={clsx(
            'p-2 rounded-lg transition-colors',
            useWebSearch
              ? 'bg-brand-100 text-brand-600'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100',
          )}
        >
          <Globe size={18} />
        </button>

        {/* File attach */}
        <input {...getInputProps()} />
        <button
          title="Attach image"
          onClick={open}
          disabled={uploading}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition-colors"
        >
          <Paperclip size={18} />
        </button>

        {/* Text area */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message… (Shift+Enter for new line)"
          className="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 max-h-40 overflow-y-auto"
        />

        {/* Send / Stop */}
        {isStreaming ? (
          <button
            onClick={abort}
            className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
            title="Stop generation"
          >
            <span className="block w-3.5 h-3.5 bg-red-600 rounded-sm" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!text.trim()}
            className="p-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white transition-colors"
            title="Send"
          >
            <Send size={18} />
          </button>
        )}
      </div>
    </div>
  )
}
