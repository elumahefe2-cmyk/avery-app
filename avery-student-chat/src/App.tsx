import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type View = 'login' | 'signup' | 'chat'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

type Conversation = {
  id: string
  title: string
  preview: string
  updatedAt?: string
}

type HistoryApiItem = {
  id?: string
  title?: string
  preview?: string
  updatedAt?: string
  lastMessage?: string
  message?: string
  name?: string
}

const SEND_WEBHOOK =
  'https://n8n.srv992844.hstgr.cloud/webhook/6bf7d352-c215-45e7-9f86-48501286eaaf'
const HISTORY_WEBHOOK =
  'https://n8n.srv992844.hstgr.cloud/webhook/7c20958b-2f6e-4c02-bd31-40cb19349179'
const USER_ID = 'user123'

const starterConversations: Conversation[] = [
  {
    id: 'welcome',
    title: 'Welcome to Avery',
    preview: 'Ask about assignments, exam prep, or campus life.',
    updatedAt: new Date().toISOString(),
  },
]

const welcomeMessage: ChatMessage = {
  id: 'welcome-assistant',
  role: 'assistant',
  content:
    "Hey — I’m Avery. I can help with coursework, study plans, deadlines, research summaries, and student life questions. What are you working on?",
  timestamp: new Date().toISOString(),
}

