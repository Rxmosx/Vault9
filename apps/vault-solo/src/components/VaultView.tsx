import {useEffect, useState} from 'react'
import type {FormEvent} from 'react'
import {
    addCredential,
    createProject,
    deleteCredential,
    listCredentials,
    listProjects,
    updateCredential,
    type Credential,
    type CredentialInput,
    type Project, deleteProject,
} from '../lib/vault'
import {CredentialForm} from './CredentialForm'
import {CredentialCard} from './CredentialCard'
import {ALL_PROJECTS as ALL, UNASSIGNED_PROJECT as UNASSIGNED, Sidebar} from './Sidebar'

interface VaultViewProps {
    onLock: () => void
    onOpenSettings: () => void
}

type SortBy = 'recent' | 'name'

function SearchIcon({className}: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"
             strokeLinejoin="round" className={className}>
            <circle cx="11" cy="11" r="7"/>
            <path d="m21 21-4.35-4.35"/>
        </svg>
    )
}

function belongsToProject(
    cred: Credential,
    projectId: string,
    projects: Project[],
): boolean {
    if (projectId === UNASSIGNED) {
        return !cred.projectId || !projects.some((p) => p.id === cred.projectId)
    }
    return cred.projectId === projectId
}

function distinctTypes(creds: Credential[]): string[] {
    const seen = new Map<string, string>()
    for (const cred of creds) {
        const t = cred.type?.trim()
        if (!t) continue
        const key = t.toLowerCase()
        if (!seen.has(key)) seen.set(key, t)
    }
    return [...seen.values()]
}

function typeCounts(creds: Credential[]): { label: string; count: number }[] {
    const map = new Map<string, { label: string; count: number }>()
    for (const cred of creds) {
        const t = cred.type?.trim()
        if (!t) continue
        const key = t.toLowerCase()
        const entry = map.get(key)
        if (entry) entry.count += 1
        else map.set(key, {label: t, count: 1})
    }
    return [...map.values()]
}

function matchesSearch(cred: Credential, query: string): boolean {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return (
        cred.title.toLowerCase().includes(q) ||
        (cred.username ?? '').toLowerCase().includes(q) ||
        (cred.url ?? '').toLowerCase().includes(q) ||
        (cred.type ?? '').toLowerCase().includes(q)
    )
}

function sortCredentials(creds: Credential[], sortBy: SortBy): Credential[] {
    if (sortBy === 'name') {
        return [...creds].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
    }
    return creds
}

