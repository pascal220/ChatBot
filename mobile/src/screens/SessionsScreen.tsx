import { useEffect } from 'react'
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { MessageSquarePlus } from 'lucide-react-native'
import { apiClient } from '@/api/client'
import { useChatStore } from '@/store/chatStore'
import { useAuthStore } from '@/store/authStore'
import { format } from 'date-fns'
import type { RootStackParamList } from '@/navigation'

type Nav = NativeStackNavigationProp<RootStackParamList, 'Sessions'>

export default function SessionsScreen() {
  const navigation = useNavigation<Nav>()
  const qc = useQueryClient()
  const logout = useAuthStore((s) => s.logout)
  const setSessions = useChatStore((s) => s.setSessions)

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => apiClient.get('/chat/sessions').then((r) => r.data),
  })

  useEffect(() => { setSessions(sessions) }, [sessions, setSessions])

  const createMutation = useMutation({
    mutationFn: () => apiClient.post('/chat/sessions', { title: 'New Chat' }).then((r) => r.data),
    onSuccess: (session) => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
      navigation.navigate('Chat', { sessionId: session.id, title: session.title })
    },
  })

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => createMutation.mutate()} className="mr-2">
          <MessageSquarePlus color="#fff" size={22} />
        </TouchableOpacity>
      ),
      headerLeft: () => (
        <TouchableOpacity onPress={() => Alert.alert('Sign out?', '', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign out', style: 'destructive', onPress: logout },
        ])}>
          <Text className="text-white ml-2 text-base">Logout</Text>
        </TouchableOpacity>
      ),
    })
  }, [navigation, createMutation, logout])

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-500">Loading…</Text>
      </View>
    )
  }

  return (
    <FlatList
      data={sessions}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16 }}
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => navigation.navigate('Chat', { sessionId: item.id, title: item.title })}
          className="bg-white rounded-xl px-4 py-4 shadow-sm"
        >
          <Text className="text-gray-900 font-medium text-base">{item.title}</Text>
          <Text className="text-gray-400 text-xs mt-1">
            {format(new Date(item.updated_at), 'MMM d, HH:mm')}
          </Text>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View className="items-center mt-24">
          <Text className="text-gray-400 text-base">No conversations yet</Text>
          <TouchableOpacity onPress={() => createMutation.mutate()} className="mt-4">
            <Text className="text-brand-600 font-medium">Start a new chat</Text>
          </TouchableOpacity>
        </View>
      }
    />
  )
}
