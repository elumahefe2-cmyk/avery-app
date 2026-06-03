import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
  useUser,
} from '@clerk/clerk-react'
import { uploadAttachmentToSupabase } from './supabase'
import './App.css'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  isTyping?: boolean
  attachments?: ChatAttachment[]
}

type Conversation = {
  id: string
  title: string
  updatedAt?: string
  messages?: ChatMessage[]
}

type HistoryApiItem = {
  id?: string
  sessionId?: string
  title?: string
  preview?: string
  updatedAt?: string
  lastMessage?: string
  message?: string
  name?: string
  messages?: Array<{
    id?: string
    role?: 'user' | 'assistant'
    content?: string
    message?: string
    text?: string
    timestamp?: string
    createdAt?: string
  }>
}

type ChatAttachment = {
  id: string
  name: string
  size: number
  type: string
  kind: 'image' | 'file'
  extension: string
}

type ComposerAttachment = ChatAttachment & {
  file: File
  previewUrl?: string
}

const SEND_WEBHOOK =
  'https://n8n.srv1660721.hstgr.cloud/webhook/weorsl33'
const HISTORY_WEBHOOK =
  'https://n8n.srv1660721.hstgr.cloud/webhook/n8nweb22'
const TITLE_WEBHOOK =
  'https://n8n.srv992844.hstgr.cloud/webhook/a0045b60-e856-479c-89ac-c4f12aeb9767'
const TYPING_MESSAGE_ID = 'avery-typing-indicator'
const GUEST_STORAGE_KEY = 'avery-guest-message-count'
const GUEST_LIMIT = 3
const ACTIVE_CONVERSATION_STORAGE_KEY = 'avery-active-conversation-id'
const DRAFT_CONVERSATIONS_STORAGE_KEY = 'avery-draft-conversations'
const SIDEBAR_WIDTH_STORAGE_KEY = 'avery-sidebar-width'
const SIDEBAR_COLLAPSED_STORAGE_KEY = 'avery-sidebar-collapsed'
const SIDEBAR_MIN_WIDTH = 180
const SIDEBAR_MAX_WIDTH = 420
const SIDEBAR_DEFAULT_WIDTH = 228
const SIDEBAR_COLLAPSED_WIDTH = 0
const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
const FILE_MIME_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])
const ALLOWED_ATTACHMENT_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'txt', 'docx'])
const ATTACHMENT_ACCEPT = '.jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.docx,image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

function getStoredGuestMessageCount() {
  if (typeof window === 'undefined') return 0

  const storedCount = Number(window.localStorage.getItem(GUEST_STORAGE_KEY) ?? '0')
  return Number.isFinite(storedCount) ? storedCount : 0
}

function getStoredActiveConversationId() {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(ACTIVE_CONVERSATION_STORAGE_KEY)
}

function getStoredDraftState(activeConversationId: string | null) {
  if (typeof window === 'undefined') {
    return {
      conversations: [] as Conversation[],
      messages: [] as ChatMessage[],
    }
  }

  const savedDrafts = window.localStorage.getItem(DRAFT_CONVERSATIONS_STORAGE_KEY)
  if (!savedDrafts) {
    return {
      conversations: [] as Conversation[],
      messages: [] as ChatMessage[],
    }
  }

  try {
    const conversations = JSON.parse(savedDrafts) as Conversation[]
    const activeDraft = conversations.find((conversation: Conversation) => conversation.id === activeConversationId)

    return {
      conversations,
      messages: activeDraft?.messages ?? [],
    }
  } catch (error) {
    console.error('Failed to parse saved draft conversations', error)
    return {
      conversations: [] as Conversation[],
      messages: [] as ChatMessage[],
    }
  }
}

function getStoredSidebarWidth() {
  if (typeof window === 'undefined') return SIDEBAR_DEFAULT_WIDTH

  const savedSidebarWidth = Number(window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY) ?? SIDEBAR_DEFAULT_WIDTH)
  return Number.isFinite(savedSidebarWidth)
    ? clampSidebarWidth(savedSidebarWidth)
    : SIDEBAR_DEFAULT_WIDTH
}

function getStoredSidebarCollapsed() {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true'
}

function getGreeting(name: string) {
  const hour = new Date().getHours()

  if (hour >= 5 && hour < 12) return `Good morning, ${name}`
  if (hour >= 12 && hour < 17) return `Good afternoon, ${name}`
  if (hour >= 17 && hour < 21) return `Good evening, ${name}`
  return `Good night, ${name}`
}

