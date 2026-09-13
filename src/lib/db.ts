import Dexie, { type EntityTable } from 'dexie'
import type { Bytes } from './crypto/types'

// Everything stored here is ciphertext + the metadata needed to decrypt it
// (IV, Argon2 salt). No plaintext credential data or master password ever
// gets written to IndexedDB.

export const VAULT_META_ID = 'singleton'

export interface VaultMetaRecord {
  id: typeof VAULT_META_ID
  salt: Bytes
  /** Ciphertext of a known plaintext; decrypting it with the derived key
   * confirms the master password without ever persisting the password. */
  verifier: Bytes
  verifierIv: Bytes
  createdAt: number
}

export interface CredentialRecord {
  id: string
  ciphertext: Bytes
  iv: Bytes
  createdAt: number
  updatedAt: number
}

class VaultDatabase extends Dexie {
  meta!: EntityTable<VaultMetaRecord, 'id'>
  credentials!: EntityTable<CredentialRecord, 'id'>

  constructor() {
    super('vault')
    this.version(1).stores({
      meta: 'id',
      credentials: 'id, updatedAt',
    })
  }
}

export const db = new VaultDatabase()
