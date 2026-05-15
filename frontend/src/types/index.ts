// ── Auth ──────────────────────────────────────────────────────────────────────
export interface User {
  id: string
  email: string
  username: string
  is_active: boolean
  created_at: string
}

export interface Token {
  access_token: string
  token_type: string
  user: User
}

// ── Chat ──────────────────────────────────────────────────────────────────────
export interface ChatSession {
  id: string
  title: string
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  file_keys: string[]
  created_at: string
}

export interface MessageCreate {
  content: string
  model?: string
  file_keys?: string[]
  include_web_search?: boolean
}

// ── Data Records ──────────────────────────────────────────────────────────────
export type DataType = 'timeseries' | 'text' | 'number' | 'json'

export interface DataRecord {
  id: string
  name: string
  data_type: DataType
  content: unknown
  meta: Record<string, unknown>
  created_at: string
  updated_at: string
}

// ── Reports ───────────────────────────────────────────────────────────────────
export interface Report {
  id: string
  title: string
  markdown_content: string
  pdf_key: string | null
  session_id: string | null
  created_at: string
}
