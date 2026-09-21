import { useEffect, useState } from 'react'
import { UnlockScreen } from './components/UnlockScreen'
import { VaultView } from './components/VaultView'
import { Settings } from './components/Settings'
import { useIdleLock } from './hooks/useIdleLock'
import { hasVault, lock, getIdleTimeoutMs, setIdleTimeoutMs } from './lib/vault'
import {DEFAULT_IDLE_TIMEOUT_MS} from './lib/db.ts'

function App() {
    const [ready, setReady] = useState(false)
    const [vaultExists, setVaultExists] = useState(false)
    const [unlocked, setUnlocked] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    const [idleTimeoutMs, setIdleTimeoutMsState] = useState(DEFAULT_IDLE_TIMEOUT_MS)

    useEffect(() => {
        hasVault().then((exists) => {
            setVaultExists(exists)
            setReady(true)
        })
    }, [])

    useIdleLock({
        enabled: unlocked,
        timeoutMs: idleTimeoutMs,
        onIdle: () => {
            lock()
            setUnlocked(false)
            setShowSettings(false)
        },
    })

    async function handleUnlocked() {
        setVaultExists(true)
        setUnlocked(true)
        setIdleTimeoutMsState(await getIdleTimeoutMs())
    }

    async function handleChangeIdleTimeout(ms: number) {
        await setIdleTimeoutMs(ms)
        setIdleTimeoutMsState(ms)
    }

    function handleLock() {
        lock()
        setUnlocked(false)
        setShowSettings(false)
    }

    if (!ready) {
        return (
            <div className="flex min-h-svh items-center justify-center bg-surface-page">
                <p className="text-ink-muted">Carregando...</p>
            </div>
        )
    }

    if (!unlocked) {
        return <UnlockScreen vaultExists={vaultExists} onUnlocked={handleUnlocked} />
    }

    if (showSettings) {
        return (
            <Settings
                idleTimeoutMs={idleTimeoutMs}
                onChangeIdleTimeout={handleChangeIdleTimeout}
                onBack={() => setShowSettings(false)}
                onLocked={() => {
                    setUnlocked(false)
                    setShowSettings(false)
                }}
            />
        )
    }

    return (
        <VaultView
            onLock={handleLock}
            onOpenSettings={() => setShowSettings(true)}
        />
    )
}

export default App