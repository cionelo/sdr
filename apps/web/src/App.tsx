import { Routes, Route, Navigate } from 'react-router-dom'
import { MeetsList } from './pages/MeetsList'
import { MeetDetail } from './pages/MeetDetail'

export default function App() {
  return (
    <Routes>
      <Route path="/meets" element={<MeetsList />} />
      <Route path="/meets/:id" element={<MeetDetail />} />
      <Route path="*" element={<Navigate to="/meets" replace />} />
    </Routes>
  )
}
