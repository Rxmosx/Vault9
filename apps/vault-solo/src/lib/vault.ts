import {decryptToString, encryptString} from '../../../../packages/crypto-core/aes'
import {deriveKey, KDF_PARAMS, type KdfParams} from '../../../../packages/crypto-core/kdf'
import type {Bytes} from '../../../../packages/crypto-core/types'
import {
    type CredentialRecord,
    db,
    DEFAULT_IDLE_TIMEOUT_MS,
    type ProjectRecord,
    VAULT_META_ID,
    type VaultMetaRecord,
} from './db'
import createPlugin from "tailwindcss/plugin";

// Known plaintext used only to confirm the master password on unlock — it
// is never a secret, since correctness is verified locally and nothing
// leaves the device either way.
const VERIFIER_PLAINTEXT = 'vault-unlock-check'
const BACKUP_FORMAT = 'vault9-backup'
const BACKUP_VERSION = 1

export interface Credential {
    id: string
    title: string
    username: string
    credential: string
    url?: string
    notes?: string
    projectId: string
    type: string
    createdAt: number
    updatedAt: number
}

export interface Project {
    id: string
    name: string
    createdAt: number
}

type VaultMeta = Omit<VaultMetaRecord, 'id' | 'createdAt'>
type ParsedPairing = Omit<VaultMeta, 'idleTimeoutMs'>

export type CredentialInput = Omit<Credential, 'id' | 'createdAt' | 'updatedAt'>

export interface PairingMeta {
    salt: string,
    kdfParams: KdfParams,
    verifier: string,
    verifierIv: string
}

// The derived key lives only in memory for the session; it is never
// persisted or exported anywhere.
let vaultKey: CryptoKey | null = null

export function isUnlocked(): boolean {
    return vaultKey !== null
}

export function lock(): void {
    vaultKey = null
}

export async function hasVault(): Promise<boolean> {
    const meta = await db.meta.get(VAULT_META_ID)
    return meta !== undefined
}

async function generateVaultMeta(
    masterPassword: string,
): Promise<{ meta: VaultMeta; key: CryptoKey }> {
    const {key, salt} = await deriveKey(masterPassword)
    const {ciphertext, iv} = await encryptString(key, VERIFIER_PLAINTEXT)

    return {
        meta: {
            salt,
            kdfParams: KDF_PARAMS,
            idleTimeoutMs: DEFAULT_IDLE_TIMEOUT_MS,
            verifier: ciphertext,
            verifierIv: iv,
        },
        key,
    }
}

export async function getIdleTimeoutMs(): Promise<number> {
    const meta = await db.meta.get(VAULT_META_ID)
    return meta?.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS
}

export async function setIdleTimeoutMs(ms: number): Promise<void> {
    const meta = await db.meta.get(VAULT_META_ID)
    if (!meta) throw new Error('No vault to update')
    await db.meta.put({...meta, idleTimeoutMs: ms})
}

async function persistVaultMeta(meta: VaultMeta): Promise<void> {
    if (!await hasVault()) throw new Error('Vault already exists')

    await db.meta.put({
        id: VAULT_META_ID,
        ...meta,
        createdAt: Date.now(),
    })
}

export async function createVault(masterPassword: string): Promise<void> {
    const existing = await db.meta.get(VAULT_META_ID)
    if (existing) {
        throw new Error('Vault already exists')
    }

    const {meta, key} = await generateVaultMeta(masterPassword)
    await persistVaultMeta(meta)
    vaultKey = key
}

async function verifyMasterPassword(key: CryptoKey, verifier: Bytes, verifierIv: Bytes): Promise<boolean>{
    let plaintext: string

    try {
        plaintext = await decryptToString(key, {
            ciphertext: verifier,
            iv: verifierIv,
        })
    } catch {
        return false
    }

    return plaintext === VERIFIER_PLAINTEXT;
}

