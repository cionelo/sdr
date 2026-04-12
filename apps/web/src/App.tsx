import { Routes, Route, Navigate } from 'react-router-dom'

function PlaceholderMeetsList() {
  return <div className="p-8 font-display text-2xl">MEETS LIST</div>
}

function PlaceholderMeetDetail() {
  return <div className="p-8 font-display text-2xl">MEET DETAIL</div>
}

export default function App() {
  return (
    <>
      <div className="finish-stripe" />
      <Routes>
        <Route path="/meets" element={<PlaceholderMeetsList />} />
        <Route path="/meets/:id" element={<PlaceholderMeetDetail />} />
        <Route path="*" element={<Navigate to="/meets" replace />} />
      </Routes>
    </>
  )
}
