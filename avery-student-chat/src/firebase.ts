import { getApp, getApps, initializeApp } from 'firebase/app'
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage'

const firebaseConfig = {
  apiKey: 'AIzaSyCgC4vtgZjzF2pJIOfo9cwoOTUOIMYbaYM',
  authDomain: 'avery-app-e1223.firebaseapp.com',
  projectId: 'avery-app-e1223',
  storageBucket: 'avery-app-e1223.firebasestorage.app',
  messagingSenderId: '590316173527',
  appId: '1:590316173527:web:1c7b069003f815af8cd892',
}

const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig)
const storage = getStorage(firebaseApp)

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '-')
}

export async function uploadAttachmentToFirebase(file: File, userId: string, fileType?: string) {
  const storagePath = `chat-uploads/${userId}/${Date.now()}-${crypto.randomUUID()}-${sanitizeFileName(file.name)}`
  const storageRef = ref(storage, storagePath)
  const normalizedFileType = fileType || file.type || 'application/octet-stream'

  await uploadBytes(storageRef, file, {
    contentType: normalizedFileType,
  })

  const fileUrl = await getDownloadURL(storageRef)

  return {
    fileUrl,
    fileName: file.name,
    fileType: normalizedFileType,
    storagePath,
  }
}
