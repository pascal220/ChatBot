import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuthStore } from '@/store/authStore'
import LoginScreen from '@/screens/LoginScreen'
import SessionsScreen from '@/screens/SessionsScreen'
import ChatScreen from '@/screens/ChatScreen'

export type RootStackParamList = {
  Login: undefined
  Sessions: undefined
  Chat: { sessionId: string; title: string }
}

const Stack = createNativeStackNavigator<RootStackParamList>()

export default function AppNavigator() {
  const token = useAuthStore((s) => s.token)

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#0284c7' }, headerTintColor: '#fff' }}>
        {!token ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="Sessions" component={SessionsScreen} options={{ title: 'Conversations' }} />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={({ route }) => ({ title: route.params.title })}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
