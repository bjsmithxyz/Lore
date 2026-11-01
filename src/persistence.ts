import type { Project } from './types'

const DB_NAME = 'lore-layer'
const STORE = 'projects'
const META_STORE = 'meta'
const CURRENT_KEY = 'current'
const FALLBACK_KEY = 'lore-layer-projects'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function fallbackProjects(): Project[] {
  const saved = localStorage.getItem(FALLBACK_KEY)
  if (!saved) {
    const legacy = localStorage.getItem('lore-layer-project')
    return legacy ? [JSON.parse(legacy) as Project] : []
  }
  return JSON.parse(saved) as Project[]
}

export async function loadProject(): Promise<Project | null> {
  try {
    if (!('indexedDB' in window)) throw new Error('IndexedDB unavailable')
    const db = await openDatabase()
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE, META_STORE], 'readonly')
      const metaRequest = transaction.objectStore(META_STORE).get(CURRENT_KEY)
      metaRequest.onsuccess = () => {
        const currentId = metaRequest.result as string | undefined
        const projectRequest = transaction.objectStore(STORE).get(currentId || 'current')
        projectRequest.onsuccess = () => resolve((projectRequest.result as Project | undefined) ?? null)
        projectRequest.onerror = () => reject(projectRequest.error)
      }
      metaRequest.onerror = () => reject(metaRequest.error)
    })
  } catch {
    return fallbackProjects().sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0] ?? null
  }
}

export async function listProjects(): Promise<Project[]> {
  try {
    if (!('indexedDB' in window)) throw new Error('IndexedDB unavailable')
    const db = await openDatabase()
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).getAll()
      request.onsuccess = () => {
        const unique = new Map<string, Project>()
        for (const item of request.result as Project[]) {
          if (item?.id && Array.isArray(item.nodes) && Array.isArray(item.edges)) unique.set(item.id, item)
        }
        resolve([...unique.values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at)))
      }
      request.onerror = () => reject(request.error)
    })
  } catch {
    return fallbackProjects().sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  }
}

export async function saveProject(project: Project): Promise<void> {
  try {
    if (!('indexedDB' in window)) throw new Error('IndexedDB unavailable')
    const db = await openDatabase()
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE, META_STORE], 'readwrite')
      transaction.objectStore(STORE).put(project, project.id)
      transaction.objectStore(META_STORE).put(project.id, CURRENT_KEY)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  } catch {
    const projects = fallbackProjects().filter((item) => item.id !== project.id)
    localStorage.setItem(FALLBACK_KEY, JSON.stringify([project, ...projects]))
  }
}

export function downloadFile(filename: string, content: string, type = 'application/json') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
