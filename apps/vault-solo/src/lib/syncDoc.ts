import * as Y from 'yjs'
import type {Bytes} from '../../../../packages/crypto-core/types'
import {db, SYNC_STATE_ID, type CredentialRecord, type ProjectRecord} from './db'

// The Yjs document is only the sync layer: Dexie stays the source of truth
// for the UI. It holds ciphertext + non-secret metadata, never plaintext, so
// it can exist (and receive remote changes) while the vault is locked. The
// vault meta (salt, verifier) is never part of it — pairing handles that.
// The record id is the map key, so it is omitted from the value.

export type SyncedCredential = Omit<CredentialRecord, 'id'>
export type SyncedProject = Omit<ProjectRecord, 'id'>

export const doc = new Y.Doc()

export const credentialsMap = doc.getMap<SyncedCredential>('credentials')
export const projectsMap = doc.getMap<SyncedProject>('projects')

// Transaction origin for writes made by this device, so the observer that
// applies remote changes to Dexie can skip them and avoid an echo loop.
export const LOCAL_ORIGIN = 'local'

const SAVE_DEBOUNCE_MS = 500
const PERSISTENCE_ORIGIN = 'persistence'

let initPromise: Promise<void> | null = null
let saveTimer: ReturnType<typeof setTimeout> | undefined

async function saveState(): Promise<void> {
    await db.syncState.put({
        id: SYNC_STATE_ID,
        update: Y.encodeStateAsUpdate(doc) as Bytes,
    })
}

/** Drops a scheduled save. Call before wiping the persisted state, so a
 * pending timer can't write the old doc back right after the wipe. */
export function cancelPendingSave(): void {
    clearTimeout(saveTimer)
}

/** Loads the persisted doc state and starts saving changes. Must finish
 * before anything writes to the doc; safe to call more than once. */
export function initSyncDoc(): Promise<void> {

    initPromise ??= (async () => {
        const row = await db.syncState.get(SYNC_STATE_ID)

        if (row) Y.applyUpdate(doc, row.update, PERSISTENCE_ORIGIN)

        doc.on('update', (_update, origin) => {
            if (origin === PERSISTENCE_ORIGIN) return
            
            clearTimeout(saveTimer)
            saveTimer = setTimeout(() => {
                saveState().catch(console.error)
            }, SAVE_DEBOUNCE_MS)
        })

        // No saved state means the doc has never been persisted: Dexie is
        // the only source, so copy it in once. With saved state, never
        // seed — it would resurrect items deleted elsewhere (tombstones).
        if (!row) await seedFromDexie()
    })()
    return initPromise
}

async function seedFromDexie(): Promise<void> {
    const [credentials, projects] = await Promise.all([
        db.credentials.toArray(),
        db.projects.toArray(),
    ])

    doc.transact(() => {
        for (const {id, ...record} of credentials) credentialsMap.set(id, record)
        for (const {id, ...record} of projects) projectsMap.set(id, record)
    }, LOCAL_ORIGIN)
}

export function syncPutCredential(id: string, record: SyncedCredential): void {
    doc.transact(() => credentialsMap.set(id, record), LOCAL_ORIGIN)
}

export function syncDeleteCredential(id: string): void {
    doc.transact(() => credentialsMap.delete(id), LOCAL_ORIGIN)
}

export function syncPutProject(id: string, record: SyncedProject): void {
    doc.transact(() => projectsMap.set(id, record), LOCAL_ORIGIN)
}

export function syncDeleteProject(id: string): void {
    doc.transact(() => projectsMap.delete(id), LOCAL_ORIGIN)
}
