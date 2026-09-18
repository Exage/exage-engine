# Scene

`Scene` is a container for game objects. Engine calls the active Scene once per frame, and Scene forwards the update and render calls to its entities.

Source: [Scene.ts](../src/engine/scene/Scene.ts).

## API

| Member             | Purpose                                                 |
| ------------------ | ------------------------------------------------------- |
| `entities`         | The scene's array of Entity instances, initially empty. |
| `add(entity)`      | Append an entity to the array.                          |
| `update(dt)`       | Update each entity with the same delta time in seconds. |
| `render(renderer)` | Render each entity using the same Renderer.             |

Updates and draws follow insertion order. All updates finish before rendering begins. Later draws can cover earlier ones. An empty Scene safely does nothing.

Each Scene has its own array. The array reference is readonly, but its contents are mutable. `add()` does not clone or deduplicate entities: adding the same instance twice causes two calls per pass. Scene iterates the live array; change its contents between passes rather than during update or rendering. Deferred additions and removals are not implemented.

## Connecting a scene

The following example can replace the Engine setup in `main.ts`. It demonstrates a static rectangle; it is not part of the current application entry point.

```ts
import './style.css'
import { Engine, Entity, Scene } from '@/engine'
import type { Renderer } from '@/engine'

class Rectangle extends Entity {
  override render(renderer: Renderer): void {
    const { x, y } = this.transform.position
    renderer.drawRect(x, y, 40, 40, '#66ccff')
  }
}

const canvas = document.querySelector('#game')

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('The game canvas was not found')
}

const engine = new Engine({ canvas, width: 1280, height: 720 })
const scene = new Scene()
const rectangle = new Rectangle()
rectangle.transform.position.set(100, 200)
scene.add(rectangle)
engine.setScene(scene)
engine.start()

if (import.meta.hot) {
  import.meta.hot.dispose(() => engine.stop())
}
```

Engine holds a reference to the selected Scene. `setScene(scene)` can be called before or while running. `setScene(null)` detaches it; the loop continues updating Time, clearing the Canvas, and finishing Input frames.

Engine captures the selected Scene at the beginning of each frame. Selecting another Scene during an update or render takes effect on the next frame, so the current frame updates and renders the same Scene. No enter, exit, or disposal callbacks are invoked.

Stopping Engine preserves the selected Scene and its entities. Restarting resumes that Scene with zero delta on the first frame. If a scene callback stops or restarts Engine, the old frame does not continue into later Engine phases or schedule a duplicate loop. Scene itself still completes its current entity iteration unless an entity throws.

## Frame order

```text
Time.update(timestamp)
Scene.update(time.deltaTime)
Renderer.clear()
Scene.render(renderer)
Input.endFrame()
Request the next animation frame
```

Entities can read [Input](Input.md) during update, including one-frame presses. Cleanup happens after rendering. If update or rendering throws, Engine stops, clears input and timing state, and rethrows the error.

Scene does not own Input, Time, Renderer, or an animation loop. GameScene creates Player using explicitly supplied Input and centers it using logical dimensions. There is no SceneManager, scene stack, or automatic entity removal. See [Player and GameScene](Player.md) for the playable demo.

See [Entity](Entity.md) for game objects and [Engine](Engine.md) for lifecycle details.
