import { Fragment, useState } from 'react'
import type { FormEvent, MouseEvent } from 'react'
import type { Project } from '../lib/vault'
import { dangerBtn } from './CredentialCard.tsx'

export const ALL_PROJECTS = 'all'
export const UNASSIGNED_PROJECT = ''

interface SidebarProps {
    projects: Project[]
    selectedProjectId: string
    hasUnassigned: boolean
    totalCount: number
    unassignedCount: number
    projectCounts: Map<string, number>
    creatingProject: boolean
    newProjectName: string
    projectBusy: boolean
    onSelectProject: (id: string) => void
    onStartCreatingProject: () => void
    onCancelCreatingProject: () => void
    onNewProjectNameChange: (name: string) => void
    onCreateProject: (event: FormEvent) => void
    onDeleteProject: (id: string) => void | Promise<void>
    onLock: () => void
    onOpenSettings: () => void
}

function GearIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"
             strokeLinejoin="round" className={className}>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
    )
}

function LockIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"
             strokeLinejoin="round" className={className}>
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    )
}

function SearchIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"
             strokeLinejoin="round" className={className}>
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.35-4.35" />
        </svg>
    )
}

function FolderIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"
             strokeLinejoin="round" className={className}>
            <path d="M4 6a2 2 0 0 1 2-2h3.5l2 2H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
        </svg>
    )
}

function PlusIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"
             strokeLinejoin="round" className={className}>
            <path d="M12 5v14M5 12h14" />
        </svg>
    )
}

function MoreIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
            <circle cx="5" cy="12" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="19" cy="12" r="1.8" />
        </svg>
    )
}

const itemClass = (active: boolean) =>
    `flex w-full items-center justify-between gap-2 border-l-2 px-3 py-2 text-left text-sm transition-colors ${
        active
            ? 'border-accent bg-surface-card font-medium text-ink-primary'
            : 'border-transparent text-ink-secondary hover:bg-surface-card hover:text-ink-primary'
    }`

const countBadgeClass = (active: boolean) =>
    `shrink-0 font-mono text-xs ${active ? 'text-accent' : 'text-ink-muted'}`

