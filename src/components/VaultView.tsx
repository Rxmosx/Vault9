import { useEffect, useState } from 'react'
import {
  addCredential,
  deleteCredential,
  listCredentials,
  updateCredential,
  type Credential,
  type CredentialInput,
} from '../lib/vault'
import { CredentialForm } from './CredentialForm'

interface VaultViewProps {
  onLock: () => void
}

export function VaultView({ onLock }: VaultViewProps) {
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [revealedId, setRevealedId] = useState<string | null>(null)

  async function refresh() {
    setCredentials(await listCredentials())
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [])

  async function handleAdd(input: CredentialInput) {
    await addCredential(input)
    setAdding(false)
    await refresh()
  }

  async function handleUpdate(id: string, input: CredentialInput) {
    await updateCredential(id, input)
    setEditingId(null)
    await refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta credencial?')) return
    await deleteCredential(id)
    await refresh()
  }

  return (
    <div className="mx-auto min-h-svh max-w-2xl bg-white px-4 py-8 dark:bg-neutral-900">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Cofre
        </h1>
        <button
          onClick={onLock}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-600 dark:text-neutral-100"
        >
          Bloquear
        </button>
      </div>

      {loading ? (
        <p className="text-neutral-500">Carregando...</p>
      ) : (
        <div className="space-y-3">
          {credentials.map((cred) =>
            editingId === cred.id ? (
              <CredentialForm
                key={cred.id}
                initial={cred}
                onSubmit={(input) => handleUpdate(cred.id, input)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div
                key={cred.id}
                className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                      {cred.title}
                    </p>
                    <p className="truncate text-sm text-neutral-500">
                      {cred.username}
                    </p>
                    <p className="mt-1 font-mono text-sm text-neutral-700 dark:text-neutral-300">
                      {revealedId === cred.id ? cred.password : '••••••••'}
                    </p>
                    {cred.url && (
                      <a
                        href={cred.url}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-sm text-blue-600 dark:text-blue-400"
                      >
                        {cred.url}
                      </a>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2 text-sm">
                    <button
                      onClick={() =>
                        setRevealedId(revealedId === cred.id ? null : cred.id)
                      }
                      className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                    >
                      {revealedId === cred.id ? 'Ocultar' : 'Mostrar'}
                    </button>
                    <button
                      onClick={() => setEditingId(cred.id)}
                      className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(cred.id)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            ),
          )}
          {credentials.length === 0 && !adding && (
            <p className="text-neutral-500">Nenhuma credencial ainda.</p>
          )}
        </div>
      )}

      <div className="mt-4">
        {adding ? (
          <CredentialForm onSubmit={handleAdd} onCancel={() => setAdding(false)} />
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white dark:bg-neutral-100 dark:text-neutral-900"
          >
            + Nova credencial
          </button>
        )}
      </div>
    </div>
  )
}
