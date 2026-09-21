import { useRef, useState } from 'react'
import {
    getStorageEstimate,
    exportBackup,
    importBackup,
    resetVault,
} from '../lib/vault'

interface SettingsProps {
    idleTimeoutMs: number
    onChangeIdleTimeout: (ms: number) => void
    onBack: () => void
    /** Chamado depois de importar um backup ou redefinir o cofre — ambos
     * trancam o cofre internamente, então o app precisa voltar pra tela de
     * desbloqueio. */
    onLocked: () => void
}

type Category = 'security' | 'data' | 'general'

const IDLE_TIMEOUT_OPTIONS = [
    { label: '1 minuto', value: 60_000 },
    { label: '5 minutos', value: 5 * 60_000 },
    { label: '15 minutos', value: 15 * 60_000 },
    { label: '30 minutos', value: 30 * 60_000 },
]

const RESET_CONFIRM_WORD = 'REDEFINIR'

function ArrowLeftIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"
             strokeLinejoin="round" className={className}>
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
        </svg>
    )
}

function ShieldIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"
             strokeLinejoin="round" className={className}>
            <path d="M12 2 4 5v6c0 5.25 3.5 9.5 8 11 4.5-1.5 8-5.75 8-11V5Z" />
        </svg>
    )
}

function LockClockIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"
             strokeLinejoin="round" className={className}>
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            <path d="M12 15v2.5" />
        </svg>
    )
}

function DatabaseIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"
             strokeLinejoin="round" className={className}>
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
            <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
        </svg>
    )
}

function InfoIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"
             strokeLinejoin="round" className={className}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
        </svg>
    )
}

function DownloadIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"
             strokeLinejoin="round" className={className}>
            <path d="M12 3v12" />
            <path d="m7 10 5 5 5-5" />
            <path d="M5 21h14" />
        </svg>
    )
}

function UploadIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"
             strokeLinejoin="round" className={className}>
            <path d="M12 21V9" />
            <path d="m7 14 5-5 5 5" />
            <path d="M5 3h14" />
        </svg>
    )
}

const categoryItemClass = (active: boolean) =>
    `flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
        active
            ? 'bg-accent/15 text-accent'
            : 'text-ink-secondary hover:bg-surface-card hover:text-ink-primary'
    }`

function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}

