import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/store/authStore'

export default function LoginScreen() {
  const setAuth = useAuthStore((s) => s.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) return
    setLoading(true)
    try {
      const { data } = await apiClient.post('/auth/login', { email, password })
      await setAuth(data.access_token, data.user)
    } catch {
      Alert.alert('Login failed', 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-gray-50 justify-center px-6"
    >
      <Text className="text-3xl font-bold text-gray-900 mb-8 text-center">Sign in</Text>

      <TextInput
        className="bg-white border border-gray-300 rounded-xl px-4 py-3 mb-4 text-base"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        className="bg-white border border-gray-300 rounded-xl px-4 py-3 mb-6 text-base"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        onPress={handleLogin}
        disabled={loading}
        className="bg-brand-600 rounded-xl py-3 items-center disabled:opacity-50"
      >
        <Text className="text-white font-semibold text-base">
          {loading ? 'Signing in…' : 'Sign in'}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  )
}
