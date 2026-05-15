import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useChatStore } from '@/store/chatStore'

describe('chatStore', () => {
  beforeEach(() => {
    useChatStore.setState({
      sessions: [],
      activeSessionId: null,
      messages: {},
      streamingContent: '',
    })
  })

  it('appends a message to a session', () => {
    const msg = {
      id: '1',
      role: 'user' as const,
      content: 'Hello',
      file_keys: [],
      created_at: new Date().toISOString(),
    }
    act(() => useChatStore.getState().appendMessage('session-1', msg))
    expect(useChatStore.getState().messages['session-1']).toHaveLength(1)
    expect(useChatStore.getState().messages['session-1'][0].content).toBe('Hello')
  })

  it('accumulates streaming tokens and commits the final message', () => {
    act(() => useChatStore.getState().appendStreamToken('Hello'))
    act(() => useChatStore.getState().appendStreamToken(' world'))
    expect(useChatStore.getState().streamingContent).toBe('Hello world')

    const finalMsg = {
      id: '2',
      role: 'assistant' as const,
      content: 'Hello world',
      file_keys: [],
      created_at: new Date().toISOString(),
    }
    act(() => useChatStore.getState().commitStreamedMessage('session-1', finalMsg))
    expect(useChatStore.getState().streamingContent).toBe('')
    expect(useChatStore.getState().messages['session-1']).toHaveLength(1)
  })
})
