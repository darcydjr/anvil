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

import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AppProvider } from './contexts/AppContext'
import { ThemeProvider } from './components/ThemeProvider'
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import DocumentView from './components/DocumentView'
import DocumentEditor from './components/DocumentEditor'
import Settings from './components/Settings'
import Discovery from './components/Discovery'
import Plan from './components/Plan'
import ManageWorkspaces from './components/ManageWorkspaces'

function App(): JSX.Element {
  return (
    <ThemeProvider>
      <AppProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/discovery" element={<Discovery />} />
              <Route path="/plan" element={<Plan />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/manage-workspaces" element={<ManageWorkspaces />} />
              <Route path="/view/:type/*" element={<DocumentView />} />
              <Route path="/edit/:type/*" element={<DocumentEditor />} />
              <Route path="/create/:type" element={<DocumentEditor />} />
              <Route path="/create/:type/for/:capabilityId" element={<DocumentEditor />} />
              <Route path="/*.md" element={<DocumentView />} />
            </Routes>
          </Layout>
        </Router>
      </AppProvider>
    </ThemeProvider>
  )
}

export default App
