const SUPABASE_PROJECT_URL =
  import.meta.env.VITE_SUPABASE_PROJECT_URL || 'https://izjbmgrkqhophmapaidg.supabase.co'
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6amJtZ3JrcWhvcGhtYXBhaWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNDU3MTYsImV4cCI6MjA5NTkyMTcxNn0.z32dAa-TuHcqooB1VYt4u6TouwWNGWZgJVijutlKi2Q'
const SUPABASE_BUCKET_NAME = import.meta.env.VITE_SUPABASE_BUCKET_NAME || 'avery-files'

type SupabaseUploadResult = {
  fileUrl: string
  fileName: string
  fileType: string
  storagePath: string
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