export function Sidebar({
    projects,
    selectedProjectId,
    hasUnassigned,
    totalCount,
    unassignedCount,
    projectCounts,
    creatingProject,
    newProjectName,
    projectBusy,
    onSelectProject,
    onStartCreatingProject,
    onCancelCreatingProject,
    onNewProjectNameChange,
    onCreateProject,
    onDeleteProject,
    onLock,
    onOpenSettings,
}: SidebarProps) {

    const [projectFilter, setProjectFilter] = useState('')
    const [inlineConfirmId, setInlineConfirmId] = useState<string | null>(null)
    const [modalProjectId, setModalProjectId] = useState<string | null>(null)

    const filteredProjects = projects.filter((p) =>
        p.name.toLowerCase().includes(projectFilter.trim().toLowerCase()),
    )

    function handleRightClickOnProject(projectId: string, event: MouseEvent) {
        event.preventDefault()
        setInlineConfirmId((current) => (current === projectId ? null : projectId))
    }

    function cancelInline() {
        setInlineConfirmId(null)
    }

    function openModal(projectId: string) {
        setInlineConfirmId(null)
        setModalProjectId(projectId)
    }

    function closeModal() {
        setModalProjectId(null)
    }

    async function handleConfirmDelete() {
        if (!modalProjectId) return
        const id = modalProjectId
        setModalProjectId(null)
        await onDeleteProject(id)
    }

    const modalProject = projects.find((p) => p.id === modalProjectId)

    return (
        <>
            <aside className="flex w-72 shrink-0 flex-col border-r border-surface-card-border bg-surface-page-deep">
                <div className="flex items-center gap-2.5 border-b border-surface-card-border p-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control border border-accent text-accent">
                        <LockIcon className="h-4 w-4" />
                    </span>
                    <h1 className="text-lg font-semibold tracking-tight text-ink-primary">Vault9</h1>
                    <span className="ml-auto text-xs text-ink-muted">AES-256</span>
                </div>

                <div className="border-b border-surface-card-border p-3">
                    <div className="relative">
                        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                        <input
                            placeholder="Filtrar projetos" aria-label="Filtrar projetos"
                            value={projectFilter}
                            onChange={(e) => setProjectFilter(e.target.value)}
                            className="w-full rounded-control border border-surface-card-border bg-surface-token py-1.5 pl-8 pr-2 text-sm text-ink-primary placeholder:text-ink-muted outline-none focus:border-accent"
                        />
                    </div>
                </div>

                <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
                    <div className="mb-2 flex items-center justify-between px-3">
                        <p className="text-sm font-medium text-ink-muted">Projetos</p>
                        {!creatingProject && (
                            <button
                                onClick={onStartCreatingProject}
                                aria-label="Novo projeto"
                                title="Novo projeto"
                                className="flex h-6 w-6 items-center justify-center rounded-control text-ink-muted transition-colors hover:bg-surface-card hover:text-ink-primary"
                            >
                                <PlusIcon className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    <button
                        onClick={() => onSelectProject(ALL_PROJECTS)}
                        className={itemClass(selectedProjectId === ALL_PROJECTS)}
                    >
                        <span className="flex min-w-0 items-center gap-2 truncate">
                          <FolderIcon className="h-4 w-4 shrink-0" />
                          Todos os projetos
                        </span>
                        <span className={countBadgeClass(selectedProjectId === ALL_PROJECTS)}>{totalCount}</span>
                    </button>

                    {filteredProjects.map((project) => (
                        <Fragment key={project.id}>
                            <div className="group relative">
                                <button
                                    onClick={() => onSelectProject(project.id)}
                                    onContextMenu={(e) => handleRightClickOnProject(project.id, e)}
                                    className={itemClass(selectedProjectId === project.id)}
                                >
                                    <span className="min-w-0 truncate">{project.name}</span>
                                    <span className={`${countBadgeClass(selectedProjectId === project.id)} group-hover:invisible group-focus-within:invisible`}>
                                        {projectCounts.get(project.id) ?? 0}
                                    </span>
                                </button>
                                <button
                                    onClick={() => setInlineConfirmId((c) => (c === project.id ? null : project.id))}
                                    aria-label={`Opções de ${project.name}`}
                                    className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-control p-1 text-ink-muted hover:text-ink-primary focus-visible:block group-hover:block group-focus-within:block"
                                >
                                    <MoreIcon className="h-4 w-4" />
                                </button>
                            </div>

                            {inlineConfirmId === project.id && (
                                <div className="flex items-center justify-between gap-2 px-1 py-1">
                                    <span className="truncate text-xs text-ink-muted">Excluir "{project.name}"?</span>
                                    <div className="flex gap-1.5">
                                        <button
                                            onClick={() => openModal(project.id)}
                                            className={`${dangerBtn} px-2 py-1 text-xs`}
                                        >
                                            Excluir
                                        </button>
                                        <button
                                            onClick={cancelInline}
                                            className="rounded-control border border-surface-card-border px-2 py-1 text-xs text-ink-secondary hover:bg-surface-card"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </Fragment>
                    ))}

                    {hasUnassigned && (
                        <button
                            onClick={() => onSelectProject(UNASSIGNED_PROJECT)}
                            className={itemClass(selectedProjectId === UNASSIGNED_PROJECT)}
                        >
                            <span className="min-w-0 truncate">Sem projeto</span>
                            <span className={countBadgeClass(selectedProjectId === UNASSIGNED_PROJECT)}>
                                {unassignedCount}
                            </span>
                        </button>
                    )}

                    {creatingProject && (
                        <form onSubmit={onCreateProject} className="space-y-2 px-1 py-2">
                            <input
                                autoFocus
                                placeholder="Nome do projeto"
                                value={newProjectName}
                                onChange={(e) => onNewProjectNameChange(e.target.value)}
                                className="w-full rounded-control border border-surface-card-border bg-surface-token px-2 py-1.5 text-sm text-ink-primary placeholder:text-ink-muted outline-none focus:border-accent"
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={onCancelCreatingProject}
                                    className="rounded-control border border-surface-card-border px-2.5 py-1 text-xs text-ink-secondary hover:bg-surface-card"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={projectBusy}
                                    className="rounded-control bg-accent px-3 py-1 text-xs font-medium text-on-accent hover:bg-accent-strong disabled:opacity-50"
                                >
                                    Criar
                                </button>
                            </div>
                        </form>
                    )}
                </nav>

                <div className="space-y-1 border-t border-surface-card-border p-3">
                    <button
                        onClick={onOpenSettings}
                        className="flex w-full items-center gap-2 rounded-control px-3 py-2 text-sm text-ink-secondary transition-colors hover:bg-surface-card hover:text-ink-primary"
                    >
                        <GearIcon className="h-4 w-4" />
                        Configurações
                    </button>
                    <button
                        onClick={onLock}
                        className="flex w-full items-center gap-2 rounded-control px-3 py-2 text-sm text-ink-secondary transition-colors hover:bg-surface-card hover:text-ink-primary"
                    >
                        <LockIcon className="h-4 w-4" />
                        Bloquear cofre
                    </button>
                </div>
            </aside>


            {modalProjectId && (
                <div
                    onClick={closeModal}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-sm rounded-control border border-surface-card-border bg-surface-card p-5"
                    >
                        <h2 className="text-lg font-semibold text-ink-primary">
                            Excluir "{modalProject?.name}"?
                        </h2>
                        <p className="mt-2 text-sm text-ink-secondary">
                            As credenciais dele passam a ficar{' '}
                            <span className="text-ink-primary">"Sem projeto"</span>.
                        </p>

                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                onClick={closeModal}
                                className="rounded-control border border-surface-card-border px-3 py-1.5 text-sm text-ink-secondary hover:bg-surface-page"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                className={`${dangerBtn} px-3 py-1.5 text-sm`}
                            >
                                Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}