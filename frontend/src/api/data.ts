import { apiClient } from './client'
import type { DataRecord } from '@/types'

export const dataApi = {
  list: () =>
    apiClient.get<DataRecord[]>('/data/records').then((r) => r.data),

  create: (body: { name: string; data_type: string; content: unknown; meta?: Record<string, unknown> }) =>
    apiClient.post<DataRecord>('/data/records', body).then((r) => r.data),

  update: (id: string, body: { name?: string; content?: unknown; meta?: Record<string, unknown> }) =>
    apiClient.put<DataRecord>(`/data/records/${id}`, body).then((r) => r.data),

  remove: (id: string) =>
    apiClient.delete(`/data/records/${id}`),
}
