# Engine

`Engine` creates the core systems and runs the browser animation loop. It coordinates work; it does not implement player movement or other gameplay.

Source: [Engine.ts](../src/engine/core/Engine.ts).

## Creating an engine

```ts
import { Engine } from '@/engine'

const canvas = document.querySelector('#game')

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('The game canvas was not found')
}

const engine = new Engine({ canvas, width: 1280, height: 720 })
engine.start()
```

`width` and `height` are logical pixels. Both must be positive integers; invalid dimensions throw a `RangeError`. Construction also throws if Canvas 2D is unavailable.

Construction creates one [Time](Time.md), [Input](Input.md), and [Renderer](Renderer.md). Renderer receives the Canvas and owns it; Engine does not retain a separate Canvas reference. Construction prepares the rendering surface but does not start the loop or keyboard listeners.

## Public API

| Member      | Purpose                                                                         |
| ----------- | ------------------------------------------------------------------------------- |
| `start()`   | Start keyboard listeners and schedule the first frame.                          |
| `stop()`    | Cancel the scheduled frame, remove listeners, and clear timing and input state. |
| `isRunning` | Whether Engine considers its animation loop active.                             |
| `time`      | The owned Time instance, exposing `deltaTime` and `fps`.                        |
| `input`     | The owned Input instance, exposing keyboard state.                              |

`time` and `input` are readonly references. Engine manages their lifecycle. Renderer is private: there is no `engine.renderer` API.

`setScene(scene)` selects a [Scene](Scene.md) for subsequent frames. Pass `null` to detach it. Engine starts without a scene and preserves the selected scene across stop and restart.

Calling `start()` while running does nothing. Calling `stop()` while stopped also does nothing. A stopped engine can be started again using the same system instances.

## Each frame

The current loop follows this order:

```text
requestAnimationFrame callback
  → Time.update(timestamp)
  → Scene.update(dt), if selected
  → Renderer.clear()
  → Scene.render(renderer), if selected
  → Input.endFrame()
  → Schedule the next callback
```

Time calculates the frame interval, Renderer clears the Canvas, and Input discards one-frame transitions while preserving held keys.

The selected Scene updates and renders its entities. Engine captures one Scene per frame, so changing the selection during a callback takes effect on the next frame. If a scene callback stops or restarts Engine, the old frame exits before the next Engine phase. The default application does not attach a scene yet and displays an empty Canvas.

## Stop, restart, and focus

Stopping cancels the pending animation frame, detaches Input listeners and Engine's focus listeners, clears all keyboard state, and resets Time. Restarting establishes a new time reference: the first frame has zero delta and FPS.

While running, Engine resets Time on window `blur`, window `focus`, and document `visibilitychange`. Input separately clears keyboard state on blur or when the document becomes hidden. These events do not call `engine.stop()`; the browser may throttle animation callbacks in the background.

If an operation inside the frame throws, Engine calls `stop()` and rethrows the error. This prevents the loop and its listeners from remaining active after a frame failure.

## Development cleanup

The application entry point stops the old engine when Vite replaces its module:

```ts
if (import.meta.hot) {
  import.meta.hot.dispose(() => engine.stop())
}
```

This avoids leaving an old loop and listeners active during development. See [Getting Started](Getting%20Started.md) for launch commands and [Architecture](Architecture.md) for dependency boundaries.
