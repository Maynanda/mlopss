import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Datasets from './pages/Datasets'
import Experiments from './pages/Experiments'
import Models from './pages/Models'
import Training from './pages/Training'
import Inference from './pages/Inference'
import Monitoring from './pages/Monitoring'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"   element={<Dashboard />} />
          <Route path="datasets"    element={<Datasets />} />
          <Route path="experiments" element={<Experiments />} />
          <Route path="models"      element={<Models />} />
          <Route path="training"    element={<Training />} />
          <Route path="inference"   element={<Inference />} />
          <Route path="monitoring"  element={<Monitoring />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
