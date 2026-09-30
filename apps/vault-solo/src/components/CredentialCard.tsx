import { useState } from 'react'
import type { Credential } from '../lib/vault'

interface CredentialCardProps {
    credential: Credential
    projectName?: string
    revealed: boolean
    copied: boolean
    onToggleReveal: () => void
    onCopyPassword: () => void
    onEdit: () => void
    onDelete: () => void
}

export function KeyIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"
             strokeLinejoin="round" className={className}>
            <path
                d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z" />
            <circle cx="16.5" cy="7.5" r="0.5" fill="currentColor" />
        </svg>
    )
}

function CopyIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"
             strokeLinejoin="round" className={className}>
            <rect x="9" y="9" width="12" height="12" rx="2" />
            <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
        </svg>
    )
}

function CheckIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"
             strokeLinejoin="round" className={className}>
            <path d="M20 6 9 17l-5-5" />
        </svg>
    )
}

function EyeIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"
             strokeLinejoin="round" className={className}>
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    )
}

function EyeOffIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"
             strokeLinejoin="round" className={className}>
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
            <path d="m2 2 20 20" />
        </svg>
    )
}

function PencilIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"
             strokeLinejoin="round" className={className}>
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        </svg>
    )
}

function TrashIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"
             strokeLinejoin="round" className={className}>
            <path d="M3 6h18" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
    )
}

function ChevronDownIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"
             strokeLinejoin="round" className={className}>
            <path d="m6 9 6 6 6-6" />
        </svg>
    )
}

function GithubIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
            <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.42c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.54-3.88-1.54-.53-1.33-1.29-1.69-1.29-1.69-1.05-.72.08-.7.08-.7 1.17.08 1.78 1.2 1.78 1.2 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.77.12 3.06.74.8 1.18 1.83 1.18 3.09 0 4.43-2.7 5.4-5.27 5.69.42.36.78 1.07.78 2.16v3.2c0 .32.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
        </svg>
    )
}

function CloudIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"
             strokeLinejoin="round" className={className}>
            <path d="M17.5 19a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.4 1.5A4 4 0 0 0 6.5 19h11Z" />
        </svg>
    )
}

function DatabaseIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"
             strokeLinejoin="round" className={className}>
            <ellipse cx="12" cy="5" rx="8" ry="3" />
            <path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
            <path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
        </svg>
    )
}

function renderTypeIcon(type: string | undefined, className: string) {
    const t = (type ?? '').toLowerCase()
    if (t.includes('github') || t.includes('git')) return <GithubIcon className={className} />
    if (t.includes('aws') || t.includes('cloud') || t.includes('deploy')) return <CloudIcon className={className} />
    if (t.includes('database') || t.includes('db') || t.includes('sql') || t.includes('postgres') || t.includes('mysql')) {
        return <DatabaseIcon className={className} />
    }
    return <KeyIcon className={className} />
}

