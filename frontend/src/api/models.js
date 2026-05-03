import client from './client'

export const modelsApi = {
  list:             ()            => client.get('/models/'),
  get:              (id)          => client.get(`/models/${id}`),
  updateStage:      (id, stage)   => client.put(`/models/${id}/stage`, { stage }),
  delete:           (id)          => client.delete(`/models/${id}`),
  featureImportance:(id)          => client.get(`/models/${id}/feature-importance`),
}

export const inferenceApi = {
  predict:      (modelId, data) => client.post(`/inference/${modelId}/predict`, { data }),
  getLiveData:  (modelId)       => client.get(`/inference/${modelId}/live-data`),
  explain:      (modelId, data) => client.post(`/inference/${modelId}/explain`, { data }),
  predictBatch: (modelId, data) => client.post(`/inference/${modelId}/predict/batch`, { data }),
}

export const monitoringApi = {
  health:      ()         => client.get('/monitoring/health'),
  modelMetrics:(id)       => client.get(`/monitoring/models/${id}/metrics`),
  drift:       (id)       => client.get(`/monitoring/models/${id}/drift`),
  jobsSummary: ()         => client.get('/monitoring/jobs/summary'),
}
