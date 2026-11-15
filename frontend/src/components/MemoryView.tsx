import { useState, useEffect } from 'react'

interface MemoryItem {
  key: string
  value: string
  type?: string
}

interface SkillItem {
  id: number
  name: string
  description?: string
  code?: string
}

interface MemoryViewProps {
  apiBase: string
  onBackToChat: () => void
}

export default function MemoryView({ apiBase, onBackToChat }: MemoryViewProps) {
  const [activeTab, setActiveTab] = useState<'facts' | 'skills'>('facts')
  const [memories, setMemories] = useState<MemoryItem[]>([])
  const [skills, setSkills] = useState<SkillItem[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  // Add fact form
  const [factKey, setFactKey] = useState('')
  const [factValue, setFactValue] = useState('')
  const [savingFact, setSavingFact] = useState(false)

  // Add skill modal
  const [showSkillModal, setShowSkillModal] = useState(false)
  const [skillName, setSkillName] = useState('')
  const [skillDesc, setSkillDesc] = useState('')
  const [skillCode, setSkillCode] = useState('')
  const [savingSkill, setSavingSkill] = useState(false)

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 3500)
  }

  // Load memories
  const loadMemories = () => {
    setLoading(true)
    fetch(`${apiBase}/memory`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(data => {
        if (data.memories && Array.isArray(data.memories)) {
          setMemories(data.memories)
        } else if (data.profile && typeof data.profile === 'object') {
          const list = Object.entries(data.profile).map(([k, v]) => ({
            key: k,
            value: typeof v === 'object' ? JSON.stringify(v) : String(v),
            type: 'fact',
          }))
          setMemories(list)
        }
      })
      .catch(() => {
        // Fallback default sample memories if empty or new user
        setMemories([
          { key: 'preferred_language', value: 'Hindi & English (Hinglish friendly)', type: 'fact' },
          { key: 'assistant_tone', value: 'Friendly, concise, and helpful', type: 'preference' },
          { key: 'project_context', value: 'Working on Mann AI Agent Platform', type: 'context' },
        ])
      })
      .finally(() => setLoading(false))
  }

  // Load skills
  const loadSkills = () => {
    fetch(`${apiBase}/memory/skill`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(data => {
        if (data.skills && Array.isArray(data.skills)) {
          setSkills(data.skills)
        }
      })
      .catch(() => {})
  }

  useEffect(() => {
    loadMemories()
    loadSkills()
  }, [apiBase])

  // Save new fact
  const handleAddFact = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!factKey.trim() || !factValue.trim()) return
    setSavingFact(true)
    try {
      const res = await fetch(`${apiBase}/memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ key: factKey.trim(), value: factValue.trim() }),
      })
      if (res.ok) {
        setMemories(prev => [
          { key: factKey.trim(), value: factValue.trim(), type: 'fact' },
          ...prev.filter(m => m.key !== factKey.trim()),
        ])
        setFactKey('')
        setFactValue('')
        showToast('Memory fact saved to profile!')
      } else {
        showToast('Failed to save fact', 'error')
      }
    } catch {
      showToast('Error connecting to memory service', 'error')
    } finally {
      setSavingFact(false)
    }
  }

  // Delete fact
  const handleDeleteFact = async (key: string) => {
    if (!confirm(`Are you sure you want to delete memory "${key}"?`)) return
    setMemories(prev => prev.filter(m => m.key !== key))
    try {
      const res = await fetch(`${apiBase}/memory/${encodeURIComponent(key)}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        showToast(`Memory "${key}" deleted`)
      } else {
        showToast('Failed to delete on server', 'error')
      }
    } catch {
      showToast('Network error while deleting', 'error')
    }
  }

  // Create skill
  const handleCreateSkill = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!skillName.trim()) return
    setSavingSkill(true)
    try {
      const res = await fetch(`${apiBase}/memory/skill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: skillName.trim(),
          description: skillDesc.trim(),
          code: skillCode.trim(),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setSkills(prev => [data, ...prev])
        setSkillName('')
        setSkillDesc('')
        setSkillCode('')
        setShowSkillModal(false)
        showToast('Skill created successfully!')
      } else {
        showToast(data.message || 'Failed to create skill', 'error')
      }
    } catch {
      showToast('Error creating skill', 'error')
    } finally {
      setSavingSkill(false)
    }
  }

  // Delete skill
  const handleDeleteSkill = async (id: number) => {
    if (!confirm('Are you sure you want to delete this skill?')) return
    setSkills(prev => prev.filter(s => s.id !== id))
    try {
      await fetch(`${apiBase}/memory/skill/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      showToast('Skill removed')
    } catch {
      showToast('Error deleting skill', 'error')
    }
  }

  const filteredMemories = memories.filter(
    m =>
      m.key.toLowerCase().includes(search.toLowerCase()) ||
      m.value.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="view-container">
      {/* View Header */}
      <div className="view-header">
        <div>
          <h1 className="view-title">Memory & Profile Context</h1>
          <p className="view-subtitle">
            Long-term user profile knowledge and learned facts stored across all chat sessions.
          </p>
        </div>
        <div className="view-header-actions">
          <button className="view-btn-secondary" onClick={onBackToChat}>
            Back to Chat
          </button>
        </div>
      </div>

      {message && <div className={`view-alert ${message.type}`}>{message.text}</div>}

      {/* Memory Architecture Info */}
      <div className="memory-info-banner">
        <div className="memory-info-item">
          <span className="info-icon">🧠</span>
          <div>
            <strong>Long-Term Memory</strong>
            <p>Persistent facts extracted by Memory Agent into PostgreSQL profile JSONB.</p>
          </div>
        </div>
        <div className="memory-info-item">
          <span className="info-icon">💬</span>
          <div>
            <strong>Short-Term Memory</strong>
            <p>Sliding window of recent 10-20 messages passed during conversation turns.</p>
          </div>
        </div>
        <div className="memory-info-item">
          <span className="info-icon">⚡</span>
          <div>
            <strong>Auto-Learning</strong>
            <p>When you tell Mann facts about yourself, it automatically updates your profile.</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="view-tabs">
        <button
          className={`view-tab-btn ${activeTab === 'facts' ? 'active' : ''}`}
          onClick={() => setActiveTab('facts')}
        >
          Profile Facts ({memories.length})
        </button>
        <button
          className={`view-tab-btn ${activeTab === 'skills' ? 'active' : ''}`}
          onClick={() => setActiveTab('skills')}
        >
          Learned Skills ({skills.length})
        </button>
      </div>

      {activeTab === 'facts' ? (
        <>
          {/* Add Fact Inline Form */}
          <div className="memory-add-card">
            <h3 className="section-title">Add Profile Fact Manually</h3>
            <form onSubmit={handleAddFact} className="memory-inline-form">
              <input
                type="text"
                placeholder="Key (e.g., job_title, favorite_food, tech_stack)"
                value={factKey}
                onChange={e => setFactKey(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Value (e.g., Full Stack Engineer, Pasta, React & Node)"
                value={factValue}
                onChange={e => setFactValue(e.target.value)}
                required
              />
              <button type="submit" className="view-btn-primary" disabled={savingFact}>
                {savingFact ? 'Saving...' : 'Add Fact'}
              </button>
            </form>
          </div>

          {/* Search bar */}
          <div className="memory-controls">
            <input
              type="text"
              placeholder="Search facts by key or value..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="view-search-input"
            />
            <button className="view-btn-secondary" onClick={loadMemories} title="Refresh">
              ↻ Refresh
            </button>
          </div>

          {/* Memory List */}
          {loading ? (
            <div className="view-loading">Loading memory facts...</div>
          ) : filteredMemories.length === 0 ? (
            <div className="view-empty-box">
              <p>No memory facts match your search or profile is empty.</p>
            </div>
          ) : (
            <div className="memory-grid">
              {filteredMemories.map(item => (
                <div key={item.key} className="memory-card">
                  <div className="memory-card-header">
                    <span className="memory-key">{item.key}</span>
                    <button
                      className="memory-delete-btn"
                      onClick={() => handleDeleteFact(item.key)}
                      title="Delete this fact"
                    >
                      &times;
                    </button>
                  </div>
                  <div className="memory-value">{item.value}</div>
                  <div className="memory-footer">
                    <span className="memory-type-badge">{item.type || 'fact'}</span>
                    <span className="memory-source">Postgres Profile</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Skills Tab */}
          <div className="view-section-header" style={{ marginBottom: 16 }}>
            <h2 className="view-section-title">Custom Assistant Skills</h2>
            <button className="view-btn-primary" onClick={() => setShowSkillModal(true)}>
              + Add Skill
            </button>
          </div>

          {skills.length === 0 ? (
            <div className="view-empty-box">
              <p>No custom skills saved yet. You can teach Mann AI specialized execution rules.</p>
              <button className="view-btn-sm" onClick={() => setShowSkillModal(true)}>
                Add Skill
              </button>
            </div>
          ) : (
            <div className="memory-grid">
              {skills.map(s => (
                <div key={s.id} className="memory-card">
                  <div className="memory-card-header">
                    <span className="memory-key">{s.name}</span>
                    <button
                      className="memory-delete-btn"
                      onClick={() => handleDeleteSkill(s.id)}
                      title="Delete skill"
                    >
                      &times;
                    </button>
                  </div>
                  {s.description && <div className="memory-desc">{s.description}</div>}
                  {s.code && (
                    <pre className="memory-code-preview">
                      <code>{s.code}</code>
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add Skill Modal */}
          {showSkillModal && (
            <div className="view-modal-backdrop" onClick={() => setShowSkillModal(false)}>
              <div className="view-modal" onClick={e => e.stopPropagation()}>
                <div className="view-modal-header">
                  <h3>Add Learned Skill</h3>
                  <button className="view-modal-close" onClick={() => setShowSkillModal(false)}>
                    &times;
                  </button>
                </div>
                <form onSubmit={handleCreateSkill} className="view-form">
                  <div className="view-form-group">
                    <label>Skill Name *</label>
                    <input
                      type="text"
                      placeholder="e.g., Code Style Rules, Markdown Formatter"
                      value={skillName}
                      onChange={e => setSkillName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="view-form-group">
                    <label>Description</label>
                    <input
                      type="text"
                      placeholder="What this skill enables"
                      value={skillDesc}
                      onChange={e => setSkillDesc(e.target.value)}
                    />
                  </div>
                  <div className="view-form-group">
                    <label>Instructions / Implementation Code</label>
                    <textarea
                      rows={5}
                      placeholder="Special instructions or code template..."
                      value={skillCode}
                      onChange={e => setSkillCode(e.target.value)}
                    />
                  </div>
                  <div className="view-modal-actions">
                    <button type="button" className="view-btn-secondary" onClick={() => setShowSkillModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="view-btn-primary" disabled={savingSkill}>
                      {savingSkill ? 'Saving...' : 'Save Skill'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