function clampSidebarWidth(width: number) {
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, width))
}

function AveryLogo({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`avery-logo ${className}`.trim()}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M28 14C34.2 14 38 17.4 38 23.3C38 27.7 35.7 32.7 31.7 38.1L28.2 42.8H42.5C45.4 42.8 47 44.1 47 46.6C47 48 46.4 49.4 45.1 50.9C43.9 52.3 43.3 54.2 43.3 56.5V58C43.3 61.9 45 64 48.4 64"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SidebarToggleIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <span className={`sidebar-toggle-icon ${collapsed ? 'collapsed' : ''}`} aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  )
}

function AuthActions() {
  return (
    <div className="top-auth-actions">
      <SignedOut>
        <SignInButton mode="modal" forceRedirectUrl="/" signUpForceRedirectUrl="/">
          <button className="auth-ghost-button" type="button">
            Log In
          </button>
        </SignInButton>
        <SignUpButton mode="modal" forceRedirectUrl="/" signInForceRedirectUrl="/">
          <button className="auth-solid-button" type="button">
            Sign Up
          </button>
        </SignUpButton>
      </SignedOut>
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </div>
  )
}

function GuestLimitModal() {
  return (
    <div className="guest-limit-overlay">
      <div className="guest-limit-modal" role="dialog" aria-modal="true">
        <h3>You’ve reached your free limit.</h3>
        <p>Sign up to keep chatting with Avery for free.</p>
        <div className="guest-limit-actions">
          <SignUpButton mode="modal" forceRedirectUrl="/" signInForceRedirectUrl="/">
            <button className="auth-solid-button" type="button">
              Sign Up
            </button>
          </SignUpButton>
          <SignInButton mode="modal" forceRedirectUrl="/" signUpForceRedirectUrl="/">
            <button className="auth-ghost-button" type="button">
              Log In
            </button>
          </SignInButton>
        </div>
      </div>
    </div>
  )
}

function normalizeMessages(rawMessages: HistoryApiItem['messages'] = []): ChatMessage[] {
  return rawMessages.map((message, index) => ({
    id: message.id ?? `msg-${index + 1}`,
    role: message.role === 'user' ? 'user' : 'assistant',
    content: message.content ?? message.message ?? message.text ?? '',
    timestamp: message.timestamp ?? message.createdAt ?? new Date().toISOString(),
  }))
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function getFileExtension(name: string) {
  const segments = name.toLowerCase().split('.')
  return segments.length > 1 ? segments.at(-1) ?? '' : ''
}

function isAllowedAttachment(file: File) {
  const extension = getFileExtension(file.name)
  return ALLOWED_ATTACHMENT_EXTENSIONS.has(extension) ||
    IMAGE_MIME_TYPES.has(file.type) ||
    FILE_MIME_TYPES.has(file.type)
}

function getAttachmentKind(file: Pick<File, 'type' | 'name'>): 'image' | 'file' {
  if (IMAGE_MIME_TYPES.has(file.type)) return 'image'

  const extension = getFileExtension(file.name)
  return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension) ? 'image' : 'file'
}

function normalizeAttachmentType(file: Pick<File, 'type' | 'name'>) {
  if (file.type) return file.type

  const extension = getFileExtension(file.name)

  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'gif':
      return 'image/gif'
    case 'webp':
      return 'image/webp'
    case 'pdf':
      return 'application/pdf'
    case 'txt':
      return 'text/plain'
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    default:
      return 'application/octet-stream'
  }
}

function getAttachmentTypeLabel(attachment: Pick<ChatAttachment, 'type' | 'extension'>) {
  if (attachment.extension) return attachment.extension.toUpperCase()
  if (!attachment.type) return 'FILE'

  const subtype = attachment.type.split('/')[1] ?? 'file'
  return subtype.replace('vnd.openxmlformats-officedocument.wordprocessingml.document', 'DOCX').toUpperCase()
}

function revokeAttachmentPreview(attachment: ComposerAttachment | null) {
  if (attachment?.previewUrl?.startsWith('blob:')) {
    URL.revokeObjectURL(attachment.previewUrl)
  }
}

