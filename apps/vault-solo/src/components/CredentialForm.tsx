import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { CredentialInput, Project, Credential } from '../lib/vault'
import { KeyIcon } from './CredentialCard.tsx'

interface CredentialFormProps {
    initial?: Credential
    projects: Project[]
    /** Project the credential is created inside; null lets the user pick one. */
    fixedProjectId: string | null
    typeSuggestions: string[]
    onSubmit: (input: CredentialInput) => Promise<void>
    onCancel: () => void
    /** Only passed when editing an existing credential. */
    onDelete?: () => void
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

function valuesFromCredential(
    cred: Credential | undefined,
    fixedProjectId: string | null,
): CredentialInput {
    if (!cred) return emptyValues(fixedProjectId)
    const { title, username, credential, url, notes, projectId, type } = cred
    return { title, username, credential, url, notes, projectId, type }
}

// Estimativa de entropia, não um cálculo criptográfico rigoroso — serve só
// como feedback visual pro usuário, nunca é enviada/persistida em lugar nenhum.
function estimateEntropyBits(value: string): number {
    if (!value) return 0
    let poolSize = 0
    if (/[a-z]/.test(value)) poolSize += 26
    if (/[A-Z]/.test(value)) poolSize += 26
    if (/[0-9]/.test(value)) poolSize += 10
    if (/[^a-zA-Z0-9]/.test(value)) poolSize += 32
    if (poolSize === 0) return 0
    return Math.round(value.length * Math.log2(poolSize))
}

function strengthLabel(bits: number): { label: string; level: number; colorClass: string } {
    if (bits === 0) return { label: '', level: 0, colorClass: 'bg-surface-card-border' }
    if (bits < 40) return { label: 'Fraca', level: 1, colorClass: 'bg-danger' }
    if (bits < 60) return { label: 'Média', level: 2, colorClass: 'bg-info' }
    if (bits < 80) return { label: 'Forte', level: 3, colorClass: 'bg-success' }
    return { label: 'Muito Forte', level: 4, colorClass: 'bg-success' }
}

const GENERATED_CHARSET =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*-_=+'

function generateStrongCredential(size: number): string {
    if (size > 256) {
        throw new Error("Bits can not be greater than 256")
    }

    const bytes = crypto.getRandomValues(new Uint32Array(size))

    return Array.from(bytes, (n) => GENERATED_CHARSET[n % GENERATED_CHARSET.length]).join('')
}

const NOTES_MAX_LENGTH = 240
const CHARSET_BITS_PER_CHAR = Math.log2(GENERATED_CHARSET.length) // ~6.55 bits/caractere, dado o charset de 94 símbolos

const CREDENTIAL_BITS_OPTIONS = [32, 64, 128, 192, 256] as const

function bitsToLength(bits: number): number {
    return Math.ceil(bits / CHARSET_BITS_PER_CHAR)
}

const inputClass =
    'w-full rounded-md border border-surface-card-border bg-surface-token px-3 py-2 text-sm text-ink-primary ' +
    'placeholder:text-ink-muted outline-none transition-colors focus:border-accent/60 focus:ring-1 focus:ring-accent/40'

const labelClass = 'mb-1 block text-xs font-medium tracking-wide text-ink-secondary'

export function CredentialForm({
   initial,
   projects,
   fixedProjectId,
   typeSuggestions,
   onSubmit,
   onCancel,
   onDelete,
}: CredentialFormProps) {
    const [values, setValues] = useState<CredentialInput>(
        valuesFromCredential(initial, fixedProjectId),
    )
    const [busy, setBusy] = useState(false)
    const [revealed, setRevealed] = useState(false)
    const [credentialBits, setCredentialBits] = useState<number>(128)
    function update<K extends keyof CredentialInput>(
        key: K,
        value: CredentialInput[K],
    ) {
        setValues((v) => ({ ...v, [key]: value }))
    }

    const entropy = useMemo(() => estimateEntropyBits(values.credential), [values.credential])
    const strength = strengthLabel(entropy)

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

    function handleDeleteClick() {
        if (!onDelete) return
        if (!confirm('Excluir esta credencial? Essa ação não pode ser desfeita.')) return
        onDelete()
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="animate-fade-in rounded-xl border border-surface-card-border bg-surface-card"
        >
            {/* Cabeçalho */}
            <div className="flex items-start gap-3 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ink-muted bg-surface-card-border text-ink-muted/95">
                  <KeyIcon className="h-4 w-4" />
                </span>
                <div>
                    <p className="font-medium text-ink-primary">
                        {initial ? 'Editar credencial' : 'Nova credencial'}
                    </p>
                    <p className="text-xs text-ink-muted">
                        Configure os dados da credencial. Nada aqui é salvo sem cifrar.
                    </p>
                </div>
            </div>

            <div className="space-y-4 border-t border-surface-card-border p-4">
                {/* Nome + Tipo */}
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className={labelClass}>
                            Nome da credencial <span className="text-danger">*</span>
                        </label>
                        <input
                            placeholder="Ex: SSH Poli-server"
                            required
                            value={values.title}
                            onChange={(e) => update('title', e.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Tipo</label>
                        <input
                            placeholder="Ex: GitHub, SSH, API Token"
                            list="credential-type-suggestions"
                            value={values.type ?? ''}
                            onChange={(e) => update('type', e.target.value)}
                            className={inputClass}
                        />
                        <datalist id="credential-type-suggestions">
                            {typeSuggestions.map((t) => (
                                <option key={t} value={t} />
                            ))}
                        </datalist>
                    </div>
                </div>

                {/* Usuário */}
                <div>
                    <label className={labelClass}>Usuário / Proprietário</label>
                    <input
                        placeholder="Usuário ou e-mail"
                        value={values.username}
                        onChange={(e) => update('username', e.target.value)}
                        className={inputClass}
                    />
                </div>

                {/* Credencial (senha/token) */}
                <div>
                    <div className="mb-1 flex items-center justify-between">
                        <label className={labelClass}>
                            Credencial (senha / token) <span className="text-danger">*</span>
                        </label>
                        <div className="flex items-center gap-3 text-xs">
                            <button
                                type="button"
                                onClick={() => update('credential', generateStrongCredential(bitsToLength(credentialBits)))}
                                className="text-accent hover:text-accent-strong"
                            >
                                Gerar credencial
                            </button>
                            <select
                                className="rounded-md border border-surface-card-border bg-surface-token px-2 py-1 text-xs text-ink-primary outline-none focus:border-accent/60"
                                value={credentialBits}
                                onChange={(e) => setCredentialBits(Number(e.target.value))}
                            >
                                {CREDENTIAL_BITS_OPTIONS.map((bits) => (
                                    <option key={bits} value={bits}>
                                        {bits} bits
                                    </option>
                                ))}
                            </select>
                            <span className="text-surface-card-border">|</span>
                            <button
                                type="button"
                                onClick={() => setRevealed((v) => !v)}
                                className="text-ink-muted hover:text-ink-secondary"
                            >
                                {revealed ? 'Ocultar' : 'Mostrar'}
                            </button>
                        </div>
                    </div>
                    <input
                        placeholder="Senha, token ou outra credencial"
                        type={revealed ? 'text' : 'password'}
                        required
                        value={values.credential}
                        autoComplete="off"
                        onChange={(e) => update('credential', e.target.value)}
                        className={`${inputClass} font-mono`}
                    />
                    {values.credential && (
                        <div className="mt-2">
                            <div className="flex gap-1">
                                {[1, 2, 3, 4].map((bar) => (
                                    <span
                                        key={bar}
                                        className={`h-1 flex-1 rounded-full ${
                                            bar <= strength.level ? strength.colorClass : 'bg-surface-card-border'
                                        }`}
                                    />
                                ))}
                            </div>
                            <p className="mt-1 text-xs text-ink-muted">
                                Segurança {strength.label} (entropia ~{entropy} bits)
                            </p>
                        </div>
                    )}
                </div>

                {/* URL + Projeto */}
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className={labelClass}>URL (opcional)</label>
                        <input
                            placeholder="github.com/usuario/repo"
                            value={values.url ?? ''}
                            onChange={(e) => update('url', e.target.value)}
                            className={inputClass}
                        />
                    </div>
                    {fixedProjectId === null && (
                        <div>
                            <label className={labelClass}>Projeto</label>
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
                        </div>
                    )}
                </div>

                {/* Notas */}
                <div>
                    <div className="mb-1 flex items-center justify-between">
                        <label className={labelClass}>Notas (opcional)</label>
                        <span className="text-xs text-ink-muted">
              {(values.notes ?? '').length}/{NOTES_MAX_LENGTH}
            </span>
                    </div>
                    <textarea
                        placeholder="Informações extras, instruções de uso, etc."
                        value={values.notes ?? ''}
                        maxLength={NOTES_MAX_LENGTH}
                        onChange={(e) => update('notes', e.target.value)}
                        rows={3}
                        className={inputClass}
                    />
                </div>
            </div>

            {/* Rodapé */}
            <div className="flex items-center justify-between border-t border-surface-card-border p-4">
                {onDelete ? (
                    <button
                        type="button"
                        onClick={handleDeleteClick}
                        className="text-sm text-danger hover:text-danger-strong"
                    >
                        Excluir credencial
                    </button>
                ) : (
                    <span />
                )}
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-md border border-surface-card-border px-3 py-1.5 text-sm text-ink-secondary hover:bg-surface-card-border/40"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={busy}
                        className="rounded-md bg-accent px-3 py-1.5 text-sm text-white hover:bg-accent-strong disabled:opacity-50"
                    >
                        {busy ? 'Salvando...' : initial ? 'Salvar alterações' : 'Salvar'}
                    </button>
                </div>
            </div>
        </form>
    )
}