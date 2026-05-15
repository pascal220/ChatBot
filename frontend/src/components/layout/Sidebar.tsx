import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageSquarePlus, Trash2, LogOut } from 'lucide-react'
import { chatApi } from '@/api/chat'
import { useAuthStore } from '@/store/authStore'
import { useChatStore } from '@/store/chatStore'
import { clsx } from 'clsx'
import { format } from 'date-fns'

interface Props {
  onNewChat: () => void
}

export default function Sidebar({ onNewChat }: Props) {
  const qc = useQueryClient()
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const { sessions, activeSessionId, setActiveSession } = useChatStore()

  const deleteMutation = useMutation({
    mutationFn: chatApi.deleteSession,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  })

  return (
    <aside className="w-64 flex flex-col bg-gray-900 text-gray-100 shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-700">
        <span className="font-semibold text-sm">ChatBot</span>
        <button
          onClick={onNewChat}
          className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
          title="New chat"
        >
          <MessageSquarePlus size={18} />
        </button>
      </div>

      {/* Session list */}
      <nav className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={clsx(
              'group flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer text-sm transition-colors',
              activeSessionId === session.id
                ? 'bg-gray-700 text-white'
                : 'hover:bg-gray-800 text-gray-300',
            )}
            onClick={() => setActiveSession(session.id)}
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{session.title}</p>
              <p className="text-xs text-gray-500">
                {format(new Date(session.updated_at), 'MMM d')}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                deleteMutation.mutate(session.id)
              }}
              className="ml-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-4 py-3 border-t border-gray-700 flex items-center justify-between">
        <span className="text-sm text-gray-400 truncate">{user?.username}</span>
        <button
          onClick={logout}
          className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          title="Sign out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  )
}
