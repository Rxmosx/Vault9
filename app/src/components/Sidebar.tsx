import type { FormEvent } from 'react'
import type { Project } from '../lib/vault'

export const ALL_PROJECTS = 'all'
export const UNASSIGNED_PROJECT = ''

interface SidebarProps {
  projects: Project[]
  selectedProjectId: string
  hasUnassigned: boolean
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

const itemClass = (active: boolean) =>
  `block w-full truncate rounded-md px-3 py-2 text-left text-sm ${
    active
      ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
      : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
  }`

export function Sidebar({
  projects,
  selectedProjectId,
  hasUnassigned,
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
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-neutral-200 dark:border-neutral-700">
      <div className="p-3">
        <h1 className="px-3 py-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Cofre
        </h1>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        <button
          onClick={() => onSelectProject(ALL_PROJECTS)}
          className={itemClass(selectedProjectId === ALL_PROJECTS)}
        >
          Todos
        </button>
        {projects.map((project) => (
          <button
            key={project.id}
            onClick={() => onSelectProject(project.id)}
            className={itemClass(selectedProjectId === project.id)}
          >
            {project.name}
          </button>
        ))}
        {hasUnassigned && (
          <button
            onClick={() => onSelectProject(UNASSIGNED_PROJECT)}
            className={itemClass(selectedProjectId === UNASSIGNED_PROJECT)}
          >
            Sem projeto
          </button>
        )}

        {creatingProject ? (
          <form onSubmit={onCreateProject} className="space-y-2 px-1 py-2">
            <input
              autoFocus
              placeholder="Nome do projeto"
              value={newProjectName}
              onChange={(e) => onNewProjectNameChange(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={projectBusy}
                className="rounded-md bg-neutral-900 px-2 py-1 text-xs text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
              >
                Criar
              </button>
              <button
                type="button"
                onClick={onCancelCreatingProject}
                className="rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-600 dark:text-neutral-100"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={onStartCreatingProject}
            className="w-full rounded-md px-3 py-2 text-left text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            + Novo projeto
          </button>
        )}
      </nav>

      <div className="border-t border-neutral-200 p-3 dark:border-neutral-700">
        <button
          onClick={onLock}
          className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-600 dark:text-neutral-100"
        >
          Bloquear
        </button>
      </div>
    </aside>
  )
}
