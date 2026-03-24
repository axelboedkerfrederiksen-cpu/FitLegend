export function haptic(type: 'set-logged' | 'workout-saved' | 'pr-hit'): void {
  try {
    const wk = (window as any).webkit
    if (wk?.messageHandlers?.haptic) {
      wk.messageHandlers.haptic.postMessage(type)
    }
  } catch {}
}
