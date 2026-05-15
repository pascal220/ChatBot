import { apiClient } from './client'
import type { Report } from '@/types'

export const reportsApi = {
  list: () =>
    apiClient.get<Report[]>('/reports/').then((r) => r.data),

  get: (id: string) =>
    apiClient.get<Report>(`/reports/${id}`).then((r) => r.data),

  generate: (body: {
    session_id: string
    title?: string
    data_record_ids?: string[]
    model?: string
  }) =>
    apiClient.post<Report>('/reports/generate', body).then((r) => r.data),

  downloadPdfUrl: (id: string) => `/api/v1/reports/${id}/pdf`,
}