export function Settings({ idleTimeoutMs, onChangeIdleTimeout, onBack, onLocked }: SettingsProps) {
    const [category, setCategory] = useState<Category>('security')

    // --- Dados ---
    const [storageMB, setStorageMB] = useState<number | null>(null)
    const [exporting, setExporting] = useState(false)
    const [importing, setImporting] = useState(false)
    const [importError, setImportError] = useState<string | null>(null)
    const [resetWord, setResetWord] = useState('')
    const [resetting, setResetting] = useState(false)
    const [showResetConfirm, setShowResetConfirm] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    async function loadStorageEstimate() {
        const estimate = await getStorageEstimate()
        setStorageMB(estimate?.usageMB ?? null)
    }

    async function handleExport() {
        setExporting(true)
        try {
            const blob = await exportBackup()
            const date = new Date().toISOString().slice(0, 10)
            downloadBlob(blob, `vault9-backup-${date}.enc.json`)
        } finally {
            setExporting(false)
        }
    }

    async function handleImportFile(file: File) {
        setImportError(null)
        setImporting(true)
        try {
            await importBackup(file)
            onLocked()
        } catch (err) {
            setImportError(err instanceof Error ? err.message : 'Falha ao importar o backup')
        } finally {
            setImporting(false)
        }
    }

    async function handleConfirmReset() {
        setResetting(true)
        try {
            await resetVault()
            onLocked()
        } finally {
            setResetting(false)
            setShowResetConfirm(false)
            setResetWord('')
        }
    }

    return (
        <div className="grid h-svh grid-cols-[0.25fr_1fr] bg-surface-page px-35 py-35 text-ink-primary">
            <aside className="flex flex-col">
                <div className="border-surface-card-border p-4">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink-secondary"
                    >
                        <ArrowLeftIcon className="h-4 w-4" />
                        Voltar ao cofre
                    </button>
                </div>

                <nav className="flex-1 space-y-1 p-3 pt-10">
                    <p className="px-3 pb-1 pt-1 text-xs font-medium tracking-wide text-ink-muted">
                        COFRE & CHAVES
                    </p>
                    <button
                        onClick={() => setCategory('security')}
                        className={categoryItemClass(category === 'security')}
                    >
                        <ShieldIcon className="h-4 w-4 shrink-0" />
                        Segurança
                    </button>
                    <button
                        onClick={() => {
                            setCategory('data')
                            loadStorageEstimate()
                        }}
                        className={categoryItemClass(category === 'data')}
                    >
                        <DatabaseIcon className="h-4 w-4 shrink-0" />
                        Dados
                    </button>

                    <p className="px-3 pb-1 pt-4 text-xs font-medium tracking-wide text-ink-muted">
                        SOBRE
                    </p>
                    <button
                        onClick={() => setCategory('general')}
                        className={categoryItemClass(category === 'general')}
                    >
                        <InfoIcon className="h-4 w-4 shrink-0" />
                        Geral
                    </button>
                </nav>
            </aside>

            <main className="ml-15 overflow-y-auto">
                <div className="max-w-4xl">
                    {category === 'security' && (
                        <section>
                            <h2 className="text-xl font-semibold text-ink-primary">Segurança</h2>
                            <p className="mt-1 text-sm text-ink-muted">
                                Controles de como e quando o cofre se protege automaticamente.
                            </p>

                            <div className="mt-6 overflow-hidden rounded-xl border border-surface-card-border bg-surface-card">
                                <div className="flex items-center gap-2 border-b border-surface-card-border px-4 py-3">
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent/15 text-accent">
                                        <LockClockIcon className="h-4 w-4" />
                                    </span>
                                    <h3 className="text-sm font-medium text-ink-primary">Bloqueio automático</h3>
                                </div>

                                <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-ink-primary">
                                            Bloquear automaticamente após
                                        </p>
                                        <p className="mt-0.5 text-xs text-ink-muted">
                                            O cofre é trancado sozinho depois desse tempo sem nenhuma
                                            interação (mouse, teclado ou toque).
                                        </p>
                                    </div>
                                    <select
                                        value={idleTimeoutMs}
                                        onChange={(e) => onChangeIdleTimeout(Number(e.target.value))}
                                        className="w-full shrink-0 rounded-md border border-surface-card-border bg-surface-token px-3 py-2 text-sm text-ink-primary outline-none focus:border-accent/60 sm:w-48"
                                    >
                                        {IDLE_TIMEOUT_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </section>
                    )}

                    {category === 'data' && (
                        <section>
                            <h2 className="text-xl font-semibold text-ink-primary">Dados</h2>
                            <p className="mt-1 text-sm text-ink-muted">
                                Backup, restauração e tamanho do cofre armazenado neste dispositivo.
                            </p>

                            {/* Backup */}
                            <div className="mt-6 overflow-hidden rounded-xl border border-surface-card-border bg-surface-card">
                                <div className="flex items-center gap-2 border-b border-surface-card-border px-4 py-3">
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent/15 text-accent">
                                        <DatabaseIcon className="h-4 w-4" />
                                    </span>
                                    <h3 className="text-sm font-medium text-ink-primary">Backup e restauração</h3>
                                </div>

                                <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-ink-primary">Exportar backup</p>
                                        <p className="mt-0.5 text-xs text-ink-muted">
                                            Baixa um arquivo com todo o conteúdo do cofre, permanecendo cifrado.
                                            Sem a master password, o arquivo é inútil para qualquer pessoa.
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleExport}
                                        disabled={exporting}
                                        className="flex shrink-0 items-center gap-1.5 rounded-md border border-surface-card-border px-3 py-2 text-sm text-ink-primary hover:bg-surface-token disabled:opacity-50"
                                    >
                                        <DownloadIcon className="h-4 w-4" />
                                        {exporting ? 'Exportando...' : 'Exportar .enc'}
                                    </button>
                                </div>

                                <div className="flex flex-col gap-3 border-t border-surface-card-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-ink-primary">Importar backup</p>
                                        <p className="mt-0.5 text-xs text-ink-muted">
                                            Substitui todo o conteúdo atual do cofre pelo do arquivo. O cofre
                                            é trancado em seguida — você vai precisar da master password
                                            usada no backup para desbloquear de novo.
                                        </p>
                                        {importError && (
                                            <p className="mt-1 text-xs text-danger">{importError}</p>
                                        )}
                                    </div>
                                    <div className="shrink-0">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="application/json"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0]
                                                if (file) handleImportFile(file)
                                                e.target.value = ''
                                            }}
                                        />
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={importing}
                                            className="flex items-center gap-1.5 rounded-md border border-surface-card-border px-3 py-2 text-sm text-ink-primary hover:bg-surface-token disabled:opacity-50"
                                        >
                                            <UploadIcon className="h-4 w-4" />
                                            {importing ? 'Importando...' : 'Escolher arquivo...'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Tamanho */}
                            <div className="mt-4 rounded-xl border border-surface-card-border bg-surface-card px-4 py-3">
                                <p className="text-sm text-ink-secondary">
                                    Tamanho atual do cofre neste dispositivo:{' '}
                                    <span className="font-medium text-ink-primary">
                                        {storageMB === null ? '—' : `${storageMB.toFixed(2)} MB`}
                                    </span>
                                </p>
                            </div>

                            {/* Danger Zone */}
                            <div className="mt-6 overflow-hidden rounded-xl border border-danger/40">
                                <div className="border-b border-danger/40 bg-danger-bg px-4 py-3">
                                    <h3 className="text-sm font-medium text-danger-strong">Zona de risco</h3>
                                </div>

                                <div className="flex flex-col gap-3 bg-surface-card px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-ink-primary">
                                            Redefinir cofre e apagar todos os dados
                                        </p>
                                        <p className="mt-0.5 text-xs text-ink-muted">
                                            Apaga permanentemente todas as credenciais e projetos deste
                                            dispositivo. Sem um backup exportado, não há como recuperar.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowResetConfirm(true)}
                                        className="shrink-0 rounded-md border border-danger/40 bg-danger-bg px-3 py-2 text-sm text-danger-strong hover:bg-danger/20"
                                    >
                                        Redefinir cofre...
                                    </button>
                                </div>
                            </div>
                        </section>
                    )}

                    {category === 'general' && (
                        <section>
                            <h2 className="text-xl font-semibold text-ink-primary">Geral</h2>
                            <p className="mt-1 text-sm text-ink-muted">
                                Sobre este aplicativo.
                            </p>

                            <div className="mt-6 overflow-hidden rounded-xl border border-surface-card-border bg-surface-card">
                                <div className="space-y-2 px-4 py-4 text-sm text-ink-secondary">
                                    <p>
                                        <span className="text-ink-primary">Vault9</span> v{__APP_VERSION__}
                                    </p>
                                    <p>
                                        Criptografia local com AES-256-GCM (Web Crypto API) e derivação de
                                        chave via Argon2id.
                                    </p>
                                    <p>Armazenamento local via IndexedDB (Dexie.js).</p>
                                </div>
                            </div>
                        </section>
                    )}
                </div>
            </main>

            {/* Modal de confirmação da redefinição — exige digitar a palavra exata */}
            {showResetConfirm && (
                <div
                    onClick={() => !resetting && setShowResetConfirm(false)}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-sm rounded-2xl border border-danger/40 bg-surface-card p-5 shadow-2xl"
                    >
                        <h2 className="text-lg font-semibold text-ink-primary">Redefinir cofre?</h2>
                        <p className="mt-2 text-sm text-ink-secondary">
                            Esta ação apaga permanentemente todas as credenciais e projetos.
                            Não pode ser desfeita.
                        </p>
                        <p className="mt-3 text-xs text-ink-muted">
                            Digite <span className="font-mono text-ink-primary">{RESET_CONFIRM_WORD}</span> para confirmar:
                        </p>
                        <input
                            autoFocus
                            value={resetWord}
                            onChange={(e) => setResetWord(e.target.value)}
                            className="mt-2 w-full rounded-md border border-surface-card-border bg-surface-token px-3 py-2 text-sm text-ink-primary outline-none focus:border-danger/60"
                        />
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                onClick={() => setShowResetConfirm(false)}
                                disabled={resetting}
                                className="rounded-md border border-surface-card-border px-3 py-1.5 text-sm text-ink-secondary hover:bg-surface-page disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmReset}
                                disabled={resetWord !== RESET_CONFIRM_WORD || resetting}
                                className="rounded-md bg-danger px-3 py-1.5 text-sm font-medium text-white hover:bg-danger-strong disabled:opacity-40"
                            >
                                {resetting ? 'Redefinindo...' : 'Redefinir cofre'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}