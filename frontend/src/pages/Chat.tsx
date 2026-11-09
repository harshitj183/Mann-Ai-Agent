import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import MannLogo from '../components/MannLogo'

interface Message {
  id: number
  role: 'user' | 'ai'
  content: string
}

interface Conversation {
  id: number
  title: string
  messages: Message[]
  updatedAt: string
}

const INITIAL: Conversation[] = [
  {
    id: 1,
    title: 'What are LLMs?',
    updatedAt: 'Today',
    messages: [
      { id: 1, role: 'ai', content: 'Hello! How can I assist you today?' },
      { id: 2, role: 'user', content: 'What are LLMs?' },
      { id: 3, role: 'ai', content: 'Large Language Models (LLMs) are deep learning models trained on massive text datasets. They can understand context, generate coherent text, answer questions, write code, and much more. Examples include GPT-4, Claude, and Gemini.' },
    ],
  },
  {
    id: 2,
    title: 'Help with async/await',
    updatedAt: 'Today',
    messages: [
      { id: 1, role: 'ai', content: 'Hi! Ready to help with your code.' },
      { id: 2, role: 'user', content: 'Help with async/await' },
      { id: 3, role: 'ai', content: 'Sure! `async/await` is syntactic sugar over Promises. An `async` function always returns a Promise, and `await` pauses execution until the Promise resolves. Need a specific example?' },
    ],
  },
  {
    id: 3,
    title: 'Plan a microservices app',
    updatedAt: 'Yesterday',
    messages: [
      { id: 1, role: 'ai', content: "Let's design your system!" },
      { id: 2, role: 'user', content: 'Plan a microservices app' },
      { id: 3, role: 'ai', content: 'For a microservices architecture, start with: 1) API Gateway, 2) Auth Service, 3) Core domain services. Use an event bus for async communication and keep each service independently deployable.' },
    ],
  },
  {
    id: 4,
    title: 'Explain React hooks',
    updatedAt: 'Yesterday',
    messages: [
      { id: 1, role: 'ai', content: 'Happy to explain React hooks!' },
    ],
  },
  {
    id: 5,
    title: 'SQL vs NoSQL',
    updatedAt: '2 days ago',
    messages: [
      { id: 1, role: 'ai', content: "Great topic. What's your use case?" },
    ],
  },
]

const AI_REPLIES = [
  "That's a great question. Let me think through this step by step and give you a thorough answer.",
  "Based on your input, here's what I'd recommend. There are a few key things to consider here.",
  "Interesting! Here's my analysis. The core idea is straightforward once you break it down.",
  "I can definitely help with that. Let me walk you through it clearly.",
  "Good point. The short answer is: it depends on the context. Here's why...",
]

// How many px from each edge triggers auto open/close
const EDGE_THRESHOLD = 40

