/*
 * Copyright 2025 Darcy Davidson
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AppProvider } from './contexts/AppContext'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './components/ThemeProvider'
import { useTheme } from 'next-themes'
import Layout from './components/Layout'
import Login from './components/Login'
import PrivateRoute from './components/PrivateRoute'
import Dashboard from './components/Dashboard'
import DocumentView from './components/DocumentView'
import DocumentEditor from './components/DocumentEditor'
import Settings from './components/Settings'
import Discovery from './components/Discovery'
import Plan from './components/Plan'
import ManageWorkspaces from './components/ManageWorkspaces'
import AdminUserManagement from './components/AdminUserManagement'
import DesignSystemDebug from './pages/DesignSystemDebug'
import { getCurrentDesignSystem, applyDesignSystem } from './config/designSystems'

function AppContent(): JSX.Element {
  const { resolvedTheme } = useTheme()

  // Apply design system on mount and theme change
  useEffect(() => {
    const currentSystem = getCurrentDesignSystem()
    const theme = (resolvedTheme as 'light' | 'dark') || 'light'
    applyDesignSystem(currentSystem, theme)
  }, [resolvedTheme])

  return (
    <Router>
            <Routes>
              {/* Public route - Login page */}
              <Route path="/login" element={<Login />} />

              {/* Protected routes - All require authentication */}
              <Route path="/" element={
                <PrivateRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </PrivateRoute>
              } />
              <Route path="/discovery" element={
                <PrivateRoute>
                  <Layout>
                    <Discovery />
                  </Layout>
                </PrivateRoute>
              } />
              <Route path="/plan" element={
                <PrivateRoute>
                  <Layout>
                    <Plan />
                  </Layout>
                </PrivateRoute>
              } />
              <Route path="/settings" element={
                <PrivateRoute>
                  <Layout>
                    <Settings />
                  </Layout>
                </PrivateRoute>
              } />
              <Route path="/admin/users" element={
                <PrivateRoute>
                  <Layout>
                    <AdminUserManagement />
                  </Layout>
                </PrivateRoute>
              } />
              <Route path="/debug/design-system" element={
                <PrivateRoute>
                  <Layout>
                    <DesignSystemDebug />
                  </Layout>
                </PrivateRoute>
              } />
              <Route path="/manage-workspaces" element={
                <PrivateRoute>
                  <Layout>
                    <ManageWorkspaces />
                  </Layout>
                </PrivateRoute>
              } />
              <Route path="/view/:type/*" element={
                <PrivateRoute>
                  <Layout>
                    <DocumentView />
                  </Layout>
                </PrivateRoute>
              } />
              <Route path="/edit/:type/*" element={
                <PrivateRoute>
                  <Layout>
                    <DocumentEditor />
                  </Layout>
                </PrivateRoute>
              } />
              <Route path="/create/:type" element={
                <PrivateRoute>
                  <Layout>
                    <DocumentEditor />
                  </Layout>
                </PrivateRoute>
              } />
              <Route path="/create/:type/for/:capabilityId" element={
                <PrivateRoute>
                  <Layout>
                    <DocumentEditor />
                  </Layout>
                </PrivateRoute>
              } />
              <Route path="/*.md" element={
                <PrivateRoute>
                  <Layout>
                    <DocumentView />
                  </Layout>
                </PrivateRoute>
              } />
            </Routes>
          </Router>
  )
}

function App(): JSX.Element {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
