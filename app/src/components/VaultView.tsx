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

export function VaultView({onLock}: VaultViewProps) {
    const [credentials, setCredentials] = useState<Credential[]>([])
    const [projects, setProjects] = useState<Project[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedProjectId, setSelectedProjectId] = useState<string>(ALL)
    const [selectedType, setSelectedType] = useState<string>(ALL)
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

    const projectFiltered =
        selectedProjectId === ALL
            ? credentials
            : credentials.filter((c) =>
                belongsToProject(c, selectedProjectId, projects),
            )

    const typesInScope = distinctTypes(projectFiltered)

    const visibleCredentials = projectFiltered.filter((c) => {
        if (selectedType === ALL) return true
        return (c.type ?? '').trim().toLowerCase() === selectedType.toLowerCase()
    })

    const currentProjectLabel =
        selectedProjectId === ALL
            ? 'Todos'
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
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-neutral-700 text-neutral-400 hover:bg-neutral-900'
        }`

    return (
        <div className="flex h-svh bg-neutral-950">
            <Sidebar
                projects={projects}
                selectedProjectId={selectedProjectId}
                hasUnassigned={hasUnassigned}
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

            <main className="flex-1 overflow-y-auto px-4 py-8">
                <div className="mx-auto max-w-4xl">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-neutral-100">
                            {currentProjectLabel}
                        </h2>
                        {!adding && (
                            <button
                                onClick={() => setAdding(true)}
                                className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-500"
                            >
                                + Nova credencial
                            </button>
                        )}
                    </div>

                    {typesInScope.length > 0 && (
                        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                            <button
                                onClick={() => setSelectedType(ALL)}
                                className={chipClass(selectedType === ALL)}
                            >
                                Todos os tipos
                            </button>
                            {typesInScope.map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setSelectedType(t)}
                                    className={chipClass(selectedType.toLowerCase() === t.toLowerCase())}
                                >
                                    {t}
                                </button>
                            ))}
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
                        <p className="text-neutral-500">Carregando...</p>
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
                                <p className="text-neutral-500">Nenhuma credencial ainda.</p>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
