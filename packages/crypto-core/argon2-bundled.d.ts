// The bundled build has the wasm binary inlined as base64, avoiding the
// separate-file require()/fetch() that trips up Vite's bundler. It has the
// same runtime shape as the main 'argon2-browser' entry, so reuse its types.
declare module 'argon2-browser/dist/argon2-bundled.min.js' {
  export * from 'argon2-browser'
}
