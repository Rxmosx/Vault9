import { useState } from 'react'
import type { FormEvent } from 'react'
import { createVault, unlockVault } from '../lib/vault'

interface UnlockScreenProps {
  vaultExists: boolean
  onUnlocked: () => void
}

const inputClass =
  'mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100'

export function UnlockScreen({ vaultExists, onUnlocked }: UnlockScreenProps) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!vaultExists && password !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }
    if (!vaultExists && password.length < 8) {
      setError('Use ao menos 8 caracteres na master password')
      return
    }

    setBusy(true)
    try {
      if (vaultExists) {
        await unlockVault(password)
      } else {
        await createVault(password)
      }
      onUnlocked()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
      setPassword('')
      setConfirmPassword('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-neutral-950 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-neutral-800 bg-neutral-900/60 p-6"
      >
        <div>
          <h1 className="text-xl font-semibold text-neutral-100">
            {vaultExists ? 'Desbloquear cofre' : 'Criar cofre'}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {vaultExists
              ? 'Digite sua master password.'
              : 'Escolha uma master password forte. Ela nunca é armazenada.'}
          </p>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-neutral-300">
            Master password
          </label>
          <input
            id="password"
            type="password"
            autoFocus
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>

        {!vaultExists && (
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-300">
              Confirmar master password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
            />
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {busy ? 'Processando...' : vaultExists ? 'Desbloquear' : 'Criar cofre'}
        </button>
      </form>
    </div>
  )
}