export async function unlockVault(masterPassword: string): Promise<void> {
    const meta = await db.meta.get(VAULT_META_ID)

    if (!meta) {
        throw new Error('No Vault to unlock')
    }

    const {key} = await deriveKey(masterPassword, meta.salt, meta.kdfParams)

    if (!await verifyMasterPassword(key, meta.verifier, meta.verifierIv)) {
        throw new Error('Wrong Master Password')
    }

    vaultKey = key
}

export async function exportPairingMeta(): Promise<PairingMeta> {
    requireKey()
    const meta = await db.meta.get(VAULT_META_ID)

    if (!meta) throw new Error('No vault to pair')

    return {
        salt: bytesToBase64(meta.salt),
        kdfParams: meta.kdfParams,
        verifier: bytesToBase64(meta.verifier),
        verifierIv: bytesToBase64(meta.verifierIv)
    }
}

function parseKdfParams(input: unknown): KdfParams {
    if (typeof input !== 'object' || input === null) throw new Error('Input received either is not an object or is null')

    const raw = input as Record<string, unknown>
    const kdfParamsValues: Record<string, number> = {}

    for (const campo of ['time', 'mem', 'parallelism', 'hashLen']) {
        if (!Number.isInteger(raw[campo])) throw new Error(`Field kdfParams.${campo} invalid`)
        kdfParamsValues[campo] = raw[campo] as number
    }

    if (kdfParamsValues.time < 1 || kdfParamsValues.time > 10) {
        throw new Error('Time invalid')
    }
    if (kdfParamsValues.mem < 8192 || kdfParamsValues.mem > 262144) {
        throw new Error('Mem invalid')
    }
    if (kdfParamsValues.parallelism < 1 || kdfParamsValues.parallelism > 4) {
        throw new Error('Parallelism invalid')
    }
    if (kdfParamsValues.hashLen !== 32) {
        throw new Error('HashLen invalid')
    }

    return {
        time: kdfParamsValues.time,
        mem: kdfParamsValues.mem,
        parallelism: kdfParamsValues.parallelism,
        hashLen: kdfParamsValues.hashLen
    }
}

function decodeBase64Field(value: unknown, expectedLength: number): Bytes {

    if (typeof value !== 'string') {
        throw new Error('value is not a string')
    }

    let bytes: Bytes
    try {
        bytes = base64ToBytes(value)
    } catch {
        throw new Error('Error trying to convert to bytes')
    }

    if (bytes.length !== expectedLength) {
        throw new Error('Field does not have ideal length')
    }

    return bytes
}

function parsePairingMeta(input: unknown): ParsedPairing {
    if (typeof input !== 'object' || input === null) throw new Error('Can not parse invalid input')

    const raw = input as Record<string, unknown>

    const kdfParams = parseKdfParams(raw.kdfParams)
    const salt = decodeBase64Field(raw.salt, 16)
    const verifier = decodeBase64Field(raw.verifier, 34)
    const verifierIv = decodeBase64Field(raw.verifierIv, 12)

    return {
        salt,
        kdfParams,
        verifier,
        verifierIv
    }
}

export async function joinVault(masterPassword: string, pairing: unknown): Promise<void> {
    if (await hasVault()) throw new Error('Vault already exists')

    const parsed = parsePairingMeta(pairing)
    const {key} = await deriveKey(masterPassword, parsed.salt, parsed.kdfParams)

    if (!await verifyMasterPassword(key, parsed.verifier, parsed.verifierIv)) {
        throw new Error('Wrong Master Password')
    }

    if (await hasVault()) throw new Error('Vault already exists')
    await persistVaultMeta({...parsed, idleTimeoutMs: DEFAULT_IDLE_TIMEOUT_MS})

    vaultKey = key
}


function requireKey(): CryptoKey {
    if (!vaultKey) {
        throw new Error('Vault is locked')
    }
    return vaultKey
}

async function decodeCredential(
    key: CryptoKey,
    record: CredentialRecord,
): Promise<Credential> {

    const json = await decryptToString(key, {
        ciphertext: record.ciphertext,
        iv: record.iv,
    })

    const data = JSON.parse(json) as CredentialInput

    return {
        id: record.id,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        ...data,
        projectId: data.projectId ?? '',
        type: data.type ?? '',
    }
}

