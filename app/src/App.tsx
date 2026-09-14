import { useEffect, useState } from 'react'
import { UnlockScreen } from './components/UnlockScreen'
import { VaultView } from './components/VaultView'
import { hasVault, lock } from './lib/vault'

function App() {
  const [ready, setReady] = useState(false)
  const [vaultExists, setVaultExists] = useState(false)
  const [unlocked, setUnlocked] = useState(false)

  useEffect(() => {
    hasVault().then((exists) => {
      setVaultExists(exists)
      setReady(true)
    })
  }, [])

  if (!ready) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-neutral-950">
        <p className="text-neutral-500">Carregando...</p>
      </div>
    )
  }

  if (!unlocked) {
    return (
      <UnlockScreen
        vaultExists={vaultExists}
        onUnlocked={() => {
          setVaultExists(true)
          setUnlocked(true)
        }}
      />
    )
  }

  return (
    <VaultView
      onLock={() => {
        lock()
        setUnlocked(false)
      }}
    />
  )
}

export default App
