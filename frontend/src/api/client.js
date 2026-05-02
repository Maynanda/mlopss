import axios from 'axios'
import toast from 'react-hot-toast'

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.response.use(
  res => res,
  err => {
    const msg = err.response?.data?.detail || err.message || 'Request failed'
    toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg))
    return Promise.reject(err)
  }
)

export default client