async function decodeProject(
    key: CryptoKey,
    record: ProjectRecord,
): Promise<Project> {

    const json = await decryptToString(key, {
        ciphertext: record.ciphertext,
        iv: record.iv,
    })
    const data = JSON.parse(json) as { name: string }

    return {id: record.id, createdAt: record.createdAt, name: data.name}
}

export async function listProjects(): Promise<Project[]> {
    const key = requireKey()
    const records = await db.projects.orderBy('createdAt').toArray()

    const results = await Promise.allSettled(
        records.map((record) => decodeProject(key, record)),
    )

    return results
        .filter((r): r is PromiseFulfilledResult<Project> => r.status === 'fulfilled')
        .map((r) => r.value)
}

export async function createProject(name: string): Promise<Project> {
    const key = requireKey()
    const now = Date.now()
    const id = crypto.randomUUID()
    const {ciphertext, iv} = await encryptString(key, JSON.stringify({name}))

    await db.projects.put({id, ciphertext, iv, createdAt: now})

    return {id, name, createdAt: now}
}

export async function deleteProject(id: string) {
    requireKey()
    await db.projects.delete(id)
}

export async function listCredentials(): Promise<Credential[]> {
    const key = requireKey()
    const records = await db.credentials.orderBy('updatedAt').reverse().toArray()

    const results = await Promise.allSettled(
        records.map((record) => decodeCredential(key, record)),
    )

    return results
        .filter((r): r is PromiseFulfilledResult<Credential> => r.status === 'fulfilled')
        .map((r) => r.value)
    // considerar logar/expor os rejeitados de alguma forma, em vez de descartar silenciosamente
}

export async function addCredential(input: CredentialInput): Promise<Credential> {
    const key = requireKey()
    const now = Date.now()
    const id = crypto.randomUUID()
    const {ciphertext, iv} = await encryptString(key, JSON.stringify(input))

    await db.credentials.put({id, ciphertext, iv, createdAt: now, updatedAt: now})

    return {id, createdAt: now, updatedAt: now, ...input}
}

export async function updateCredential(
    id: string,
    input: CredentialInput,
): Promise<Credential> {

    const key = requireKey()
    const existing = await db.credentials.get(id)

    if (!existing) {
        throw new Error('Credential not found')
    }

    const now = Date.now()
    const {ciphertext, iv} = await encryptString(key, JSON.stringify(input))

    await db.credentials.put({
        id,
        ciphertext,
        iv,
        createdAt: existing.createdAt,
        updatedAt: now,
    })

    return {id, createdAt: existing.createdAt, updatedAt: now, ...input}
}

export async function deleteCredential(id: string): Promise<void> {
    requireKey()
    await db.credentials.delete(id)
}

// ============================================================
// Backup / Restauração / Redefinição — categoria "Dados" das
// Configurações. Tudo aqui trabalha só com os blobs já cifrados: nunca
// decifra nada, nunca usa vaultKey/requireKey(). O backup exportado
// continua zero-knowledge — só quem souber a master password consegue
// ler o conteúdo depois de importar.
// ============================================================

// Uint8Array <-> base64, porque JSON.stringify não sabe serializar
// TypedArray sozinho.
function bytesToBase64(bytes: Bytes): string {
    let binary = ''
    for (const b of bytes) binary += String.fromCharCode(b)
    return btoa(binary)
}

function base64ToBytes(b64: string): Bytes {
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes as Bytes
}

interface SerializedMeta extends Omit<VaultMetaRecord, 'salt' | 'verifier' | 'verifierIv'> {
    salt: string
    verifier: string
    verifierIv: string
}

interface SerializedBlobRecord {
    id: string
    ciphertext: string
    iv: string
    createdAt: number
    updatedAt?: number
}

interface BackupPayload {
    format: typeof BACKUP_FORMAT
    version: number
    exportedAt: number
    meta: SerializedMeta
    credentials: SerializedBlobRecord[]
    projects: SerializedBlobRecord[]
}

