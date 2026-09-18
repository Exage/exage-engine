# Player and GameScene

The First Motion demo displays a 40 × 40 logical-pixel blue rectangle controlled with WASD. It starts at the center of the logical viewport and moves at 200 logical pixels per second.

Sources: [Player.ts](../../src/game/entities/Player.ts), [GameScene.ts](../../src/game/scenes/GameScene.ts), and [main.ts](../../src/main.ts).

## Player

`Player` extends [Entity](../engine/Entity.md) and receives [Input](../engine/Input.md) through its constructor. It uses its inherited Transform for position. It does not receive Engine, Time, Canvas, or a browser event.

| Key        | Direction |
| ---------- | --------- |
| W (`KeyW`) | Up        |
| A (`KeyA`) | Left      |
| S (`KeyS`) | Down      |
| D (`KeyD`) | Right     |

Each `update(dt)` resets a reusable direction vector, reads the held keys, and normalizes a nonzero direction. It multiplies that direction by `200 * dt` and adds the displacement to its position. Delta time is in seconds.

Opposing keys cancel on their axis. Releasing all keys stops movement. Diagonals travel at the same speed as horizontal and vertical movement. Reusing the direction vector avoids creating a new vector each frame.

`render(renderer)` draws the rectangle at `transform.position`, with that position representing its top-left corner. The public readonly `width` and `height` are both 40. Rotation and scale are stored by Transform but do not affect this drawing yet.

## GameScene and application setup

`new GameScene(input, time, width, height)` creates a Player, centers its rectangle, and adds it to the scene. The public readonly `player` reference allows game code to inspect the player, including the debug overlay.

At 1280 × 720, the top-left position starts at `(620, 340)`, placing the rectangle's center at `(640, 360)`.

```ts
import { Engine } from '@/engine'
import { GameScene } from '@/game/scenes/GameScene'

// canvas is the HTMLCanvasElement validated by application setup.
const width = 1280
const height = 720
const engine = new Engine({ canvas, width, height })
engine.setScene(new GameScene(engine.input, engine.time, width, height))
engine.start()
```

Pass the same logical dimensions to Engine and GameScene. GameScene uses dimensions only for initial placement; it does not retain Canvas or read device pixel ratio. Player and GameScene are game code and are not exported from `@/engine`.

The frame chain is `Engine → GameScene → Player`. GameScene inherits entity updates from Scene. Its render method calls Scene rendering first, then draws the debug overlay. It receives a readonly view of FPS and delta time from the Engine-owned Time instance; Player still receives only Input. Engine remains independent of the game-specific classes.

## Trying the demo

Run `npm run dev` and open the printed URL. Hold WASD to move and combine keys for diagonal movement. Switching to another tab clears input; returning does not restore held keys or include inactive time in movement. Release and press a key again to resume.

There are no boundaries or collisions: the player can move outside the Canvas. Reloading resets it to the center. There is no camera, animation, or physics yet. See [Debug Overlay](Debug%20Overlay.md) for the displayed diagnostics.

Automated tests cover cardinal directions, diagonal speed, opposing keys, release, zero delta, rendering through Renderer, equal travel at 30/60/120 FPS, and focus recovery through Engine with GameScene attached.