export function VaultView({ onLock, onOpenSettings }: VaultViewProps) {

    const [credentials, setCredentials] = useState<Credential[]>([])
    const [projects, setProjects] = useState<Project[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedProjectId, setSelectedProjectId] = useState<string>(ALL)
    const [selectedType, setSelectedType] = useState<string>(ALL)
    const [searchQuery, setSearchQuery] = useState('')
    const [sortBy, setSortBy] = useState<SortBy>('recent')
    const [adding, setAdding] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [revealedId, setRevealedId] = useState<string | null>(null)
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [creatingProject, setCreatingProject] = useState(false)
    const [newProjectName, setNewProjectName] = useState('')
    const [projectBusy, setProjectBusy] = useState(false)

    async function refresh() {
        const [creds, projs] = await Promise.all([listCredentials(), listProjects()])
        setCredentials(creds)
        setProjects(projs)
    }

    useEffect(() => {
        refresh().finally(() => setLoading(false))
    }, [])

    useEffect(() => {
        if (!revealedId) return

        const timer = setTimeout(() => setRevealedId(null), 15_000)
        return () => clearTimeout(timer)
    }, []);

    function selectProject(id: string) {
        setSelectedProjectId(id)
        setSelectedType(ALL)
    }

    const hasUnassigned = credentials.some(
        (c) => !c.projectId || !projects.some((p) => p.id === c.projectId),
    )

    const projectCounts = new Map<string, number>()
    for (const project of projects) {
        projectCounts.set(
            project.id,
            credentials.filter((c) => belongsToProject(c, project.id, projects)).length,
        )
    }
    const unassignedCount = credentials.filter((c) =>
        belongsToProject(c, UNASSIGNED, projects),
    ).length

    const projectFiltered =
        selectedProjectId === ALL
            ? credentials
            : credentials.filter((c) =>
                belongsToProject(c, selectedProjectId, projects),
            )

    const typesInScope = typeCounts(projectFiltered)

    const byType = projectFiltered.filter((c) => {
        if (selectedType === ALL) return true
        return (c.type ?? '').trim().toLowerCase() === selectedType.toLowerCase()
    })

    const bySearch = byType.filter((c) => matchesSearch(c, searchQuery))

    const visibleCredentials = sortCredentials(bySearch, sortBy)

    const currentProjectLabel =
        selectedProjectId === ALL
            ? 'Todos os Projetos'
            : selectedProjectId === UNASSIGNED
                ? 'Sem projeto'
                : (projects.find((p) => p.id === selectedProjectId)?.name ?? 'Projeto')

    const fixedProjectId = selectedProjectId === ALL ? null : selectedProjectId

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
        await deleteCredential(id)
        setEditingId((current) => (current === id ? null : current))
        setRevealedId((current) => (current === id ? null : current))
        setCopiedId((current) => (current === id ? null : current))
        await refresh()
    }

    async function handleCreateProject(event: FormEvent) {
        event.preventDefault()
        const name = newProjectName.trim()
        if (!name) return
        setProjectBusy(true)
        try {
            const project = await createProject(name)
            setNewProjectName('')
            setCreatingProject(false)
            await refresh()
            selectProject(project.id)
        } finally {
            setProjectBusy(false)
        }
    }

    async function handleDeleteProject(projectId: string) {
        await deleteProject(projectId)
        setSelectedProjectId((current) => (current === projectId ? ALL : current))
        await refresh()
    }

    async function handleCopyPassword(id: string, password: string) {
        await navigator.clipboard.writeText(password)
        setCopiedId(id)
        setTimeout(() => {
            setCopiedId((current) => (current === id ? null : current))
        }, 2_000)

        setTimeout(async () => {
            const current = await navigator.clipboard.readText().catch(() => null)
            if (current === password) await navigator.clipboard.writeText('')
        }, 20_000)
    }

    const chipClass = (active: boolean) =>
        `shrink-0 rounded-control border px-3 py-1 text-xs transition-colors ${
            active
                ? 'border-accent text-accent'
                : 'border-surface-card-border text-ink-secondary hover:bg-surface-card'
        }`

    return (
        <div className="flex h-svh bg-surface-page-deep">
            <Sidebar
                projects={projects}
                selectedProjectId={selectedProjectId}
                hasUnassigned={hasUnassigned}
                totalCount={credentials.length}
                unassignedCount={unassignedCount}
                projectCounts={projectCounts}
                creatingProject={creatingProject}
                onDeleteProject={handleDeleteProject}
                newProjectName={newProjectName}
                projectBusy={projectBusy}
                onSelectProject={selectProject}
                onStartCreatingProject={() => setCreatingProject(true)}
                onCancelCreatingProject={() => {
                    setCreatingProject(false)
                    setNewProjectName('')
                }}
                onNewProjectNameChange={setNewProjectName}
                onCreateProject={handleCreateProject}
                onLock={onLock}
                onOpenSettings={onOpenSettings}
            />

            <main className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-4xl px-6 py-8">
                    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-semibold tracking-tight text-ink-primary">
                                {currentProjectLabel}
                            </h2>
                            <p className="mt-1 text-sm text-ink-muted">
                                {projectFiltered.length} {projectFiltered.length === 1 ? 'segredo' : 'segredos'}
                                {typesInScope.length > 0 &&
                                    `, ${typesInScope.length} ${typesInScope.length === 1 ? 'tipo' : 'tipos'}`}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <SearchIcon
                                    className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"/>
                                <input
                                    placeholder="Buscar por nome, usuário ou endereço"
                                    aria-label="Buscar credenciais"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-72 rounded-control border border-surface-card-border bg-surface-token py-2 pl-8 pr-2 text-sm text-ink-primary placeholder:text-ink-muted outline-none transition-colors focus:border-accent"
                                />
                            </div>
                            {!adding && (
                                <button
                                    onClick={() => setAdding(true)}
                                    className="rounded-control bg-accent px-3.5 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong"
                                >
                                    Nova credencial
                                </button>
                            )}
                        </div>
                    </header>

                    <div>
                        {(typesInScope.length > 0 || projectFiltered.length > 1) && (
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap gap-2">
                                    {typesInScope.length > 0 && (
                                        <button
                                            onClick={() => setSelectedType(ALL)}
                                            className={chipClass(selectedType === ALL)}
                                        >
                                            Todos os tipos {projectFiltered.length}
                                        </button>
                                    )}
                                    {typesInScope.map(({label, count}) => (
                                        <button
                                            key={label}
                                            onClick={() => setSelectedType(label)}
                                            className={chipClass(selectedType.toLowerCase() === label.toLowerCase())}
                                        >
                                            {label} {count}
                                        </button>
                                    ))}
                                </div>

                                <select
                                    value={sortBy}
                                    aria-label="Ordenar credenciais"
                                    onChange={(e) => setSortBy(e.target.value as SortBy)}
                                    className="rounded-control border border-surface-card-border bg-surface-token px-2 py-1.5 text-xs text-ink-secondary outline-none focus:border-accent"
                                >
                                    <option value="recent">Mais recentes</option>
                                    <option value="name">Nome, A a Z</option>
                                </select>
                            </div>
                        )}

                        {adding && (
                            <div className="mb-4">
                                <CredentialForm
                                    projects={projects}
                                    fixedProjectId={fixedProjectId}
                                    typeSuggestions={distinctTypes(credentials)}
                                    onSubmit={handleAdd}
                                    onCancel={() => setAdding(false)}
                                />
                            </div>
                        )}

                        {loading ? (
                            <div className="border-t border-surface-card-border" aria-busy="true" aria-label="Carregando credenciais">
                                {[0, 1, 2].map((i) => (
                                    <div key={i} className="flex items-center gap-3 border-b border-surface-card-border px-4 py-4">
                                        <span className="h-8 w-8 rounded-control bg-surface-card" />
                                        <span className="h-3 w-40 rounded-control bg-surface-card" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="border-t border-surface-card-border">
                                {visibleCredentials.map((cred) =>
                                        editingId === cred.id ? (
                                            <div key={cred.id} className="py-3">
                                                <CredentialForm
                                                    initial={cred}
                                                    projects={projects}
                                                    fixedProjectId={null}
                                                    typeSuggestions={distinctTypes(credentials)}
                                                    onSubmit={(input) => handleUpdate(cred.id, input)}
                                                    onCancel={() => setEditingId(null)}
                                                />
                                            </div>
                                        ) : (
                                            <CredentialCard
                                                key={cred.id}
                                                credential={cred}
                                                projectName={
                                                    selectedProjectId === ALL
                                                        ? projects.find((p) => p.id === cred.projectId)?.name
                                                        : undefined
                                                }
                                                revealed={revealedId === cred.id}
                                                copied={copiedId === cred.id}
                                                onToggleReveal={() =>
                                                    setRevealedId(revealedId === cred.id ? null : cred.id)
                                                }
                                                onCopyPassword={() => handleCopyPassword(cred.id, cred.credential)}
                                                onEdit={() => setEditingId(cred.id)}
                                                onDelete={() => handleDelete(cred.id)}
                                            />
                                        ),
                                )}
                                {visibleCredentials.length === 0 && !adding && (
                                    <div className="py-16 text-center">
                                        {projectFiltered.length === 0 ? (
                                            <>
                                                <p className="font-medium text-ink-primary">
                                                    Este cofre ainda não tem segredos
                                                </p>
                                                <p className="mt-1 text-sm text-ink-muted">
                                                    Guarde a primeira senha, chave ou token.
                                                </p>
                                                <button
                                                    onClick={() => setAdding(true)}
                                                    className="mt-4 rounded-control bg-accent px-3.5 py-2 text-sm font-medium text-on-accent hover:bg-accent-strong"
                                                >
                                                    Nova credencial
                                                </button>
                                            </>
                                        ) : (
                                            <p className="text-sm text-ink-muted">
                                                Nenhum resultado. Tente outro termo ou limpe os filtros.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {copiedId && (
                <div
                    role="status"
                    className="animate-toast pointer-events-none fixed bottom-6 left-1/2 -translate-x-1/2 rounded-control border border-surface-card-border bg-surface-card px-4 py-2 text-sm text-ink-primary"
                >
                    Copiado. A área de transferência é limpa em 20 segundos.
                </div>
            )}
        </div>
    )
}