function formatRelativeUpdated(updatedAt: number): string {
    const diffMs = Date.now() - updatedAt
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays <= 0) {
        const date = new Date(updatedAt)
        return `Modificado hoje às ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    }
    if (diffDays === 1) return 'Modificado ontem'
    return `Modificado há ${diffDays} dias`
}

function normalizeUrl(url: string): string {
    if (!url) return ''
    return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

export const badgeClass =
    'inline-flex shrink-0 items-center rounded-control border border-surface-card-border px-2 py-0.5 text-xs text-ink-secondary'

export const projectBadgeClass =
    'inline-flex shrink-0 items-center rounded-control border border-accent/40 px-2 py-0.5 text-xs text-accent'

export const actionBtn =
    'inline-flex shrink-0 items-center gap-1.5 rounded-control border border-surface-card-border px-2.5 py-1.5 text-xs font-medium text-ink-secondary transition-colors hover:border-ink-muted hover:bg-surface-card hover:text-ink-primary'

export const dangerBtn =
    'inline-flex shrink-0 items-center gap-1.5 rounded-control border border-danger/40 bg-danger-bg px-2.5 py-1.5 text-xs font-medium text-danger-strong transition-colors hover:bg-danger/20'

const iconBtn =
    'flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-ink-muted transition-colors hover:bg-surface-card-border hover:text-ink-primary'

export function CredentialCard({
   credential,
   projectName,
   revealed,
   copied,
   onToggleReveal,
   onCopyPassword,
   onEdit,
   onDelete,
}: CredentialCardProps) {
    const [expanded, setExpanded] = useState(false)

    return (
        <div className="group border-b border-surface-card-border last:border-b-0">
            <div className="flex items-center gap-2 px-2 py-2.5 transition-colors hover:bg-surface-card">
                <button
                    onClick={() => setExpanded((v) => !v)}
                    aria-expanded={expanded}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-control px-2 py-1 text-left"
                >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-surface-card-border text-ink-secondary">
                        {renderTypeIcon(credential.type, 'h-4 w-4')}
                    </span>
                    <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                            <span className="truncate font-medium text-ink-primary">{credential.title}</span>
                            {credential.type && <span className={badgeClass}>{credential.type}</span>}
                            {projectName && <span className={projectBadgeClass}>{projectName}</span>}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-ink-muted">
                            {credential.username && (
                                <span className="font-mono">{credential.username}</span>
                            )}
                            {credential.username && ' – '}
                            {formatRelativeUpdated(credential.updatedAt)}
                        </span>
                    </span>
                    <ChevronDownIcon
                        className={`ml-auto h-4 w-4 shrink-0 text-ink-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
                    />
                </button>

                <div className="flex shrink-0 items-center gap-0.5">
                    <div className="flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                        <button onClick={onEdit} aria-label="Editar" title="Editar" className={iconBtn}>
                            <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                            onClick={onDelete}
                            aria-label="Excluir"
                            title="Excluir"
                            className={`${iconBtn} hover:!text-danger-strong`}
                        >
                            <TrashIcon className="h-4 w-4" />
                        </button>
                    </div>
                    <button
                        onClick={onCopyPassword}
                        aria-label={copied ? 'Copiado' : 'Copiar segredo'}
                        title="Copiar segredo"
                        className={`${iconBtn} ${copied ? '!text-success' : ''}`}
                    >
                        {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            <div
                className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                    expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                }`}
            >
                <div className="overflow-hidden" inert={!expanded}>
                    <div className="space-y-4 px-5 pb-5 pt-2 sm:pl-16">
                        <div>
                            <p className="mb-1.5 text-sm text-ink-secondary">Segredo</p>
                            <div className="flex items-center justify-between gap-3 rounded-control border border-surface-token-border bg-surface-token px-3 py-2">
                                <span className="min-w-0 break-all font-mono text-sm text-ink-secondary">
                                    {revealed ? credential.credential : '••••••••••••••••••••••••'}
                                </span>
                                <button
                                    onClick={onToggleReveal}
                                    className="inline-flex shrink-0 items-center gap-1.5 text-xs text-ink-muted transition-colors hover:text-ink-primary"
                                >
                                    {revealed ? <EyeOffIcon className="h-3.5 w-3.5" /> : <EyeIcon className="h-3.5 w-3.5" />}
                                    {revealed ? 'Ocultar' : 'Mostrar'}
                                </button>
                            </div>
                        </div>

                        {credential.url && (
                            <div>
                                <p className="text-sm text-ink-secondary">Endereço</p>
                                <a
                                    href={normalizeUrl(credential.url)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-0.5 block truncate font-mono text-sm text-link hover:text-link-hover"
                                >
                                    {credential.url}
                                </a>
                            </div>
                        )}

                        {credential.notes && (
                            <div>
                                <p className="text-sm text-ink-secondary">Notas</p>
                                <p className="mt-0.5 max-w-prose whitespace-pre-wrap text-sm leading-relaxed text-ink-primary/90">
                                    {credential.notes}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