function FileTypeIcon({ attachment }: { attachment: Pick<ChatAttachment, 'kind' | 'extension' | 'type'> }) {
  const label = attachment.kind === 'image' ? 'IMG' : getAttachmentTypeLabel(attachment)

  return (
    <span className={`attachment-icon ${attachment.kind === 'image' ? 'attachment-icon-image' : 'attachment-icon-file'}`} aria-hidden="true">
      <span>{label}</span>
    </span>
  )
}

function AttachmentPreview({
  attachment,
  isUploading = false,
  uploadProgress = 0,
  onRemove,
}: {
  attachment: ComposerAttachment
  isUploading?: boolean
  uploadProgress?: number
  onRemove: () => void
}) {
  return (
    <div className="attachment-preview">
      {attachment.kind === 'image' && attachment.previewUrl ? (
        <img
          className="attachment-thumbnail"
          src={attachment.previewUrl}
          alt={attachment.name}
        />
      ) : (
        <div className="attachment-thumbnail attachment-thumbnail-file">
          <FileTypeIcon attachment={attachment} />
        </div>
      )}
      <div className="attachment-preview-meta">
        <div className="attachment-preview-line">
          <span className="attachment-name">{attachment.name}</span>
          <button
            className="attachment-remove"
            type="button"
            onClick={onRemove}
            disabled={isUploading}
            aria-label={`Remove ${attachment.name}`}
          >
            ×
          </button>
        </div>
        <div className="attachment-preview-line attachment-preview-details">
          <span className="attachment-size">{formatFileSize(attachment.size)}</span>
          <span className="attachment-type">{getAttachmentTypeLabel(attachment)}</span>
        </div>
        {isUploading ? (
          <div className="attachment-upload-progress" aria-live="polite">
            <div className="attachment-upload-progress-line">
              <span>Uploading file</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="attachment-upload-progress-track" aria-hidden="true">
              <span style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function AttachmentList({
  attachments,
  onRemove,
}: {
  attachments: ChatAttachment[]
  onRemove?: (attachmentId: string) => void
}) {
  return (
    <div className="attachment-list">
      {attachments.map((attachment) => (
        <div className="attachment-chip" key={attachment.id}>
          <FileTypeIcon attachment={attachment} />
          <div className="attachment-meta">
            <span className="attachment-name">{attachment.name}</span>
            <span className="attachment-size">
              {getAttachmentTypeLabel(attachment)} · {formatFileSize(attachment.size)}
            </span>
          </div>
          {onRemove ? (
            <button
              className="attachment-remove"
              type="button"
              onClick={() => onRemove(attachment.id)}
              aria-label={`Remove ${attachment.name}`}
            >
              ×
            </button>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function ChatMessageContent({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="user-message-content">
        {message.attachments?.length ? <AttachmentList attachments={message.attachments} /> : null}
        {message.content ? <p>{message.content}</p> : null}
      </div>
    )
  }

  return (
    <div className="markdown-body">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {message.content}
      </ReactMarkdown>
    </div>
  )
}

function ChatApp() {
  const { user, isSignedIn } = useUser()
  const initialActiveConversationId = useMemo(() => getStoredActiveConversationId(), [])
  const initialDraftState = useMemo(
    () => getStoredDraftState(initialActiveConversationId),
    [initialActiveConversationId],
  )
  const initialSidebarWidth = useMemo(() => getStoredSidebarWidth(), [])
  const initialSidebarCollapsed = useMemo(() => getStoredSidebarCollapsed(), [])
  const [isSending, setIsSending] = useState(false)
  const [input, setInput] = useState('')
  const [chatError, setChatError] = useState('')
  const [historyError, setHistoryError] = useState('')
  const [conversations, setConversations] = useState<Conversation[]>(() => initialDraftState.conversations)
  const [messages, setMessages] = useState<ChatMessage[]>(() => initialDraftState.messages)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(initialActiveConversationId)
  const [guestMessageCount, setGuestMessageCount] = useState(() => getStoredGuestMessageCount())
  const [sidebarWidth, setSidebarWidth] = useState(initialSidebarWidth)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(initialSidebarCollapsed)
  const [lastExpandedSidebarWidth, setLastExpandedSidebarWidth] = useState(initialSidebarWidth)
  const [selectedAttachment, setSelectedAttachment] = useState<ComposerAttachment | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const messagesScrollRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(GUEST_STORAGE_KEY, String(guestMessageCount))
  }, [guestMessageCount])

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (activeConversationId) {
      window.localStorage.setItem(ACTIVE_CONVERSATION_STORAGE_KEY, activeConversationId)
    } else {
      window.localStorage.removeItem(ACTIVE_CONVERSATION_STORAGE_KEY)
    }
  }, [activeConversationId])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const drafts = conversations.filter((conversation: Conversation) => conversation.messages?.length)
    window.localStorage.setItem(DRAFT_CONVERSATIONS_STORAGE_KEY, JSON.stringify(drafts))
  }, [conversations])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(sidebarWidth))
  }, [sidebarWidth])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(isSidebarCollapsed))
  }, [isSidebarCollapsed])

  useEffect(() => {
    if (!isSignedIn || typeof window === 'undefined') return

    window.localStorage.removeItem(GUEST_STORAGE_KEY)
  }, [isSignedIn])

  const loadConversation = useCallback(async (conversationId: string) => {
    const existingConversation = conversations.find((conversation: Conversation) => conversation.id === conversationId)
    if (existingConversation?.messages?.length) {
      setActiveConversationId(conversationId)
      setMessages(existingConversation.messages)
      return
    }

    if (!user?.id) {
      setActiveConversationId(conversationId)
      setMessages([])
      return
    }

    try {
      setHistoryError('')
      const response = await fetch(HISTORY_WEBHOOK, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          sessionId: conversationId,
        }),
      })

      if (!response.ok) {
        throw new Error(`Conversation fetch failed with ${response.status}`)
      }

      const payload = await response.json()
      const rawConversation = Array.isArray(payload)
        ? payload.find((item: HistoryApiItem) => (item.id ?? item.sessionId) === conversationId) ?? payload[0]
        : payload?.conversation ?? payload?.data ?? payload

      const fullMessages = normalizeMessages(rawConversation?.messages ?? [])

      setConversations((current) =>
        current.map((conversation: Conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                messages: fullMessages,
              }
            : conversation,
        ),
      )
      setActiveConversationId(conversationId)
      setMessages(fullMessages)
    } catch (error) {
      console.error(error)
      setHistoryError('Could not load that conversation.')
    }
  }, [conversations, user])

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user?.id) return

      try {
        setHistoryError('')

        const response = await fetch(HISTORY_WEBHOOK, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
          }),
        })

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
          setConversations([])
          setActiveConversationId(null)
          setMessages([])
          return
        }

        const mapped: Conversation[] = rawItems.reduce((accumulator: Conversation[], item: HistoryApiItem, index: number) => {
          const id = item.sessionId ?? item.id ?? `history-${index + 1}`
          if (accumulator.some((conversation: Conversation) => conversation.id === id)) {
            return accumulator
          }

          accumulator.push({
            id,
            title: item.title ?? item.name ?? 'New chat',
            updatedAt: item.updatedAt,
            messages: item.messages ? normalizeMessages(item.messages) : undefined,
          })
          return accumulator
        }, [])

        setConversations(mapped)

        const preferredId = activeConversationId ?? mapped[0]?.id ?? null
        if (preferredId) {
          const selectedConversation = mapped.find((conversation: Conversation) => conversation.id === preferredId)
          setActiveConversationId(preferredId)
          setMessages(selectedConversation?.messages ?? [])
          if (!selectedConversation?.messages?.length) {
            void loadConversation(preferredId)
          }
        }
      } catch (error) {
        console.error(error)
        setHistoryError('Could not load previous conversations.')
      }
    }

    if (isSignedIn) {
      void fetchHistory()
    }
  }, [activeConversationId, isSignedIn, loadConversation, user?.id])

  const showGreetingState = messages.length === 0
  const isGuestBlocked = !isSignedIn && guestMessageCount >= GUEST_LIMIT

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.style.height = '0px'
    const nextHeight = Math.min(textarea.scrollHeight, 180)
    textarea.style.height = `${Math.max(nextHeight, 52)}px`
  }, [input, showGreetingState])

  useEffect(() => {
    const scrollFrame = window.requestAnimationFrame(() => {
      const messagesScroll = messagesScrollRef.current
      if (!messagesScroll) return

      messagesScroll.scrollTo({
        top: messagesScroll.scrollHeight,
        behavior: messages.length > 0 ? 'smooth' : 'auto',
      })
    })

    return () => window.cancelAnimationFrame(scrollFrame)
  }, [activeConversationId, messages])

  const activeConversation = useMemo(
    () => conversations.find((conversation: Conversation) => conversation.id === activeConversationId),
    [activeConversationId, conversations],
  )

  useEffect(() => () => {
    revokeAttachmentPreview(selectedAttachment)
  }, [selectedAttachment])

  const displayName = isSignedIn
    ? user?.firstName || user?.fullName || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'there'
    : 'there'

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

  const extractTitleText = (payload: unknown) => {
    const text = extractAssistantText(payload).trim()
    if (!text) return 'New chat'
    return text.replace(/^['"`]+|['"`]+$/g, '').trim() || 'New chat'
  }

  const generateConversationTitle = async (
    firstMessage: string,
    userId: string,
    sessionId: string,
  ) => {
    const response = await fetch(TITLE_WEBHOOK, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: firstMessage,
        firstMessage,
        userId,
        sessionId,
      }),
    })

    if (!response.ok) {
      throw new Error(`Title request failed with ${response.status}`)
    }

    const payload = await response.json()
    return extractTitleText(payload)
  }

  const submitMessage = async () => {
    const trimmed = input.trim()
    const serializedAttachment = selectedAttachment
      ? {
          id: selectedAttachment.id,
          name: selectedAttachment.name,
          size: selectedAttachment.size,
          type: selectedAttachment.type,
          kind: selectedAttachment.kind,
          extension: selectedAttachment.extension,
        }
      : null
    const fallbackAttachmentMessage = serializedAttachment
      ? `Attached file: ${serializedAttachment.name}`
      : ''
    const messageToSend = trimmed || fallbackAttachmentMessage

    if ((!messageToSend && !serializedAttachment) || isSending || isGuestBlocked) return

    const currentUserId = user?.id ?? 'guest'
    const existingConversation = activeConversation
    const currentConversationId = activeConversationId ?? crypto.randomUUID()
    const activeAttachment = selectedAttachment

    setChatError('')
    setIsSending(true)
    setUploadProgress(activeAttachment ? 0 : null)

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
      attachments: serializedAttachment ? [serializedAttachment] : undefined,
    }

    const typingMessage: ChatMessage = {
      id: TYPING_MESSAGE_ID,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isTyping: true,
    }

    setActiveConversationId(currentConversationId)
    setConversations((current) => {
      const existing = current.find((conversation: Conversation) => conversation.id === currentConversationId)
      const nextMessages = [...(existing?.messages ?? messages.filter((message) => !message.isTyping)), userMessage]
      const updatedConversation: Conversation = {
        id: currentConversationId,
        title: existing?.title ?? 'New chat',
        updatedAt: new Date().toISOString(),
        messages: nextMessages,
      }

      const withoutCurrent = current.filter((conversation: Conversation) => conversation.id !== currentConversationId)
      return [updatedConversation, ...withoutCurrent]
    })
    setMessages((current) => [...current.filter((message) => !message.isTyping), userMessage, typingMessage])
    setInput('')
    setSelectedAttachment(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    if (!isSignedIn) {
      setGuestMessageCount((current) => current + 1)
    }

    try {
      const uploadedAttachment = activeAttachment
        ? await uploadAttachmentToSupabase({
            file: activeAttachment.file,
            userId: currentUserId,
            fileType: activeAttachment.type,
            onProgress: setUploadProgress,
          })
        : null
      const response = await fetch(SEND_WEBHOOK, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUserId,
          sessionId: currentConversationId,
          message: messageToSend,
          ...(uploadedAttachment
            ? {
                fileUrl: uploadedAttachment.fileUrl,
                fileType: uploadedAttachment.fileType,
                fileName: uploadedAttachment.fileName,
              }
            : {}),
        }),
      })

      if (!response.ok) {
        throw new Error(`Message request failed with ${response.status}`)
      }

      const payload = await response.json()
      const assistantText =
        extractAssistantText(payload) ||
        'I got your message, but the response payload was empty.'

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: assistantText,
        timestamp: new Date().toISOString(),
      }

      setMessages((current) =>
        current.map((message) =>
          message.id === TYPING_MESSAGE_ID ? assistantMessage : message,
        ),
      )
      setConversations((current) =>
        current.map((conversation: Conversation) =>
          conversation.id === currentConversationId
            ? {
                ...conversation,
                updatedAt: new Date().toISOString(),
                messages: [...(conversation.messages ?? []).filter((message) => !message.isTyping), assistantMessage],
              }
            : conversation,
        ),
      )

      if (!existingConversation) {
        void generateConversationTitle(messageToSend, currentUserId, currentConversationId)
          .then((generatedTitle) => {
            setConversations((current) =>
              current.map((conversation: Conversation) =>
                conversation.id === currentConversationId
                  ? {
                      ...conversation,
                      title: generatedTitle,
                    }
                  : conversation,
              ),
            )
          })
          .catch((error) => {
            console.error('Failed to generate conversation title', error)
          })
      }
    } catch (error) {
      console.error(error)
      setMessages((current) =>
        current.filter((message) => (
          message.id !== TYPING_MESSAGE_ID &&
          message.id !== userMessage.id
        )),
      )
      setConversations((current) =>
        current.flatMap((conversation: Conversation) => {
          if (conversation.id !== currentConversationId) {
            return [conversation]
          }

          const remainingMessages = (conversation.messages ?? []).filter((message) => (
            message.id !== TYPING_MESSAGE_ID &&
            message.id !== userMessage.id
          ))

          if (remainingMessages.length === 0 && !existingConversation) {
            return []
          }

          return [{
            ...conversation,
            messages: remainingMessages,
          }]
        }),
      )
      setInput(trimmed)
      if (activeAttachment) {
        setSelectedAttachment(activeAttachment)
      }
      if (!isSignedIn) {
        setGuestMessageCount((current) => Math.max(0, current - 1))
      }
      setChatError(error instanceof Error ? error.message : 'Something went wrong while contacting Avery. Please try again.')
    } finally {
      setUploadProgress(null)
      setIsSending(false)
    }
  }

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await submitMessage()
  }

  const handleComposerKeyDown = async (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      await submitMessage()
    }
  }

  const handleStartNewChat = () => {
    setActiveConversationId(null)
    setMessages([])
    setChatError('')
    setInput('')
    revokeAttachmentPreview(selectedAttachment)
    setSelectedAttachment(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleAttachmentButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleAttachmentSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!isAllowedAttachment(file)) {
      setChatError('Unsupported file type. Use JPG, PNG, GIF, WEBP, PDF, TXT, or DOCX.')
      event.target.value = ''
      return
    }

    const normalizedType = normalizeAttachmentType(file)
    const nextAttachment: ComposerAttachment = {
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: normalizedType,
      kind: getAttachmentKind({ name: file.name, type: normalizedType }),
      extension: getFileExtension(file.name),
      file,
      previewUrl: getAttachmentKind({ name: file.name, type: normalizedType }) === 'image'
        ? URL.createObjectURL(file)
        : undefined,
    }

    setChatError('')
    setSelectedAttachment((current) => {
      revokeAttachmentPreview(current)
      return nextAttachment
    })

    event.target.value = ''
  }

  const handleRemoveAttachment = () => {
    setSelectedAttachment((current) => {
      revokeAttachmentPreview(current)
      return null
    })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleToggleSidebar = () => {
    if (isSidebarCollapsed) {
      const restoredWidth = clampSidebarWidth(lastExpandedSidebarWidth || SIDEBAR_DEFAULT_WIDTH)
      setSidebarWidth(restoredWidth)
      setIsSidebarCollapsed(false)
      return
    }

    setLastExpandedSidebarWidth(sidebarWidth)
    setIsSidebarCollapsed(true)
  }

  const handleSidebarResizeStart = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault()

    const onPointerMove = (moveEvent: PointerEvent) => {
      const nextWidth = clampSidebarWidth(moveEvent.clientX - 56)
      setSidebarWidth(nextWidth)
      setLastExpandedSidebarWidth(nextWidth)
      if (isSidebarCollapsed) {
        setIsSidebarCollapsed(false)
      }
    }

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  const sidebarStyle = {
    '--sidebar-width': `${isSidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : sidebarWidth}px`,
  } as React.CSSProperties

  return (
    <>
      <div className={`claude-shell ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`} style={sidebarStyle}>
        <aside className="icon-rail">
          <button
            className="rail-avatar rail-button sidebar-toggle-button"
            type="button"
            aria-label={isSidebarCollapsed ? 'Open sidebar' : 'Close sidebar'}
            aria-expanded={!isSidebarCollapsed}
            onClick={handleToggleSidebar}
          >
            <SidebarToggleIcon collapsed={isSidebarCollapsed} />
          </button>
          <div className="rail-stack">
            <button className="rail-button" type="button" onClick={handleStartNewChat} aria-label="New chat">
              +
            </button>
            <button className="rail-button" type="button" aria-label="Chats">
              ○
            </button>
          </div>
          <div className="rail-footer">
            <button className="rail-button" type="button" aria-label="Avery home">
              <AveryLogo className="rail-logo" />
            </button>
          </div>
        </aside>

        <aside className="sidebar">
          <div className="sidebar-topbar">
            <div>
              <p className="sidebar-label">Avery</p>
              <h1>{activeConversation?.title ?? 'New chat'}</h1>
            </div>
          </div>

          <button className="sidebar-new-chat" type="button" onClick={handleStartNewChat}>
            New chat
          </button>

          <div className="conversation-list">
            {historyError && <span className="sidebar-error">{historyError}</span>}
            {conversations.map((conversation: Conversation) => (
              <button
                key={conversation.id}
                type="button"
                className={`conversation-item ${
                  conversation.id === activeConversationId ? 'active' : ''
                }`}
                onClick={() => {
                  void loadConversation(conversation.id)
                }}
              >
                <span className="conversation-title">{conversation.title}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            className="sidebar-resizer"
            aria-label="Resize sidebar"
            onPointerDown={handleSidebarResizeStart}
          />
        </aside>

        <main className="chat-stage">
          <header className="top-bar">
            <div className="top-pill">
              <AveryLogo className="pill-logo" />
              <span>Avery</span>
            </div>
            <AuthActions />
          </header>

          <section className="chat-body">
            <div className="messages-scroll" ref={messagesScrollRef}>
              {showGreetingState ? (
                <section className="welcome-stage">
                  <div className="hero-mark-row">
                    <AveryLogo className="hero-logo" />
                    <h2>{getGreeting(displayName)}</h2>
                  </div>
                  <p>What shall we think through?</p>
                </section>
              ) : (
                <section className="messages-stage">
                  {messages.map((message) => (
                    <article
                      key={message.id}
                      className={`chat-turn ${message.role === 'user' ? 'user' : 'assistant'}`}
                    >
                      {message.role === 'assistant' && <AveryLogo className="turn-logo" />}
                      <div className={`message-bubble ${message.isTyping ? 'typing-bubble' : ''}`}>
                        {message.isTyping ? (
                          <div className="typing-indicator" aria-label="Avery is typing">
                            <span />
                            <span />
                            <span />
                          </div>
                        ) : (
                          <ChatMessageContent message={message} />
                        )}
                      </div>
                    </article>
                  ))}
                </section>
              )}
            </div>
          </section>

          <footer className={`composer-wrap ${showGreetingState ? 'composer-wrap-centered' : ''}`}>
            {chatError && <p className="status-text error-text">{chatError}</p>}
            <form className="composer" onSubmit={handleSendMessage}>
              <div className={`composer-input-wrap ${isGuestBlocked ? 'composer-disabled' : ''}`}>
                <input
                  ref={fileInputRef}
                  className="composer-file-input"
                  type="file"
                  accept={ATTACHMENT_ACCEPT}
                  onChange={handleAttachmentSelection}
                  disabled={isGuestBlocked}
                />
                {selectedAttachment ? (
                  <AttachmentPreview
                    attachment={selectedAttachment}
                    isUploading={isSending && uploadProgress !== null}
                    uploadProgress={uploadProgress ?? 0}
                    onRemove={handleRemoveAttachment}
                  />
                ) : null}
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  placeholder={
                    isGuestBlocked
                      ? 'Sign up or log in to continue chatting'
                      : showGreetingState
                        ? 'Message Avery'
                        : 'Write a message...'
                  }
                  rows={1}
                  disabled={isGuestBlocked}
                />
                <div className="composer-row">
                  <button
                    className="composer-plus"
                    type="button"
                    aria-label="Add attachment"
                    onClick={handleAttachmentButtonClick}
                    disabled={isGuestBlocked || isSending}
                  >
                    +
                  </button>
                  <div className="composer-actions">
                    {!isSignedIn && !isGuestBlocked && (
                      <span className="guest-helper-text">
                        You are currently working as a guest. Sign in to save and see all previous chats.
                      </span>
                    )}
                    <span className="composer-model">Avery</span>
                    <button
                      className="composer-send"
                      type="submit"
                      disabled={isSending || (!input.trim() && !selectedAttachment) || isGuestBlocked}
                      aria-label="Send message"
                    >
                      ↑
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </footer>
        </main>
      </div>

      {isGuestBlocked && <GuestLimitModal />}
    </>
  )
}

function App() {
  return <ChatApp />
}

export default App
