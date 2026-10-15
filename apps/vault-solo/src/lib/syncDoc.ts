import * as Y from 'yjs'
import {IV_LENGTH} from '../../../../packages/crypto-core/aes'
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
        observeRemoteChanges()
    })()
    return initPromise
}

function isBytes(value: unknown, length?: number): value is Bytes {
    return value instanceof Uint8Array
        && (length === undefined ? value.length > 0 : value.length === length)
}

function isTimestamp(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function isSyncedCredential(value: unknown): value is SyncedCredential {
    if (typeof value !== 'object' || value === null) return false

    const r = value as Record<string, unknown>
    return isBytes(r.ciphertext) && isBytes(r.iv, IV_LENGTH)
        && isTimestamp(r.createdAt) && isTimestamp(r.updatedAt)
}

function isSyncedProject(value: unknown): value is SyncedProject {
    if (typeof value !== 'object' || value === null) return false
    const r = value as Record<string, unknown>
    return isBytes(r.ciphertext) && isBytes(r.iv, IV_LENGTH) && isTimestamp(r.createdAt)
}

// Dexie writes are async but Yjs observers are sync: chain them so two quick
// remote updates can't land in Dexie out of order.
let applyQueue: Promise<void> = Promise.resolve()

function enqueue(task: () => Promise<void>): void {
    applyQueue = applyQueue.then(task).catch(console.error)
}

const remoteListeners = new Set<() => void>()

/** Calls back after remote changes have been written to Dexie. Returns the
 * function that unsubscribes. */
export function onRemoteChange(listener: () => void): () => void {
    remoteListeners.add(listener)
    return () => {
        remoteListeners.delete(listener)
    }
}

function notifyRemoteChange(): void {
    for (const listener of remoteListeners) listener()
}

// Everything except our own writes and the persisted state load is a remote
// change. Blacklisting (instead of requiring a 'remote' origin) keeps this
// working when y-webrtc applies updates with its own object as origin.
function isRemote(origin: unknown): boolean {
    return origin !== LOCAL_ORIGIN && origin !== PERSISTENCE_ORIGIN
}

function collectChanges<V>(
    event: Y.YMapEvent<V>,
    map: Y.Map<V>,
    isValid: (value: unknown) => value is V,
): { puts: Array<[string, V]>; deletes: string[] } {
    const puts: Array<[string, V]> = []
    const deletes: string[] = []

    for (const [id, change] of event.changes.keys) {
        if (change.action === 'delete') {
            deletes.push(id)
            continue
        }

        const value = map.get(id)
        if (id && isValid(value)) {

            puts.push([id, value])
        } else {
            console.warn(`Ignoring invalid remote record: "${id}"`)
        }
    }

    return {puts, deletes}
}

function observeRemoteChanges(): void {
    credentialsMap.observe((event) => {
        if (!isRemote(event.transaction.origin)) return
        const {puts, deletes} = collectChanges(event, credentialsMap, isSyncedCredential)
        if (puts.length === 0 && deletes.length === 0) return
        enqueue(async () => {
            await db.transaction('rw', db.credentials, async () => {
                await db.credentials.bulkPut(puts.map(([id, value]) => ({id, ...value})))
                await db.credentials.bulkDelete(deletes)
            })
            notifyRemoteChange()
        })
    })

    projectsMap.observe((event) => {
        if (!isRemote(event.transaction.origin)) return
        const {puts, deletes} = collectChanges(event, projectsMap, isSyncedProject)
        if (puts.length === 0 && deletes.length === 0) return
        enqueue(async () => {
            await db.transaction('rw', db.projects, async () => {
                await db.projects.bulkPut(puts.map(([id, value]) => ({id, ...value})))
                await db.projects.bulkDelete(deletes)
            })
            notifyRemoteChange()
        })
    })
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
