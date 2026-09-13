import { useState } from 'react'
import type { FormEvent } from 'react'
import type { CredentialInput } from '../lib/vault'

interface CredentialFormProps {
  initial?: CredentialInput
  onSubmit: (input: CredentialInput) => Promise<void>
  onCancel: () => void
}

const EMPTY: CredentialInput = {
  title: '',
  username: '',
  password: '',
  url: '',
  notes: '',
}

const inputClass =
  'w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100'

export function CredentialForm({
  initial,
  onSubmit,
  onCancel,
}: CredentialFormProps) {
  const [values, setValues] = useState<CredentialInput>(initial ?? EMPTY)
  const [busy, setBusy] = useState(false)

  function update<K extends keyof CredentialInput>(
    key: K,
    value: CredentialInput[K],
  ) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    try {
      await onSubmit(values)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-700"
    >
      <input
        placeholder="Título"
        required
        value={values.title}
        onChange={(e) => update('title', e.target.value)}
        className={inputClass}
      />
      <input
        placeholder="Usuário / e-mail"
        value={values.username}
        onChange={(e) => update('username', e.target.value)}
        className={inputClass}
      />
      <input
        placeholder="Senha"
        type="text"
        required
        value={values.password}
        onChange={(e) => update('password', e.target.value)}
        className={`${inputClass} font-mono`}
      />
      <input
        placeholder="URL (opcional)"
        value={values.url ?? ''}
        onChange={(e) => update('url', e.target.value)}
        className={inputClass}
      />
      <textarea
        placeholder="Notas (opcional)"
        value={values.notes ?? ''}
        onChange={(e) => update('notes', e.target.value)}
        rows={2}
        className={inputClass}
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {busy ? 'Salvando...' : 'Salvar'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-600 dark:text-neutral-100"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
