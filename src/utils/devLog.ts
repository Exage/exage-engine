/** Log development diagnostics without producing output in production. */
export function devLog(...messages: unknown[]): void {
  if (import.meta.env.VITE_ENVIRONMENT === 'development') {
    console.log(...messages)
  }
}
