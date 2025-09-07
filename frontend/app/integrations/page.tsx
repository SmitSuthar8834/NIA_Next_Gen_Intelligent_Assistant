'use client'

import { useState } from 'react'
import CreatioConfig from '../../components/CreatioConfig'

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState('creatio')

  const tabs = [
    { id: 'creatio', name: 'Creatio CRM', icon: '🏢' },
    { id: 'teams', name: 'Microsoft Teams', icon: '💬', disabled: true },
    { id: 'ai', name: 'AI Processing', icon: '🤖', disabled: true }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Integrations</h1>
          <p className="text-gray-600 mt-2">Connect your external services and tools</p>
        </div>

        <div className="bg-white rounded-lg shadow">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => !tab.disabled && setActiveTab(tab.id)}
                  disabled={tab.disabled}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : tab.disabled
                      ? 'border-transparent text-gray-400 cursor-not-allowed'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                  {tab.disabled && (
                    <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                      Coming Soon
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'creatio' && <CreatioConfig />}
            
            {activeTab === 'teams' && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">💬</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Microsoft Teams Integration</h3>
                <p className="text-gray-600">
                  Automatically fetch meeting transcripts from Microsoft Teams.
                </p>
                <p className="text-sm text-gray-500 mt-4">Coming soon...</p>
              </div>
            )}
            
            {activeTab === 'ai' && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🤖</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">AI Processing</h3>
                <p className="text-gray-600">
                  Automatically summarize meeting transcripts and extract insights.
                </p>
                <p className="text-sm text-gray-500 mt-4">Coming soon...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}