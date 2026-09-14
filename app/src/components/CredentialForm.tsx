import {useState} from 'react'
import type {FormEvent} from 'react'
import type {CredentialInput, Project, Credential} from '../lib/vault'

interface CredentialFormProps {
    initial?: Credential
    projects: Project[]
    /** Project the credential is created inside; null lets the user pick one. */
    fixedProjectId: string | null
    typeSuggestions: string[]
    onSubmit: (input: CredentialInput) => Promise<void>
    onCancel: () => void
}

function emptyValues(fixedProjectId: string | null): CredentialInput {
    return {
        title: '',
        username: '',
        credential: '',
        url: '',
        notes: '',
        projectId: fixedProjectId ?? '',
        type: '',
    }
}

function normalizeType(input: string, suggestions: string[]): string {
    const trimmed = input.trim()
    if (!trimmed) return ''
    const existing = suggestions.find(
        (s) => s.toLowerCase() === trimmed.toLowerCase(),
    )
    return existing ?? trimmed
}

function valuesFromCredentials(
    cred: Credential | undefined,
    fixedProjectId: string | null,
): CredentialInput {

    if (!cred) return emptyValues(fixedProjectId)

    const { title, username, credential, url, notes, projectId, type } = cred

    return {title, username, credential, url, notes, projectId, type }
}


const inputClass =
    'w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500'

export function CredentialForm({
   initial,
   projects,
   fixedProjectId,
   typeSuggestions,
   onSubmit,
   onCancel,
}: CredentialFormProps) {

    const [values, setValues] = useState<CredentialInput>(
        valuesFromCredentials(initial, fixedProjectId),
    )
    const [busy, setBusy] = useState(false)

    function update<K extends keyof CredentialInput>(
        key: K,
        value: CredentialInput[K],
    ) {
        setValues((v) => ({...v, [key]: value}))
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault()
        setBusy(true)
        try {
            await onSubmit({
                ...values,
                type: normalizeType(values.type, typeSuggestions),
            })
        } finally {
            setBusy(false)
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-900/60 p-4"
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
                placeholder="Password / Token / Credential"
                type="text"
                required
                value={values.credential}
                autoComplete="off"
                onChange={(e) => update('credential', e.target.value)}
                className={`${inputClass} font-mono`}
            />
            <input
                placeholder="URL (opcional)"
                value={values.url ?? ''}
                onChange={(e) => update('url', e.target.value)}
                className={inputClass}
            />
            <div>
                <input
                    placeholder="Tipo (ex: GitHub, Banco de Dados, API Token)"
                    list="credential-type-suggestions"
                    value={values.type ?? ''}
                    onChange={(e) => update('type', e.target.value)}
                    className={inputClass}
                />
                <datalist id="credential-type-suggestions">
                    {typeSuggestions.map((t) => (
                        <option key={t} value={t}/>
                    ))}
                </datalist>
            </div>
            {fixedProjectId === null && (
                <select
                    value={values.projectId}
                    onChange={(e) => update('projectId', e.target.value)}
                    className={inputClass}
                >
                    <option value="">Sem projeto</option>
                    {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name}
                        </option>
                    ))}
                </select>
            )}
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
                    className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                    {busy ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800"
                >
                    Cancelar
                </button>
            </div>
        </form>
    )
}
