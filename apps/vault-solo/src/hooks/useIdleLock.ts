import { useEffect, useRef } from 'react'

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'] as const

interface UseIdleLockOptions {
    enabled: boolean
    timeoutMs: number
    onIdle: () => void
}

export function useIdleLock({ enabled, timeoutMs, onIdle }: UseIdleLockOptions) {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Guarda a versão mais recente de onIdle sem precisar recriar os
    // listeners toda vez que o componente pai re-renderiza com uma nova
    // função inline.
    const onIdleRef = useRef(onIdle)
    onIdleRef.current = onIdle

    useEffect(() => {
        if (!enabled) return

        function resetTimer() {
            if (timerRef.current) clearTimeout(timerRef.current)
            timerRef.current = setTimeout(() => onIdleRef.current(), timeoutMs)
        }

        resetTimer()

        for (const event of ACTIVITY_EVENTS) {
            window.addEventListener(event, resetTimer, { passive: true })
        }

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current)
            for (const event of ACTIVITY_EVENTS) {
                window.removeEventListener(event, resetTimer)
            }
        }
    }, [enabled, timeoutMs])
}