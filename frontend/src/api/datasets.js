import client from './client'

export const datasetsApi = {
  list:    ()             => client.get('/datasets/'),
  get:     (id)          => client.get(`/datasets/${id}`),
  preview: (id)          => client.get(`/datasets/${id}/preview`),
  delete:  (id)          => client.delete(`/datasets/${id}`),
  upload:  (formData)    => client.post('/datasets/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
}
