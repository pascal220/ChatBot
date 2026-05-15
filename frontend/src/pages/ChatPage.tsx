import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { chatApi } from '@/api/chat'
import { useChatStore } from '@/store/chatStore'
import Sidebar from '@/components/layout/Sidebar'
import MessageList from '@/components/chat/MessageList'
import MessageInput from '@/components/chat/MessageInput'

export default function ChatPage() {
  const qc = useQueryClient()
  const { activeSessionId, setActiveSession, setSessions, setMessages } = useChatStore()

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: chatApi.listSessions,
  })

  useEffect(() => {
    setSessions(sessions)
    if (!activeSessionId && sessions.length > 0) {
      setActiveSession(sessions[0].id)
    }
  }, [sessions, activeSessionId, setSessions, setActiveSession])

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', activeSessionId],
    queryFn: () => chatApi.listMessages(activeSessionId!),
    enabled: !!activeSessionId,
  })

  useEffect(() => {
    if (activeSessionId) {
      setMessages(activeSessionId, messages)
    }
  }, [messages, activeSessionId, setMessages])

  const newSessionMutation = useMutation({
    mutationFn: () => chatApi.createSession(),
    onSuccess: (session) => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
      setActiveSession(session.id)
    },
  })

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar onNewChat={() => newSessionMutation.mutate()} />

      <main className="flex flex-col flex-1 min-w-0">
        {activeSessionId ? (
          <>
            <MessageList sessionId={activeSessionId} />
            <MessageInput sessionId={activeSessionId} />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-gray-400">
            <div className="text-center">
              <p className="text-lg font-medium">No conversation selected</p>
              <button
                onClick={() => newSessionMutation.mutate()}
                className="mt-3 text-brand-600 hover:underline text-sm"
              >
                Start a new chat
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
