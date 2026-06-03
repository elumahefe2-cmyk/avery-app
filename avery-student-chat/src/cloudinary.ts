const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dwsdczygn'
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'avery_uploads'

type CloudinaryUploadResult = {
  secureUrl: string
  fileName: string
  fileType: string
}

type UploadOptions = {
  file: File
  fileType?: string
  onProgress?: (progress: number) => void
}

export function uploadAttachmentToCloudinary({
  file,
  fileType,
  onProgress,
}: UploadOptions) {
  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`
  const normalizedFileType = fileType || file.type || 'application/octet-stream'

  return new Promise<CloudinaryUploadResult>((resolve, reject) => {
    const request = new XMLHttpRequest()
    const formData = new FormData()

    formData.append('file', file)
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
    formData.append('filename_override', file.name)

    request.open('POST', endpoint)

    request.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable) return

      const progress = Math.min(100, Math.round((event.loaded / event.total) * 100))
      onProgress?.(progress)
    })

    request.addEventListener('load', () => {
      if (request.status < 200 || request.status >= 300) {
        reject(new Error('Cloudinary upload failed.'))
        return
      }

      try {
        const payload = JSON.parse(request.responseText) as { secure_url?: string }
        const secureUrl = payload.secure_url

        if (!secureUrl) {
          reject(new Error('Cloudinary upload did not return a secure URL.'))
          return
        }

        onProgress?.(100)
        resolve({
          secureUrl,
          fileName: file.name,
          fileType: normalizedFileType,
        })
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Cloudinary upload failed.'))
      }
    })

    request.addEventListener('error', () => {
      reject(new Error('Cloudinary upload failed.'))
    })

    request.addEventListener('abort', () => {
      reject(new Error('Cloudinary upload was cancelled.'))
    })

    request.send(formData)
  })
}
