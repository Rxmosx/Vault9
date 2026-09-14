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
      ? 'bg-indigo-600 text-white'
      : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100'
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
    <aside className="flex w-60 shrink-0 flex-col border-r border-neutral-800">
      <div className="p-3">
        <h1 className="px-3 py-2 text-lg font-semibold text-neutral-100">Cofre</h1>
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
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={projectBusy}
                className="rounded-md bg-indigo-600 px-2 py-1 text-xs text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                Criar
              </button>
              <button
                type="button"
                onClick={onCancelCreatingProject}
                className="rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-900"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={onStartCreatingProject}
            className="w-full rounded-md px-3 py-2 text-left text-sm text-neutral-500 hover:bg-neutral-900 hover:text-neutral-300"
          >
            + Novo projeto
          </button>
        )}
      </nav>

      <div className="border-t border-neutral-800 p-3">
        <button
          onClick={onLock}
          className="w-full rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-900"
        >
          Bloquear
        </button>
      </div>
    </aside>
  )
}
