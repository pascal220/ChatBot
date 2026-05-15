import { apiClient } from './client'

export const filesApi = {
  upload: async (file: File): Promise<{ key: string }> => {
    const form = new FormData()
    form.append('file', file)
    return apiClient
      .post<{ key: string }>('/files/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },

  presignedUrl: (key: string): Promise<{ url: string }> =>
    apiClient.get<{ url: string }>(`/files/${key}/url`).then((r) => r.data),
}
