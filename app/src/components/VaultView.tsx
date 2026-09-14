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
    type Project,
} from '../lib/vault'
import {CredentialForm} from './CredentialForm'
import {CredentialCard} from './CredentialCard'
import {ALL_PROJECTS as ALL, UNASSIGNED_PROJECT as UNASSIGNED, Sidebar} from './Sidebar'

interface VaultViewProps {
    onLock: () => void
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

function KeyStatIcon({className}: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"
             strokeLinejoin="round" className={className}>
            <path
                d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/>
            <circle cx="16.5" cy="7.5" r="0.5" fill="currentColor"/>
        </svg>
    )
}

function FolderStatIcon({className}: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"
             strokeLinejoin="round" className={className}>
            <path d="M4 6a2 2 0 0 1 2-2h3.5l2 2H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/>
        </svg>
    )
}

function TagStatIcon({className}: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"
             strokeLinejoin="round" className={className}>
            <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.828 8.828a2 2 0 0 0 2.828 0l7.172-7.172a2 2 0 0 0 0-2.828Z"/>
            <circle cx="7.5" cy="7.5" r="1" fill="currentColor"/>
        </svg>
    )
}

function ShieldStatIcon({className}: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"
             strokeLinejoin="round" className={className}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>
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

export function VaultView({onLock}: VaultViewProps) {
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
        if (!confirm('Excluir esta credencial?')) return
        await deleteCredential(id)
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
        `shrink-0 rounded-full border px-3 py-1 text-xs ${
            active
                ? 'border-accent bg-accent text-white'
                : 'border-surface-card-border text-ink-secondary hover:bg-surface-card'
        }`

    const statCards = [
        {label: 'Total Armazenado', value: `${projectFiltered.length}`, sub: 'segredos', Icon: KeyStatIcon},
        {label: 'Projetos', value: `${projects.length}`, sub: 'ativos', Icon: FolderStatIcon},
        {label: 'Tipos diferentes', value: `${typesInScope.length}`, sub: 'no escopo atual', Icon: TagStatIcon},
        {label: 'Cifragem do Cofre', value: 'AES-256', sub: 'Segura', Icon: ShieldStatIcon},
    ]

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
            />

            <main className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-5xl px-4 py-6">
                    {/* Barra superior */}
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5 text-sm text-ink-muted">
                            <span>Vault9</span>
                            <span>/</span>
                            <span className="font-medium text-ink-primary">{currentProjectLabel}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <SearchIcon
                                    className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"/>
                                <input
                                    placeholder="Buscar credencial, token, host..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-64 rounded-md border border-surface-card-border bg-surface-token py-1.5 pl-8 pr-2 text-sm text-ink-primary placeholder:text-ink-muted outline-none focus:border-accent/60"
                                />
                            </div>
                            {!adding && (
                                <button
                                    onClick={() => setAdding(true)}
                                    className="rounded-md bg-accent px-3 py-1.5 text-sm text-white hover:bg-accent-strong"
                                >
                                    + Nova credencial
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Cards de estatística */}
                    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                        {statCards.map(({label, value, sub, Icon}) => (
                            <div
                                key={label}
                                className="flex items-start justify-between gap-3 rounded-xl border border-surface-card-border bg-surface-card p-4"
                            >
                                <div className="min-w-0">
                                    <p className="text-xs text-ink-secondary">{label}</p>
                                    <p className="mt-1 text-2xl font-semibold text-ink-primary">{value}</p>
                                    <p className="mt-0.5 truncate text-xs text-ink-muted">{sub}</p>
                                </div>
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-surface-card-border bg-surface-token text-ink-muted">
                                    <Icon className="h-4.5 w-4.5"/>
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Filtros de tipo + ordenação */}
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        {typesInScope.length > 0 && (
                            <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
                                <button
                                    onClick={() => setSelectedType(ALL)}
                                    className={chipClass(selectedType === ALL)}
                                >
                                    Todos os tipos {projectFiltered.length}
                                </button>
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
                        )}

                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortBy)}
                            className="rounded-md border border-surface-card-border bg-surface-token px-2 py-1.5 text-xs text-ink-secondary outline-none focus:border-accent/60"
                        >
                            <option value="recent">Ordenar por: Mais recentes</option>
                            <option value="name">Ordenar por: Nome A-Z</option>
                        </select>
                    </div>

                    <p className="mb-3 text-xs text-ink-muted">
                        Listando {visibleCredentials.length} de {projectFiltered.length} credenciais
                    </p>

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
                        <p className="text-ink-muted">Carregando...</p>
                    ) : (
                        <div className="space-y-3">
                            {visibleCredentials.map((cred) =>
                                    editingId === cred.id ? (
                                        <CredentialForm
                                            key={cred.id}
                                            initial={cred}
                                            projects={projects}
                                            fixedProjectId={null}
                                            typeSuggestions={distinctTypes(credentials)}
                                            onSubmit={(input) => handleUpdate(cred.id, input)}
                                            onCancel={() => setEditingId(null)}
                                        />
                                    ) : (
                                        <CredentialCard
                                            key={cred.id}
                                            credential={cred}
                                            projectName={projects.find((p) => p.id === cred.projectId)?.name}
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
                                <p className="text-ink-muted">Nenhuma credencial ainda.</p>
                            )}
                        </div>
                    )}

                    <p className="mt-8 flex items-center gap-1.5 text-xs text-ink-muted">
                        <span className="h-1.5 w-1.5 rounded-full bg-success"/>
                        Cofre local com criptografia AES-256 ponta a ponta
                    </p>
                </div>
            </main>
        </div>
    )
}
