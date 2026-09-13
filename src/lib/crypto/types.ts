// TypeScript's bare `Uint8Array` now defaults to `Uint8Array<ArrayBufferLike>`,
// which the Web Crypto API's BufferSource types reject (they require the
// concrete ArrayBuffer-backed form). Use this alias for any bytes that will
// flow through SubtleCrypto.
export type Bytes = Uint8Array<ArrayBuffer>