export default function Chat() {
  const { user, logout } = useAuth()
  const { mode, resolved, setMode } = useTheme()
  const navigate = useNavigate()
  const [convos, setConvos] = useState(INITIAL)
  const [activeId, setActiveId] = useState<number | null>(1)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)

  // Tracks if user manually locked a sidebar (disables auto-toggle for that side)
  const leftLocked  = useRef(false)
  const rightLocked = useRef(false)

  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const active = convos.find(c => c.id === activeId) ?? null

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [active?.messages, isTyping])

  // ── Cursor proximity: auto open/close when not manually locked ──
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current)
      hoverTimer.current = setTimeout(() => {
        const w = window.innerWidth

        if (!leftLocked.current) {
          if (e.clientX <= EDGE_THRESHOLD)      setLeftOpen(true)
          else if (e.clientX > 280)             setLeftOpen(false)
        }

        if (!rightLocked.current) {
          if (e.clientX >= w - EDGE_THRESHOLD)  setRightOpen(true)
          else if (e.clientX < w - 260)         setRightOpen(false)
        }
      }, 80)
    }

    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('mousemove', onMove)
      if (hoverTimer.current) clearTimeout(hoverTimer.current)
    }
  }, [])

  // ── Manual handlers ──
  // Manual open → lock that side (cursor won't auto-close it)
  const manualOpenLeft  = useCallback(() => { leftLocked.current = true;  setLeftOpen(true)  }, [])
  const manualOpenRight = useCallback(() => { rightLocked.current = true; setRightOpen(true) }, [])

  // Manual close → unlock that side (cursor can auto-open again)
  const manualCloseLeft  = useCallback(() => { leftLocked.current = false;  setLeftOpen(false)  }, [])
  const manualCloseRight = useCallback(() => { rightLocked.current = false; setRightOpen(false) }, [])

  // ── Chat logic ──
  const send = () => {
    if (!input.trim() || isTyping) return
    let targetId = activeId
    if (!targetId) {
      const id = Date.now()
      const newConvo: Conversation = {
        id, title: input.trim().slice(0, 40),
        updatedAt: 'Just now',
        messages: [{ id: 1, role: 'ai', content: 'Hello! How can I help you?' }],
      }
      setConvos(p => [newConvo, ...p])
      setActiveId(id)
      targetId = id
    }
    const userMsg: Message = { id: Date.now(), role: 'user', content: input.trim() }
    setConvos(p => p.map(c =>
      c.id === targetId ? { ...c, messages: [...c.messages, userMsg], updatedAt: 'Just now' } : c
    ))
    setInput('')
    setIsTyping(true)
    setTimeout(() => {
      const reply = AI_REPLIES[Math.floor(Math.random() * AI_REPLIES.length)]
      const aiMsg: Message = { id: Date.now() + 1, role: 'ai', content: reply }
      setConvos(p => p.map(c =>
        c.id === targetId ? { ...c, messages: [...c.messages, aiMsg] } : c
      ))
      setIsTyping(false)
    }, 900 + Math.random() * 700)
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const newChat = () => { setActiveId(null); setInput('') }

  const todayConvos  = convos.filter(c => c.updatedAt === 'Today'    || c.updatedAt === 'Just now')
  const olderConvos  = convos.filter(c => c.updatedAt !== 'Today'    && c.updatedAt !== 'Just now')

  return (
    <div className="gpt-root">

      {/* ── LEFT SIDEBAR ── */}
      <aside className={`gpt-left ${leftOpen ? 'open' : 'closed'}`}>
        {leftOpen ? (
          <>
            <div className="gpt-left-top">
              <MannLogo size={28} showText={true} textColor="var(--sidebar-text-h)" />
              {/* Manual close → unlocks auto mode */}
              <button className="gpt-icon-btn" onClick={manualCloseLeft} title="Close sidebar">
                <IconSidebarClose />
              </button>
            </div>

            <button className="gpt-new-chat-btn" onClick={newChat}>
              <IconPlus /> New chat
            </button>

            <nav className="gpt-nav">
              <button className="gpt-nav-item active"><IconChat /> Chat</button>
              <button className="gpt-nav-item"><IconAgents /> Agents</button>
              <button className="gpt-nav-item"><IconMemory /> Memory</button>
              <button className="gpt-nav-item"><IconTools /> Tools</button>
            </nav>

            <div className="gpt-left-spacer" />

            <div className="gpt-left-bottom">
              <button className="gpt-nav-item"><IconSettings /> Settings</button>

              {/* Theme switcher */}
              <div className="theme-switcher">
                <button
                  className={`theme-btn ${mode === 'light' ? 'active' : ''}`}
                  onClick={() => setMode('light')}
                  title="Light"
                >
                  <IconSun />
                </button>
                <button
                  className={`theme-btn ${mode === 'system' ? 'active' : ''}`}
                  onClick={() => setMode('system')}
                  title="System"
                >
                  <IconSystem />
                </button>
                <button
                  className={`theme-btn ${mode === 'dark' ? 'active' : ''}`}
                  onClick={() => setMode('dark')}
                  title="Dark"
                >
                  <IconMoon />
                </button>
              </div>
              <div className="gpt-user-row">
                <div className="gpt-user-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
                <div className="gpt-user-info">
                  <div className="gpt-user-name">{user?.name}</div>
                  <div className="gpt-user-email">{user?.email}</div>
                </div>
                <button className="gpt-icon-btn" onClick={() => { logout(); navigate('/login') }} title="Logout">
                  <IconLogout />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="gpt-left-collapsed">
            {/* Manual open → locks to manual mode */}
            <button className="gpt-icon-btn" onClick={manualOpenLeft} title="Open sidebar">
              <IconSidebarOpen />
            </button>
            <button className="gpt-icon-btn" onClick={newChat} title="New chat">
              <IconPlus />
            </button>
          </div>
        )}
      </aside>

      {/* ── CENTER ── */}
      <main className="gpt-center">
        {active ? (
          <>
            <div className="gpt-messages">
              {active.messages.map(msg => (
                <div key={msg.id} className={`gpt-msg ${msg.role}`}>
                  {msg.role === 'ai' && <div className="gpt-msg-avatar ai">M</div>}
                  <div className={`gpt-msg-content ${msg.role}`}>{msg.content}</div>
                  {msg.role === 'user' && (
                    <div className="gpt-msg-avatar user">{user?.name?.charAt(0).toUpperCase()}</div>
                  )}
                </div>
              ))}
              {isTyping && (
                <div className="gpt-msg ai">
                  <div className="gpt-msg-avatar ai">M</div>
                  <div className="gpt-msg-content ai gpt-typing">
                    <span /><span /><span />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="gpt-input-wrap">
              <div className="gpt-input-box">
                <button className="gpt-input-icon-btn" title="Attach"><IconAttach /></button>
                <textarea rows={1} value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={onKey}
                  placeholder="Message Mann AI"
                />
                <button
                  className={`gpt-send-btn ${input.trim() && !isTyping ? 'on' : ''}`}
                  onClick={send} disabled={!input.trim() || isTyping}
                >
                  <IconSend />
                </button>
              </div>
              <p className="gpt-hint">Press Enter to send · Shift+Enter for new line</p>
            </div>
          </>
        ) : (
          <div className="gpt-empty">
            <div className="gpt-empty-icon">
              <MannLogo size={40} showText={false} />
            </div>
            <h2>How can I help you today?</h2>
            <p>Start a new conversation or pick one from the history.</p>
            <div className="gpt-input-wrap" style={{ width: '100%', maxWidth: 640 }}>
              <div className="gpt-input-box">
                <button className="gpt-input-icon-btn"><IconAttach /></button>
                <textarea rows={1} value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={onKey}
                  placeholder="Message Mann AI"
                />
                <button
                  className={`gpt-send-btn ${input.trim() ? 'on' : ''}`}
                  onClick={send} disabled={!input.trim() || isTyping}
                >
                  <IconSend />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── RIGHT SIDEBAR — history ── */}
      <aside className={`gpt-right ${rightOpen ? 'open' : 'closed'}`}>
        {rightOpen ? (
          <>
            <div className="gpt-right-top">
              <span className="gpt-right-title">History</span>
              {/* Manual close → unlocks auto mode */}
              <button className="gpt-icon-btn" onClick={manualCloseRight} title="Close">
                <IconClose />
              </button>
            </div>

            <div className="gpt-history-list">
              {todayConvos.length > 0 && (
                <>
                  <div className="gpt-history-group-label">Today</div>
                  {todayConvos.map(c => (
                    <button key={c.id}
                      className={`gpt-history-item ${c.id === activeId ? 'active' : ''}`}
                      onClick={() => setActiveId(c.id)}
                    >
                      <div className="gpt-history-item-title">{c.title}</div>
                    </button>
                  ))}
                </>
              )}
              {olderConvos.length > 0 && (
                <>
                  <div className="gpt-history-group-label">Earlier</div>
                  {olderConvos.map(c => (
                    <button key={c.id}
                      className={`gpt-history-item ${c.id === activeId ? 'active' : ''}`}
                      onClick={() => setActiveId(c.id)}
                    >
                      <div className="gpt-history-item-title">{c.title}</div>
                      <div className="gpt-history-item-time">{c.updatedAt}</div>
                    </button>
                  ))}
                </>
              )}
            </div>
          </>
        ) : (
          <div className="gpt-right-collapsed">
            {/* Manual open → locks to manual mode */}
            <button className="gpt-icon-btn" onClick={manualOpenRight} title="Open history">
              <IconHistory />
            </button>
          </div>
        )}
      </aside>

      <style>{`
        @keyframes bounce {
          0%,100% { transform: translateY(0); opacity:.3; }
          50%      { transform: translateY(-4px); opacity:1; }
        }
      `}</style>
    </div>
  )
}

/* ── Icons ── */
const IconSidebarClose = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h7M2 12h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
const IconSidebarOpen  = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
const IconPlus    = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
const IconChat    = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 3.5A1.5 1.5 0 013.5 2h8A1.5 1.5 0 0113 3.5v6A1.5 1.5 0 0111.5 11H9l-1.5 2L6 11H3.5A1.5 1.5 0 012 9.5v-6z" stroke="currentColor" strokeWidth="1.3"/></svg>
const IconAgents  = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M2.5 13c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
const IconMemory  = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><ellipse cx="7.5" cy="4.5" rx="5" ry="2" stroke="currentColor" strokeWidth="1.3"/><path d="M2.5 4.5v6c0 1.105 2.239 2 5 2s5-.895 5-2v-6" stroke="currentColor" strokeWidth="1.3"/></svg>
const IconTools   = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M9.5 2.5a3 3 0 11-4 4L2 10a1.414 1.414 0 002 2l3.5-3.5a3 3 0 014-4z" stroke="currentColor" strokeWidth="1.3"/></svg>
const IconSettings = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.3"/><path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M2.929 2.929l1.06 1.06M11.01 11.01l1.06 1.06M2.929 12.07l1.06-1.06M11.01 3.99l1.06-1.06" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
const IconLogout  = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 7H1M9 7L6.5 4.5M9 7L6.5 9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 3V2.5A1.5 1.5 0 016.5 1h5A1.5 1.5 0 0113 2.5v9A1.5 1.5 0 0111.5 13h-5A1.5 1.5 0 015 11.5V11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
const IconAttach  = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13 7.5L7.5 13a4 4 0 01-5.657-5.657l5.5-5.5a2.5 2.5 0 013.535 3.535L5.4 11.35a1 1 0 01-1.414-1.414L9.5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
const IconSend    = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M12 2L2 5.5l3.5 1.5M12 2L9.5 12 6.5 7M12 2L5.5 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
const IconClose   = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
const IconHistory = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.3"/><path d="M7.5 4.5v3l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
const IconSun     = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.636 2.636l1.06 1.06M10.304 10.304l1.06 1.06M2.636 11.364l1.06-1.06M10.304 3.696l1.06-1.06" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
const IconMoon    = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M12 8.5A5.5 5.5 0 015.5 2a5.5 5.5 0 100 10A5.5 5.5 0 0012 8.5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
const IconSystem  = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M5 12h4M7 10v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>