/** Gera o arquivo de backup — todo o cofre, ainda cifrado, como um Blob
 * pronto pra download. */
export async function exportBackup(): Promise<Blob> {
    const meta = await db.meta.get(VAULT_META_ID)
    if (!meta) throw new Error('No vault to export')

    const [credentials, projects] = await Promise.all([
        db.credentials.toArray(),
        db.projects.toArray(),
    ])

    const payload: BackupPayload = {
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        exportedAt: Date.now(),
        meta: {
            id: meta.id,
            salt: bytesToBase64(meta.salt),
            kdfParams: meta.kdfParams,
            idleTimeoutMs: meta.idleTimeoutMs,
            verifier: bytesToBase64(meta.verifier),
            verifierIv: bytesToBase64(meta.verifierIv),
            createdAt: meta.createdAt,
        },
        credentials: credentials.map((c) => ({
            id: c.id,
            ciphertext: bytesToBase64(c.ciphertext),
            iv: bytesToBase64(c.iv),
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
        })),
        projects: projects.map((p) => ({
            id: p.id,
            ciphertext: bytesToBase64(p.ciphertext),
            iv: bytesToBase64(p.iv),
            createdAt: p.createdAt,
        })),
    }

    return new Blob([JSON.stringify(payload)], {type: 'application/json'})
}

/** Substitui TODO o conteúdo do cofre local pelo do arquivo de backup.
 * Sempre tranca o cofre ao final — a chave em memória, derivada do salt
 * antigo, não serve mais depois de trocar o salt/verifier importados. */
export async function importBackup(file: File): Promise<void> {
    const text = await file.text()

    let payload: BackupPayload
    try {
        payload = JSON.parse(text)
    } catch {
        throw new Error('Arquivo de backup inválido (não é JSON)')
    }

    if (payload.format !== BACKUP_FORMAT) {
        throw new Error('Este arquivo não é um backup do Vault9')
    }
    if (payload.version > BACKUP_VERSION) {
        throw new Error('Este backup foi feito por uma versão mais nova do app')
    }

    const meta: VaultMetaRecord = {
        id: VAULT_META_ID,
        salt: base64ToBytes(payload.meta.salt),
        kdfParams: payload.meta.kdfParams,
        idleTimeoutMs: payload.meta.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS,
        verifier: base64ToBytes(payload.meta.verifier),
        verifierIv: base64ToBytes(payload.meta.verifierIv),
        createdAt: payload.meta.createdAt,
    }

    const credentials: CredentialRecord[] = payload.credentials.map((c) => ({
        id: c.id,
        ciphertext: base64ToBytes(c.ciphertext),
        iv: base64ToBytes(c.iv),
        createdAt: c.createdAt,
        updatedAt: c.updatedAt ?? c.createdAt,
    }))

    const projects: ProjectRecord[] = payload.projects.map((p) => ({
        id: p.id,
        ciphertext: base64ToBytes(p.ciphertext),
        iv: base64ToBytes(p.iv),
        createdAt: p.createdAt,
    }))

    await db.transaction('rw', db.meta, db.credentials, db.projects, async () => {
        await db.meta.clear()
        await db.credentials.clear()
        await db.projects.clear()
        await db.meta.put(meta)
        await db.credentials.bulkPut(credentials)
        await db.projects.bulkPut(projects)
    })

    lock()
}

/** Danger Zone: apaga tudo, sem exportar nada antes. Irreversível. */
export async function resetVault(): Promise<void> {
    await db.transaction('rw', db.meta, db.credentials, db.projects, async () => {
        await db.meta.clear()
        await db.credentials.clear()
        await db.projects.clear()
    })
    lock()
}

/** Tamanho aproximado do cofre neste dispositivo, via API do navegador. */
export async function getStorageEstimate(): Promise<{ usageMB: number } | null> {
    if (!navigator.storage?.estimate) return null
    const {usage} = await navigator.storage.estimate()
    if (usage === undefined) return null
    return {usageMB: usage / (1024 * 1024)}
}