import { useState } from 'react'
import type { FormEvent } from 'react'
import { createVault, unlockVault } from '../lib/vault'

interface UnlockScreenProps {
  vaultExists: boolean
  onUnlocked: () => void
}

const inputClass =
  'mt-1.5 w-full rounded-control border border-surface-card-border bg-surface-token px-3 py-2.5 text-ink-primary outline-none transition-colors placeholder:text-ink-muted focus:border-accent'

const SEGMENTS = 9
const RADIUS = 52

function segmentPath(index: number) {
  const step = 360 / SEGMENTS
  const toPoint = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180
    return `${(60 + RADIUS * Math.cos(rad)).toFixed(2)} ${(60 + RADIUS * Math.sin(rad)).toFixed(2)}`
  }
  return `M${toPoint(index * step + 6)}A${RADIUS} ${RADIUS} 0 0 1 ${toPoint(index * step + step - 6)}`
}

/** Anel de 9 segmentos: parado enquanto espera, gira enquanto a chave é derivada. */
function Dial({ busy }: { busy: boolean }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" aria-hidden="true" className="h-28 w-28">
      <g
        stroke="currentColor"
        strokeWidth={5}
        strokeLinecap="round"
        style={{ transformOrigin: '60px 60px' }}
        className={busy ? 'animate-dial text-accent' : 'text-surface-token-border'}
      >
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <path
            key={i}
            d={segmentPath(i)}
            opacity={busy ? 0.25 + (i / SEGMENTS) * 0.75 : 1}
          />
        ))}
      </g>
      <circle
        cx="60"
        cy="60"
        r="9"
        className={busy ? 'fill-accent' : 'fill-ink-muted'}
        style={{ transition: 'fill 200ms' }}
      />
    </svg>
  )
}

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
    <div className="flex min-h-svh items-center justify-center bg-surface-page px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-xs" aria-busy={busy}>
        <Dial busy={busy} />

        <h1 className="mt-8 text-2xl font-semibold tracking-tight text-ink-primary">
          {vaultExists ? 'Desbloquear cofre' : 'Criar cofre'}
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">
          {vaultExists
            ? 'Digite sua master password.'
            : 'Escolha uma master password forte. Ela nunca é armazenada.'}
        </p>

        <div className="mt-7">
          <label htmlFor="password" className="block text-sm font-medium text-ink-secondary">
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
          <div className="mt-4">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-ink-secondary">
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

        {error && (
          <p role="alert" className="mt-4 text-sm text-danger-strong">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full rounded-control bg-accent px-3 py-2.5 font-medium text-on-accent transition-colors hover:bg-accent-strong disabled:opacity-60"
        >
          {busy ? (vaultExists ? 'Desbloqueando...' : 'Criando...') : vaultExists ? 'Desbloquear' : 'Criar cofre'}
        </button>
      </form>
    </div>
  )
}
