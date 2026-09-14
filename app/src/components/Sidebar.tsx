import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Project } from '../lib/vault'

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
  onLock: () => void
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

const itemClass = (active: boolean) =>
  `flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
    active
      ? 'bg-accent text-white'
      : 'text-ink-secondary hover:bg-surface-card hover:text-ink-primary'
  }`

const countBadgeClass = (active: boolean) =>
  `shrink-0 rounded-full px-2 py-0.5 text-xs ${
    active ? 'bg-white/20 text-white' : 'bg-surface-card-border text-ink-muted'
  }`

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
  onLock,
}: SidebarProps) {
  const [projectFilter, setProjectFilter] = useState('')

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(projectFilter.trim().toLowerCase()),
  )

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-surface-card-border bg-surface-page-deep">
      <div className="space-y-3 border-b border-surface-card-border p-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-white">
            <LockIcon className="h-4.5 w-4.5" />
          </span>
          <h1 className="text-lg font-semibold text-ink-primary">Vault9</h1>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-1 text-xs text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          AES-256 Ativo
        </span>
      </div>

      <div className="border-b border-surface-card-border p-3">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input
            placeholder="Filtrar projetos..."
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="w-full rounded-md border border-surface-card-border bg-surface-token py-1.5 pl-8 pr-2 text-sm text-ink-primary placeholder:text-ink-muted outline-none focus:border-accent/60"
          />
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
        <p className="px-3 pb-1 text-xs font-medium tracking-wide text-ink-muted">
          PROJETOS & AMBIENTES
        </p>

        <button
          onClick={() => onSelectProject(ALL_PROJECTS)}
          className={itemClass(selectedProjectId === ALL_PROJECTS)}
        >
          <span className="flex min-w-0 items-center gap-2 truncate">
            <FolderIcon className="h-4 w-4 shrink-0" />
            Todos os Projetos
          </span>
          <span className={countBadgeClass(selectedProjectId === ALL_PROJECTS)}>{totalCount}</span>
        </button>

        {filteredProjects.map((project) => (
          <button
            key={project.id}
            onClick={() => onSelectProject(project.id)}
            className={itemClass(selectedProjectId === project.id)}
          >
            <span className="min-w-0 truncate">{project.name}</span>
            <span className={countBadgeClass(selectedProjectId === project.id)}>
              {projectCounts.get(project.id) ?? 0}
            </span>
          </button>
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

        {creatingProject ? (
          <form onSubmit={onCreateProject} className="space-y-2 px-1 py-2">
            <input
              autoFocus
              placeholder="Nome do projeto"
              value={newProjectName}
              onChange={(e) => onNewProjectNameChange(e.target.value)}
              className="w-full rounded-md border border-surface-card-border bg-surface-token px-2 py-1.5 text-sm text-ink-primary placeholder:text-ink-muted outline-none focus:border-accent/60"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={projectBusy}
                className="rounded-md bg-accent px-2 py-1 text-xs text-white hover:bg-accent-strong disabled:opacity-50"
              >
                Criar
              </button>
              <button
                type="button"
                onClick={onCancelCreatingProject}
                className="rounded-md border border-surface-card-border px-2 py-1 text-xs text-ink-secondary hover:bg-surface-card"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={onStartCreatingProject}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-ink-muted hover:bg-surface-card hover:text-ink-secondary"
          >
            <PlusIcon className="h-4 w-4" />
            Novo projeto
          </button>
        )}
      </nav>

      <div className="border-t border-surface-card-border p-3">
        <button
          onClick={onLock}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-surface-card-border px-3 py-1.5 text-sm text-ink-secondary hover:bg-surface-card"
        >
          <LockIcon className="h-4 w-4" />
          Bloquear Cofre
        </button>
      </div>
    </aside>
  )
}