function App() {
  const [view, setView] = useState<View>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isAuthLoading, setIsAuthLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [input, setInput] = useState('')
  const [chatError, setChatError] = useState('')
  const [historyError, setHistoryError] = useState('')
  const [conversations, setConversations] =
    useState<Conversation[]>(starterConversations)
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage])
  const [activeConversationId, setActiveConversationId] = useState('welcome')

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(HISTORY_WEBHOOK)

        if (!response.ok) {
          throw new Error(`History request failed with ${response.status}`)
        }

        const payload = await response.json()
        const rawItems = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.conversations)
            ? payload.conversations
            : Array.isArray(payload?.data)
              ? payload.data
              : []

        if (!rawItems.length) {
          return
        }

        const mapped = rawItems.map((item: HistoryApiItem, index: number) => ({
          id: item.id ?? `history-${index + 1}`,
          title: item.title ?? item.name ?? `Conversation ${index + 1}`,
          preview:
            item.preview ??
            item.lastMessage ??
            item.message ??
            'Recent conversation',
          updatedAt: item.updatedAt,
        }))

        setConversations(mapped)
        setActiveConversationId(mapped[0]?.id ?? 'welcome')
      } catch (error) {
        console.error(error)
        setHistoryError('Could not load previous conversations.')
      }
    }

    void fetchHistory()
  }, [])

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId),
    [activeConversationId, conversations],
  )

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsAuthLoading(true)

    await new Promise((resolve) => setTimeout(resolve, 600))

    setIsAuthLoading(false)
    setView('chat')
  }

  const createConversationTitle = (message: string) => {
    const trimmed = message.trim()
    if (!trimmed) return 'New conversation'
    return trimmed.length > 34 ? `${trimmed.slice(0, 34)}…` : trimmed
  }

  const extractAssistantText = (payload: unknown) => {
    if (typeof payload === 'string') return payload
    if (Array.isArray(payload)) {
      const firstText = payload.find((item) => typeof item === 'string')
      if (firstText) return firstText
      const objectText = payload.find(
        (item) => item && typeof item === 'object' && 'message' in item,
      ) as { message?: string } | undefined
      if (objectText?.message) return objectText.message
    }
    if (payload && typeof payload === 'object') {
      const candidate = payload as {
        response?: string
        message?: string
        reply?: string
        output?: string
        text?: string
        data?: { response?: string; message?: string; reply?: string; text?: string }
      }

      return (
        candidate.response ??
        candidate.message ??
        candidate.reply ??
        candidate.output ??
        candidate.text ??
        candidate.data?.response ??
        candidate.data?.message ??
        candidate.data?.reply ??
        candidate.data?.text ??
        ''
      )
    }

    return ''
  }

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = input.trim()

    if (!trimmed || isSending) return

    setChatError('')
    setIsSending(true)

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    }

    setMessages((current) => [...current, userMessage])
    setInput('')

    setConversations((current) => {
      const existing = current.find((conversation) => conversation.id === activeConversationId)
      const updatedConversation: Conversation = {
        id: existing?.id ?? crypto.randomUUID(),
        title: existing?.title ?? createConversationTitle(trimmed),
        preview: trimmed,
        updatedAt: new Date().toISOString(),
      }

      const withoutCurrent = current.filter(
        (conversation) => conversation.id !== updatedConversation.id,
      )

      return [updatedConversation, ...withoutCurrent]
    })

    try {
      const response = await fetch(SEND_WEBHOOK, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: USER_ID,
          message: trimmed,
        }),
      })

      if (!response.ok) {
        throw new Error(`Message request failed with ${response.status}`)
      }

      const payload = await response.json()
      const assistantText = extractAssistantText(payload) ||
        'I got your message, but the response payload was empty.'

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: assistantText,
        timestamp: new Date().toISOString(),
      }

      setMessages((current) => [...current, assistantMessage])
    } catch (error) {
      console.error(error)
      setChatError('Something went wrong while contacting Avery. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  const handleStartNewChat = () => {
    const id = crypto.randomUUID()
    setActiveConversationId(id)
    setMessages([welcomeMessage])
    setConversations((current) => [
      {
        id,
        title: 'New conversation',
        preview: 'Start chatting with Avery',
        updatedAt: new Date().toISOString(),
      },
      ...current,
    ])
  }

  if (view !== 'chat') {
    return (
      <div className="auth-shell">
        <div className="aurora aurora-left" />
        <div className="aurora aurora-right" />
        <div className="auth-card">
          <div className="brand-lockup">
            <div className="brand-mark">A</div>
            <div>
              <p className="eyebrow">AI Chat for University Students</p>
              <h1>Avery</h1>
            </div>
          </div>

          <div className="auth-copy">
            <h2>{view === 'login' ? 'Welcome back' : 'Create your account'}</h2>
            <p>
              {view === 'login'
                ? 'Jump back into your study chats, revision plans, and campus questions.'
                : 'Set up Avery in seconds and start chatting like you already have a personal study copilot.'}
            </p>
          </div>

          <form className="auth-form" onSubmit={handleAuthSubmit}>
            {view === 'signup' && (
              <label>
                Full name
                <input
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Taylor Morgan"
                  required
                />
              </label>
            )}

            <label>
              University email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@university.edu"
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
              />
            </label>

            <button className="primary-button" type="submit" disabled={isAuthLoading}>
              {isAuthLoading
                ? 'Loading...'
                : view === 'login'
                  ? 'Log in'
                  : 'Create account'}
            </button>
          </form>

          <p className="auth-toggle">
            {view === 'login' ? 'Need an account?' : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => setView(view === 'login' ? 'signup' : 'login')}
            >
              {view === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand-lockup brand-lockup-small">
            <div className="brand-mark">A</div>
            <div>
              <p className="eyebrow">Student AI Assistant</p>
              <h2>Avery</h2>
            </div>
          </div>
          <button className="ghost-button" type="button" onClick={handleStartNewChat}>
            + New chat
          </button>
        </div>

        <div className="conversation-list">
          <div className="conversation-list-heading">
            <span>Previous conversations</span>
            {historyError && <span className="status-text error-text">{historyError}</span>}
          </div>

          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              className={`conversation-item ${
                conversation.id === activeConversationId ? 'active' : ''
              }`}
              onClick={() => setActiveConversationId(conversation.id)}
            >
              <span className="conversation-title">{conversation.title}</span>
              <span className="conversation-preview">{conversation.preview}</span>
            </button>
          ))}
        </div>
      </aside>

      <main className="chat-panel">
        <header className="chat-header">
          <div>
            <p className="eyebrow">Always-on study support</p>
            <h1>{activeConversation?.title ?? 'Avery Chat'}</h1>
          </div>
          <div className="presence-pill">
            <span className="presence-dot" />
            Online
          </div>
        </header>

        <section className="messages">
          {messages.map((message) => (
            <article
              key={message.id}
              className={`message-row ${message.role === 'user' ? 'user' : 'assistant'}`}
            >
              <div className="message-bubble">
                <span className="message-role">
                  {message.role === 'user' ? 'You' : 'Avery'}
                </span>
                <p>{message.content}</p>
              </div>
            </article>
          ))}
        </section>

        <footer className="chat-footer">
          {chatError && <p className="status-text error-text">{chatError}</p>}
          <form className="composer" onSubmit={handleSendMessage}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask Avery about an assignment, revision plan, or student admin task..."
            />
            <button className="primary-button" type="submit" disabled={isSending || !input.trim()}>
              {isSending ? 'Sending...' : 'Send'}
            </button>
          </form>
        </footer>
      </main>
    </div>
  )
}

export default App
