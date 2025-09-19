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
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import DocumentView from './components/DocumentView'
import DocumentEditor from './components/DocumentEditor'
import TemplateEditor from './components/TemplateEditor'
import Settings from './components/Settings'
import AgentDashboard from './components/AgentDashboard'
import Discovery from './components/Discovery'

function App() {
  return (
    <AppProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/agents" element={<AgentDashboard />} />
            <Route path="/discovery" element={<Discovery />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/view/:type/*" element={<DocumentView />} />
            <Route path="/edit/template/*" element={<TemplateEditor />} />
            <Route path="/edit/:type/*" element={<DocumentEditor />} />
            <Route path="/create/:type" element={<DocumentEditor />} />
            <Route path="/create/:type/for/:capabilityId" element={<DocumentEditor />} />
          </Routes>
        </Layout>
      </Router>
    </AppProvider>
  )
}

export default App