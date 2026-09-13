import type {Credential} from '../lib/vault'

interface CredentialCardProps {
    credential: Credential
    revealed: boolean
    copied: boolean
    onToggleReveal: () => void
    onCopyPassword: () => void
    onEdit: () => void
    onDelete: () => void
}

function CopyIcon({className}: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <rect x="9" y="9" width="12" height="12" rx="2"/>
            <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>
        </svg>
    )
}

function CheckIcon({className}: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M20 6 9 17l-5-5"/>
        </svg>
    )
}

export function CredentialCard({
   credential,
   revealed,
   copied,
   onToggleReveal,
   onCopyPassword,
   onEdit,
   onDelete,
}: CredentialCardProps) {

    return (
        <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                            {credential.title}
                        </p>
                        {credential.type && (
                            <span
                                className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                                {credential.type}
                            </span>
                        )}
                    </div>
                    <p className="truncate text-sm text-neutral-500">{credential.username}</p>
                    <p className="mt-1 font-mono text-sm text-neutral-700 dark:text-neutral-300">
                        {revealed ? credential.password : '••••••••'}
                    </p>
                    {credential.url && (
                        <a
                            href={credential.url}
                            target="_blank"
                            rel="noreferrer"
                            className="truncate text-sm text-blue-600 dark:text-blue-400"
                        >
                            {credential.url}
                        </a>
                    )}
                </div>
                <div className="flex shrink-0 items-center gap-2 text-sm">
                    <button
                        onClick={onCopyPassword}
                        title={copied ? 'Copiado!' : 'Copiar senha'}
                        aria-label="Copiar senha"
                        className={
                            copied
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
                        }
                    >
                        {copied ? <CheckIcon className="h-4 w-4"/> : <CopyIcon className="h-4 w-4"/>}
                    </button>
                    <button
                        onClick={onToggleReveal}
                        className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                    >
                        {revealed ? 'Ocultar' : 'Mostrar'}
                    </button>
                    <button
                        onClick={onEdit}
                        className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                    >
                        Editar
                    </button>
                    <button
                        onClick={onDelete}
                        className="text-red-600 hover:text-red-800 dark:text-red-400"
                    >
                        Excluir
                    </button>
                </div>
            </div>
        </div>
    )
}
