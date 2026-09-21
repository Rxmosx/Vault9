// AES-256-GCM via the native Web Crypto API. Never reuse an IV with the same
// key: a fresh random IV is generated for every encrypt call.

import type { Bytes } from './types'

export const IV_LENGTH = 12

export interface EncryptedPayload {
  ciphertext: Bytes
  iv: Bytes
}

export async function encrypt(
  key: CryptoKey,
  plaintext: Bytes,
): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext,
  )
  return { ciphertext: new Uint8Array(ciphertext), iv }
}

export async function decrypt(
  key: CryptoKey,
  payload: EncryptedPayload,
): Promise<Bytes> {
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: payload.iv },
    key,
    payload.ciphertext,
  )
  return new Uint8Array(plaintext)
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export async function encryptString(
  key: CryptoKey,
  plaintext: string,
): Promise<EncryptedPayload> {
  return encrypt(key, encoder.encode(plaintext))
}

export async function decryptToString(
  key: CryptoKey,
  payload: EncryptedPayload,
): Promise<string> {
  const bytes = await decrypt(key, payload)
  return decoder.decode(bytes)
}
