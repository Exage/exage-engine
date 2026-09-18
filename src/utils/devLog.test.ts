import { afterEach, expect, it, vi } from 'vitest'
import { devLog } from '@/utils/devLog'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

it('logs messages in development', () => {
  vi.stubEnv('VITE_ENVIRONMENT', 'development')
  const log = vi.spyOn(console, 'log').mockImplementation(() => {})
  const details = { frames: 1 }
  devLog('Frame', details)
  expect(log).toHaveBeenCalledWith('Frame', details)
})

it('does not log messages in production', () => {
  vi.stubEnv('VITE_ENVIRONMENT', 'production')
  const log = vi.spyOn(console, 'log').mockImplementation(() => {})
  devLog('Frame')
  expect(log).not.toHaveBeenCalled()
})
