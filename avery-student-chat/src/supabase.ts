const SUPABASE_PROJECT_URL =
  import.meta.env.VITE_SUPABASE_PROJECT_URL || 'https://izjbmgrkqhophmapaidg.supabase.co'
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6amJtZ3JrcWhvcGhtYXBhaWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNDU3MTYsImV4cCI6MjA5NTkyMTcxNn0.z32dAa-TuHcqooB1VYt4u6TouwWNGWZgJVijutlKi2Q'
const SUPABASE_BUCKET_NAME = import.meta.env.VITE_SUPABASE_BUCKET_NAME || 'avery-files'
const SUPABASE_REST_URL = `${SUPABASE_PROJECT_URL}/rest/v1`
const SHARED_CHATS_TABLE = 'shared_chats'

type SupabaseUploadResult = {
  fileUrl: string
  fileName: string
  fileType: string
  storagePath: string
}

export type SharedChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  attachments?: Array<{
    id: string
    name: string
    size: number
    type: string
    kind: 'image' | 'file'
    extension: string
  }>
}

type SharedChatRecord = {
  id: string
  messages: SharedChatMessage[]
  created_at?: string
}

type UploadOptions = {
  file: File
  userId: string
  fileType?: string
  onProgress?: (progress: number) => void
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '-')
}

function isSupabaseRlsError(errorMessage: string) {
  return /row-level security policy/i.test(errorMessage)
}

function extractSupabaseErrorMessage(errorText: string, fallbackMessage: string) {
  try {
    const payload = JSON.parse(errorText) as {
      error?: string
      message?: string
    }
    const message = payload.error || payload.message || fallbackMessage
    return isSupabaseRlsError(message)
      ? 'Supabase shared chat policy is blocking public share creation.'
      : message
  } catch {
    return errorText || fallbackMessage
  }
}

function getSupabaseHeaders(headers: Record<string, string> = {}) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    ...headers,
  }
}

function buildStoragePath(file: File, userId: string) {
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '-')
  return `${safeUserId}/${Date.now()}-${crypto.randomUUID()}-${sanitizeFileName(file.name)}`
}

export function uploadAttachmentToSupabase({
  file,
  userId,
  fileType,
  onProgress,
}: UploadOptions) {
  const normalizedFileType = fileType || file.type || 'application/octet-stream'
  const storagePath = buildStoragePath(file, userId)
  const encodedStoragePath = storagePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  const endpoint = `${SUPABASE_PROJECT_URL}/storage/v1/object/${SUPABASE_BUCKET_NAME}/${encodedStoragePath}`

  return new Promise<SupabaseUploadResult>((resolve, reject) => {
    const request = new XMLHttpRequest()

    request.open('POST', endpoint)
    request.setRequestHeader('apikey', SUPABASE_ANON_KEY)
    request.setRequestHeader('Authorization', `Bearer ${SUPABASE_ANON_KEY}`)
    request.setRequestHeader('x-upsert', 'false')
    request.setRequestHeader('Content-Type', normalizedFileType)

    request.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable) return

      const progress = Math.min(100, Math.round((event.loaded / event.total) * 100))
      onProgress?.(progress)
    })

    request.addEventListener('load', () => {
      if (request.status < 200 || request.status >= 300) {
        try {
          const payload = JSON.parse(request.responseText) as {
            error?: string
            message?: string
          }
          const errorMessage = payload.error || payload.message || 'Supabase upload failed.'
          reject(
            new Error(
              isSupabaseRlsError(errorMessage)
                ? 'Supabase bucket upload policy is blocking file uploads.'
                : errorMessage,
            ),
          )
        } catch {
          reject(new Error('Supabase upload failed.'))
        }
        return
      }

      onProgress?.(100)
      resolve({
        fileUrl: `${SUPABASE_PROJECT_URL}/storage/v1/object/public/${SUPABASE_BUCKET_NAME}/${encodedStoragePath}`,
        fileName: file.name,
        fileType: normalizedFileType,
        storagePath,
      })
    })

    request.addEventListener('error', () => {
      reject(new Error('Supabase upload failed.'))
    })

    request.addEventListener('abort', () => {
      reject(new Error('Supabase upload was cancelled.'))
    })

    request.send(file)
  })
}

export async function createSharedChat(messages: SharedChatMessage[]) {
  const id = crypto.randomUUID()
  const response = await fetch(`${SUPABASE_REST_URL}/${SHARED_CHATS_TABLE}`, {
    method: 'POST',
    headers: getSupabaseHeaders({
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    }),
    body: JSON.stringify([
      {
        id,
        messages,
      },
    ]),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(extractSupabaseErrorMessage(errorText, 'Failed to save shared conversation.'))
  }

  return id
}

export async function fetchSharedChat(shareId: string) {
  const response = await fetch(
    `${SUPABASE_REST_URL}/${SHARED_CHATS_TABLE}?select=id,messages,created_at&id=eq.${encodeURIComponent(shareId)}`,
    {
      method: 'GET',
      headers: getSupabaseHeaders(),
    },
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(extractSupabaseErrorMessage(errorText, 'Failed to load shared conversation.'))
  }

  const payload = await response.json() as SharedChatRecord[]
  return payload[0] ?? null
}
