import client from './client'

export const experimentsApi = {
  list:       ()       => client.get('/experiments/'),
  get:        (id)     => client.get(`/experiments/${id}`),
  create:     (data)   => client.post('/experiments/', data),
  delete:     (id)     => client.delete(`/experiments/${id}`),
  train:      (id)     => client.post(`/experiments/${id}/train`),
  algorithms: ()       => client.get('/experiments/algorithms'),
}

export const trainingApi = {
  listJobs: ()    => client.get('/training/jobs'),
  getJob:   (id)  => client.get(`/training/jobs/${id}`),
  cancel:   (id)  => client.post(`/training/jobs/${id}/cancel`),
}
