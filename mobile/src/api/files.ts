import { apiClient } from './client'

export const filesApi = {
  upload: async (uri: string, mimeType = 'image/jpeg', filename = 'image.jpg') => {
    const form = new FormData()
    form.append('file', { uri, name: filename, type: mimeType } as unknown as Blob)
    return apiClient
      .post<{ key: string }>('/files/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },
}
