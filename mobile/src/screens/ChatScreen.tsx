import { useEffect, useRef, useState } from 'react'
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  View,
  Text,
  Image,
} from 'react-native'
import { useRoute } from '@react-navigation/native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import { Send, Paperclip, Globe } from 'lucide-react-native'
import Markdown from 'react-native-markdown-display'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { useChatStore } from '@/store/chatStore'
import { useStreamChat } from '@/hooks/useStreamChat'
import { filesApi } from '@/api/files'
import type { RootStackParamList } from '@/navigation'

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>

export default function ChatScreen({ route }: Props) {
  const { sessionId } = route.params
  const listRef = useRef<FlatList>(null)
  const [text, setText] = useState('')
  const [webSearch, setWebSearch] = useState(false)
  const [attachedKeys, setAttachedKeys] = useState<string[]>([])

  const messages = useChatStore((s) => s.messages[sessionId] ?? [])
  const streamingContent = useChatStore((s) => s.streamingContent)
  const setMessages = useChatStore((s) => s.setMessages)

  const { sendMessage, isStreaming, abort } = useStreamChat(sessionId)

  useQuery({
    queryKey: ['messages', sessionId],
    queryFn: () => apiClient.get(`/chat/sessions/${sessionId}/messages`).then((r) => r.data),
    onSuccess: (data) => setMessages(sessionId, data),
  })

  useEffect(() => {
    if (messages.length > 0) {
      listRef.current?.scrollToEnd({ animated: true })
    }
  }, [messages.length, streamingContent])

  const handleSend = async () => {
    const trimmed = text.trim()
    if (!trimmed || isStreaming) return
    setText('')
    setAttachedKeys([])
    await sendMessage({ content: trimmed, file_keys: attachedKeys, include_web_search: webSearch })
  }

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] })
    if (result.canceled) return
    const asset = result.assets[0]
    const form = new FormData()
    form.append('file', { uri: asset.uri, name: asset.fileName ?? 'image.jpg', type: asset.mimeType ?? 'image/jpeg' } as unknown as Blob)
    const { data } = await apiClient.post('/files/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    setAttachedKeys((k) => [...k, data.key])
  }

  const allItems = [
    ...messages,
    ...(streamingContent ? [{ id: '__streaming__', role: 'assistant', content: streamingContent, file_keys: [], created_at: '' }] : []),
  ]

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-gray-50"
      keyboardVerticalOffset={88}
    >
      <FlatList
        ref={listRef}
        data={allItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 4 }}
        renderItem={({ item }) => (
          <View
            className={`mb-3 max-w-xs rounded-2xl px-4 py-3 ${
              item.role === 'user'
                ? 'self-end bg-brand-600'
                : 'self-start bg-white shadow-sm'
            }`}
          >
            {item.role === 'assistant' ? (
              <Markdown>{item.content}</Markdown>
            ) : (
              <Text className="text-white text-sm">{item.content}</Text>
            )}
          </View>
        )}
      />

      {/* Input bar */}
      <View className="bg-white border-t border-gray-200 px-3 py-2 flex-row items-end gap-2">
        <TouchableOpacity
          onPress={() => setWebSearch((v) => !v)}
          className={`p-2 rounded-lg ${webSearch ? 'bg-brand-100' : ''}`}
        >
          <Globe size={20} color={webSearch ? '#0284c7' : '#9ca3af'} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handlePickImage} className="p-2">
          <Paperclip size={20} color="#9ca3af" />
        </TouchableOpacity>
        <TextInput
          className="flex-1 bg-gray-100 rounded-xl px-4 py-2 text-sm max-h-28"
          placeholder="Message…"
          value={text}
          onChangeText={setText}
          multiline
        />
        {isStreaming ? (
          <TouchableOpacity onPress={abort} className="p-2 bg-red-100 rounded-lg">
            <View className="w-4 h-4 bg-red-500 rounded-sm" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleSend}
            disabled={!text.trim()}
            className="p-2 bg-brand-600 rounded-lg disabled:opacity-40"
          >
            <Send size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  )
}

// Small helper used inside SessionsScreen too
export const filesApi = {
  upload: async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return apiClient.post('/files/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
