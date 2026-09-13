import { encryptString, decryptToString } from './crypto/aes'
import { deriveKey } from './crypto/kdf'
import { db, VAULT_META_ID, type CredentialRecord } from './db'

// Known plaintext used only to confirm the master password on unlock — it
// is never a secret, since correctness is verified locally and nothing
// leaves the device either way.
const VERIFIER_PLAINTEXT = 'vault-unlock-check'

export interface Credential {
  id: string
  title: string
  username: string
  password: string
  url?: string
  notes?: string
  createdAt: number
  updatedAt: number
}

export type CredentialInput = Omit<Credential, 'id' | 'createdAt' | 'updatedAt'>

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

export async function createVault(masterPassword: string): Promise<void> {
  const existing = await db.meta.get(VAULT_META_ID)
  if (existing) {
    throw new Error('Vault already exists')
  }

  const { key, salt } = await deriveKey(masterPassword)
  const { ciphertext, iv } = await encryptString(key, VERIFIER_PLAINTEXT)

  await db.meta.put({
    id: VAULT_META_ID,
    salt,
    verifier: ciphertext,
    verifierIv: iv,
    createdAt: Date.now(),
  })

  vaultKey = key
}

export async function unlockVault(masterPassword: string): Promise<void> {
  const meta = await db.meta.get(VAULT_META_ID)
  if (!meta) {
    throw new Error('No vault to unlock')
  }

  const { key } = await deriveKey(masterPassword, meta.salt)

  let plaintext: string
  try {
    plaintext = await decryptToString(key, {
      ciphertext: meta.verifier,
      iv: meta.verifierIv,
    })
  } catch {
    throw new Error('Master password incorreta')
  }
  if (plaintext !== VERIFIER_PLAINTEXT) {
    throw new Error('Master password incorreta')
  }

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
  }
}

export async function listCredentials(): Promise<Credential[]> {
  const key = requireKey()
  const records = await db.credentials.orderBy('updatedAt').reverse().toArray()
  const results = await Promise.allSettled(
      records.map((record) => decodeCredential(key, record))
  )

  return results
      .filter((r): r is PromiseFulfilledResult<Credential> => r.status === 'fulfilled')
      .map((r) => r.value)
  // considerar logar/expor os rejeitados de alguma forma, em vez de descartar silenciosamente
}

export async function addCredential(
  input: CredentialInput,
): Promise<Credential> {
  const key = requireKey()
  const now = Date.now()
  const id = crypto.randomUUID()
  const { ciphertext, iv } = await encryptString(key, JSON.stringify(input))

  await db.credentials.put({ id, ciphertext, iv, createdAt: now, updatedAt: now })

  return { id, createdAt: now, updatedAt: now, ...input }
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
  const { ciphertext, iv } = await encryptString(key, JSON.stringify(input))

  await db.credentials.put({
    id,
    ciphertext,
    iv,
    createdAt: existing.createdAt,
    updatedAt: now,
  })

  return { id, createdAt: existing.createdAt, updatedAt: now, ...input }
}

export async function deleteCredential(id: string): Promise<void> {
  requireKey()
  await db.credentials.delete(id)
}
