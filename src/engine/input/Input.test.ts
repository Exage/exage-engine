import { afterEach, describe, expect, it, vi } from 'vitest'
import { Input } from '@/engine/input/Input'

afterEach(() => vi.unstubAllGlobals())

function setup() {
  const windowTarget = new EventTarget()
  const documentTarget = Object.assign(new EventTarget(), { hidden: false })
  vi.stubGlobal('window', windowTarget)
  vi.stubGlobal('document', documentTarget)
  const input = new Input()
  const key = (type: string, code: string, repeat = false): void => {
    windowTarget.dispatchEvent(Object.assign(new Event(type), { code, repeat }))
  }
  const state = (code: string) => [
    input.isDown(code),
    input.wasPressed(code),
    input.wasReleased(code),
  ]
  input.start()
  return { input, key, state, windowTarget, documentTarget }
}

describe('Input', () => {
  it('preserves held keys while clearing one-frame transitions', () => {
    const { input, key, state } = setup()
    expect(state('KeyW')).toEqual([false, false, false])
    key('keydown', 'KeyW')
    key('keydown', 'KeyD')
    expect(state('KeyW')).toEqual([true, true, false])
    input.endFrame()
    expect(state('KeyW')).toEqual([true, false, false])
    key('keyup', 'KeyW')
    expect(state('KeyW')).toEqual([false, false, true])
    expect(state('KeyD')).toEqual([true, false, false])
    input.endFrame()
    expect(state('KeyW')).toEqual([false, false, false])
    input.stop()
  })

  it('ignores repeated keydowns and releases of keys that are not held', () => {
    const { input, key, state } = setup()
    key('keydown', 'Space')
    input.endFrame()
    key('keydown', 'Space', true)
    key('keydown', 'Space')
    expect(state('Space')).toEqual([true, false, false])
    key('keyup', 'Escape')
    expect(state('Escape')).toEqual([false, false, false])
    input.stop()
  })

  it('retains both transitions for a quick tap between frames', () => {
    const { input, key, state } = setup()
    key('keydown', 'Space')
    key('keyup', 'Space')
    expect(state('Space')).toEqual([false, true, true])
    key('keydown', 'Space')
    expect(state('Space')).toEqual([true, true, true])
    input.endFrame()
    expect(state('Space')).toEqual([true, false, false])
    input.stop()
  })

  it.each(['blur', 'visibilitychange'])('clears every state on %s', (eventName) => {
    const { input, key, state, windowTarget, documentTarget } = setup()
    key('keydown', 'KeyD')
    key('keydown', 'Space')
    key('keyup', 'Space')
    documentTarget.hidden = true
    const target = eventName === 'blur' ? windowTarget : documentTarget
    target.dispatchEvent(new Event(eventName))
    expect(state('KeyD')).toEqual([false, false, false])
    expect(state('Space')).toEqual([false, false, false])
    documentTarget.hidden = false
    windowTarget.dispatchEvent(new Event('focus'))
    key('keydown', 'KeyD', true)
    key('keyup', 'KeyD')
    expect(state('KeyD')).toEqual([false, false, false])
    key('keydown', 'KeyD')
    expect(state('KeyD')).toEqual([true, true, false])
    input.stop()
  })

  it('detaches listeners, clears state, and supports repeated start and stop', () => {
    const { input, key, state, windowTarget, documentTarget } = setup()
    const removeWindow = vi.spyOn(windowTarget, 'removeEventListener')
    const removeDocument = vi.spyOn(documentTarget, 'removeEventListener')
    input.start()
    key('keydown', 'KeyD')
    input.stop()
    input.stop()
    expect(removeWindow).toHaveBeenCalledTimes(3)
    expect(removeDocument).toHaveBeenCalledTimes(1)
    expect(state('KeyD')).toEqual([false, false, false])
    key('keydown', 'KeyD')
    expect(state('KeyD')).toEqual([false, false, false])
    input.start()
    key('keydown', 'KeyD')
    expect(state('KeyD')).toEqual([true, true, false])
    input.stop()
  })
})
