import { apiClient } from './client'
import type { Token, UserCreate, UserLogin } from '@/types'

interface UserCreate {
  email: string
  username: string
  password: string
}

interface UserLogin {
  email: string
  password: string
}

export const authApi = {
  register: (body: UserCreate) =>
    apiClient.post<Token>('/auth/register', body).then((r) => r.data),

  login: (body: UserLogin) =>
    apiClient.post<Token>('/auth/login', body).then((r) => r.data),
}
