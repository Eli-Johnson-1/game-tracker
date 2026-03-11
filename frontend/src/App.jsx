import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { SettingsProvider } from './contexts/SettingsContext'
import { ProtectedRoute } from './components/common/ProtectedRoute'
import { Layout } from './components/common/Layout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { GinRummyPage } from './pages/GinRummyPage'
import { GinRummyGamePage } from './pages/GinRummyGamePage'
import { GinRummySettingsPage } from './pages/GinRummySettingsPage'
import { TerraformingMarsPage } from './pages/TerraformingMarsPage'
import { TerraformingMarsGamePage } from './pages/TerraformingMarsGamePage'
import { SettingsPage } from './pages/SettingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="gin-rummy" element={<GinRummyPage />} />
              <Route path="gin-rummy/games/:id" element={<GinRummyGamePage />} />
              <Route path="gin-rummy/settings" element={<GinRummySettingsPage />} />
              <Route path="terraforming-mars" element={<TerraformingMarsPage />} />
              <Route path="terraforming-mars/games/:id" element={<TerraformingMarsGamePage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
