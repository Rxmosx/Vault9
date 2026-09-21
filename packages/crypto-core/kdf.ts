// The bundled build inlines its wasm binary as base64, unlike the main
// 'argon2-browser' entry which require()s separate dist files in a way
// that breaks Vite's bundler (top-level await inside a require).
import * as argon2 from 'argon2-browser/dist/argon2-bundled.min.js'
import type { Bytes } from './types'

export const SALT_LENGTH = 16

/**
 * Argon2id cost parameters. mem is in KiB. Tuned as an interactive-login
 * baseline (OWASP min: t=2, m=19456, p=1) with extra memory cost since this
 * runs client-side with no rate limiting to lean on otherwise.
 */

export interface KdfParams {
  time: number
  mem: number
  parallelism: number
  hashLen: number
}

export const KDF_PARAMS: KdfParams = {
  time: 3,
  mem: 65536,
  parallelism: 1,
  hashLen: 32,
}

export function generateSalt(): Bytes {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
}

export interface DerivedKey {
  key: CryptoKey
  salt: Bytes
}

/**
 * Derives a non-extractable AES-256-GCM key from the master password.
 * Pass an existing salt to re-derive the same key on unlock; omit it to
 * generate a fresh salt when creating a vault for the first time.
 */
export async function deriveKey(
  masterPassword: string,
  salt: Bytes = generateSalt(),
  params: KdfParams = KDF_PARAMS,
): Promise<DerivedKey> {
  const result = await argon2.hash({
    pass: masterPassword,
    salt,
    type: argon2.ArgonType.Argon2id,
    ...params,
  })

  // result.hash comes from an ambient .d.ts as a bare (ArrayBufferLike)
  // Uint8Array; copy it into a concrete ArrayBuffer-backed one for
  // importKey's BufferSource requirement.
  const key = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(result.hash),
    'AES-GCM',
    false,
    ['encrypt', 'decrypt'],
  )

  return { key, salt }
}
