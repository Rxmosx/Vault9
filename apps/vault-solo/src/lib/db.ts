import Dexie, { type EntityTable } from 'dexie'
import type { Bytes } from '../../../../packages/crypto-core/types'
import type {KdfParams} from "../../../../packages/crypto-core/kdf";

// Everything stored here is ciphertext + the metadata needed to decrypt it
// (IV, Argon2 salt). No plaintext credential data or master password ever
// gets written to IndexedDB.

export const VAULT_META_ID = 'singleton'

export interface VaultMetaRecord {
  id: typeof VAULT_META_ID
  salt: Bytes
  kdfParams: KdfParams
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

export interface ProjectRecord {
  id: string
  ciphertext: Bytes
  iv: Bytes
  createdAt: number
}

class VaultDatabase extends Dexie {
  meta!: EntityTable<VaultMetaRecord, 'id'>
  credentials!: EntityTable<CredentialRecord, 'id'>
  projects!: EntityTable<ProjectRecord, 'id'>

  constructor() {
    super('vault')
    this.version(1).stores({
      meta: 'id',
      credentials: 'id, updatedAt',
    })
    this.version(2).stores({
      meta: 'id',
      credentials: 'id, updatedAt',
      projects: 'id, createdAt',
    })
  }
}

export const db = new VaultDatabase()
