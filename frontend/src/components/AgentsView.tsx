import { useState, useEffect } from 'react'

interface Agent {
  id: number
  name: string
  description?: string
  systemPrompt?: string
  status?: string
}

const BUILTIN_AGENTS = [
  {
    name: 'LangGraph Orchestrator',
    role: 'Supervisor & State Coordinator',
    badge: 'Core Engine',
    model: 'LangGraph StateMachine',
    status: 'online',
    description: 'Directs multi-agent message routing, node executions, and aggregates sub-agent states into cohesive final answers.',
  },
  {
    name: 'Planner Agent',
    role: 'Task Decomposition',
    badge: 'LangGraph Node',
    model: 'llama-3.3-70b-versatile',
    status: 'online',
    description: 'Analyzes user prompts, assesses complexity, and prepares structured execution steps for downstream specialist agents.',
  },
  {
    name: 'Web Search Agent',
    role: 'Real-Time Fact Retrieval',
    badge: 'Tavily Integration',
    model: 'Tavily Search API',
    status: 'online',
    description: 'Searches live websites for up-to-date knowledge, verifies facts, and returns cited sources with URLs.',
  },
  {
    name: 'Calculation Agent',
    role: 'Mathematical Computation',
    badge: 'Math Logic Engine',
    model: 'Symbolic Parser',
    status: 'online',
    description: 'Evaluates algebraic equations, mathematical expressions, currency/unit conversions with deterministic precision.',
  },
  {
    name: 'Memory Agent',
    role: 'Long-Term Profile & Context',
    badge: 'Postgres JSONB Store',
    model: 'Context Extractor',
    status: 'online',
    description: 'Extracts user facts and preferences from dialogue, maintaining cross-conversation memory in user profiles.',
  },
  {
    name: 'Response Synthesizer',
    role: 'Markdown Answer Generator',
    badge: 'Final Node',
    model: 'Groq / LLaMA 3.3',
    status: 'online',
    description: 'Merges multi-source outputs, formats code snippets and tables into clean readable Markdown for the user.',
  },
]

interface AgentsViewProps {
  apiBase: string
  onBackToChat: () => void
}

export default function AgentsView({ apiBase, onBackToChat }: AgentsViewProps) {
  const [customAgents, setCustomAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPrompt, setNewPrompt] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState('')

  useEffect(() => {
    setLoading(true)
    fetch(`${apiBase}/agents`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(data => {
        if (data.agents && Array.isArray(data.agents)) {
          setCustomAgents(data.agents)
        }
      })
      .catch(() => {
        // Fallback / offline mode
      })
      .finally(() => setLoading(false))
  }, [apiBase])

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`${apiBase}/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newName.trim(),
          description: newDesc.trim(),
          system_prompt: newPrompt.trim(),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setCustomAgents(prev => [data, ...prev])
        setNewName('')
        setNewDesc('')
        setNewPrompt('')
        setShowModal(false)
        setFeedbackMsg('Agent created successfully!')
        setTimeout(() => setFeedbackMsg(''), 3000)
      } else {
        alert(data.message || 'Failed to create agent')
      }
    } catch {
      alert('Network error while creating agent')
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (agentId: number, currentStatus?: string) => {
    const nextStatus = currentStatus === 'running' ? 'paused' : 'running'
    try {
      setCustomAgents(prev =>
        prev.map(a => (a.id === agentId ? { ...a, status: nextStatus } : a))
      )
      await fetch(`${apiBase}/agents/${agentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: nextStatus }),
      })
    } catch {
      // Revert if failed
    }
  }

  return (
    <div className="view-container">
      {/* View Header */}
      <div className="view-header">
        <div>
          <h1 className="view-title">AI Agents & Orchestration</h1>
          <p className="view-subtitle">
            Mann's modular multi-agent graph architecture powered by LangGraph & Groq LLMs.
          </p>
        </div>
        <div className="view-header-actions">
          <button className="view-btn-primary" onClick={() => setShowModal(true)}>
            + New Agent
          </button>
          <button className="view-btn-secondary" onClick={onBackToChat}>
            Back to Chat
          </button>
        </div>
      </div>

      {feedbackMsg && <div className="view-alert success">{feedbackMsg}</div>}

      {/* Built-in Graph Pipeline */}
      <div className="view-section">
        <div className="view-section-header">
          <h2 className="view-section-title">Built-in Multi-Agent Pipeline</h2>
          <span className="view-badge live">Graph Active</span>
        </div>
        <div className="agents-grid">
          {BUILTIN_AGENTS.map(agent => (
            <div key={agent.name} className="agent-card">
              <div className="agent-card-top">
                <div>
                  <h3 className="agent-card-title">{agent.name}</h3>
                  <div className="agent-card-role">{agent.role}</div>
                </div>
                <span className="agent-status-pill online">
                  <span className="status-dot" /> Online
                </span>
              </div>
              <p className="agent-card-desc">{agent.description}</p>
              <div className="agent-card-footer">
                <span className="agent-model-tag">{agent.model}</span>
                <span className="agent-badge-tag">{agent.badge}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Agents Section */}
      <div className="view-section" style={{ marginTop: 28 }}>
        <div className="view-section-header">
          <h2 className="view-section-title">Custom User Agents</h2>
          <span className="view-count">{customAgents.length} configured</span>
        </div>

        {loading ? (
          <div className="view-loading">Loading agents...</div>
        ) : customAgents.length === 0 ? (
          <div className="view-empty-box">
            <p>No custom agents created yet. Create one to specialize Mann AI for custom workflows.</p>
            <button className="view-btn-sm" onClick={() => setShowModal(true)}>
              Create Your First Agent
            </button>
          </div>
        ) : (
          <div className="agents-grid">
            {customAgents.map(agent => (
              <div key={agent.id} className="agent-card custom">
                <div className="agent-card-top">
                  <div>
                    <h3 className="agent-card-title">{agent.name}</h3>
                    <div className="agent-card-role">{agent.description || 'Custom Specialist Agent'}</div>
                  </div>
                  <button
                    className={`agent-status-toggle ${agent.status === 'running' ? 'running' : 'idle'}`}
                    onClick={() => toggleStatus(agent.id, agent.status)}
                    title="Toggle Status"
                  >
                    {agent.status || 'idle'}
                  </button>
                </div>
                {agent.systemPrompt && (
                  <div className="agent-prompt-preview">
                    <code>{agent.systemPrompt}</code>
                  </div>
                )}
                <div className="agent-card-footer">
                  <span className="agent-model-tag">Groq LLaMA 3.3</span>
                  <span className="agent-badge-tag">Custom</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Agent Modal */}
      {showModal && (
        <div className="view-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="view-modal" onClick={e => e.stopPropagation()}>
            <div className="view-modal-header">
              <h3>Create Custom Agent</h3>
              <button className="view-modal-close" onClick={() => setShowModal(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateAgent} className="view-form">
              <div className="view-form-group">
                <label>Agent Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Code Reviewer, Hindi Poet, SQL Expert"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  required
                />
              </div>
              <div className="view-form-group">
                <label>Description</label>
                <input
                  type="text"
                  placeholder="Short role summary"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                />
              </div>
              <div className="view-form-group">
                <label>System Instructions / Prompt</label>
                <textarea
                  rows={4}
                  placeholder="You are a specialized assistant that focuses on..."
                  value={newPrompt}
                  onChange={e => setNewPrompt(e.target.value)}
                />
              </div>
              <div className="view-modal-actions">
                <button type="button" className="view-btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="view-btn-primary" disabled={saving}>
                  {saving ? 'Creating...' : 'Save Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
