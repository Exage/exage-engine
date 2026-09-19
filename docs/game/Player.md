# Player and GameScene

The First Motion demo displays a 40 × 40 logical-pixel blue rectangle controlled with WASD. It starts at the center of the logical viewport and moves at 400 logical pixels per second.

Sources: [Player.ts](../../src/game/entities/Player.ts), [GameScene.ts](../../src/game/scenes/GameScene.ts), and [main.ts](../../src/main.ts).

## Player

`Player` extends [Entity](../engine/Entity.md) and receives [Input](../engine/Input.md) through its constructor. It uses its inherited Transform for position. It does not receive Engine, Time, Canvas, or a browser event.

| Key        | Direction |
| ---------- | --------- |
| W (`KeyW`) | Up        |
| A (`KeyA`) | Left      |
| S (`KeyS`) | Down      |
| D (`KeyD`) | Right     |

Each `update(dt)` resets a reusable direction vector, reads the held keys, and normalizes a nonzero direction. It multiplies that direction by `400 * dt` and moves through the optional CollisionWorld supplied to its constructor. GameScene supplies this dependency, so the player's 40 × 40 collider stops and slides against solid obstacles. A standalone Player without a collision world moves freely. Delta time is in seconds.

Opposing keys cancel on their axis. Releasing all keys stops movement. Diagonals travel at the same speed as horizontal and vertical movement. Reusing the direction vector avoids creating a new vector each frame.

`render(renderer)` draws the rectangle and barrel rotated around the player's center. The public readonly `width` and `height` are both 40. Its movement collider stays axis-aligned while its body hitbox follows the visual rotation. Command+C shows both outlines. R has no assigned action.

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

The frame chain is `Engine → GameScene → Player`. GameScene inherits entity updates from Scene. It draws the world background, entities, projectiles, and finally the debug overlay. It receives a readonly view of FPS and delta time from the Engine-owned Time instance; Player receives Input and the scene's CollisionWorld. Engine remains independent of the game-specific classes.

## Trying the demo

Run `npm run dev` and open the printed URL. Hold WASD to move and combine keys for diagonal movement. Switching to another tab clears input; returning does not restore held keys or include inactive time in movement. Release and press a key again to resume.

GameScene constrains movement to a 6000 × 2000 world and follows the player with a bounded camera. Mouse movement rotates the player and barrel toward the cursor in world coordinates. Each left click fires one projectile at 1000 logical pixels per second. Forty stationary red targets are distributed across the world; a hit turns a target gray and consumes the projectile. Gray targets no longer block projectiles. Swept collision checks select the nearest active target along each frame segment. Projectiles expire after four seconds or when leaving the world. Reloading resets the scene. Physics and sprite animation are not implemented. See [Debug Overlay](Debug%20Overlay.md) for the displayed diagnostics.

The player and enemies have independent `body` hitboxes. The player's hitbox follows its visual rotation. Enemies have no physical colliders and do not block the player; getting hit disables their hitboxes. Projectile queries use these regions and attack-blocking colliders, allowing walls to shield enemies. Disabling a collider does not disable a hitbox. Command+C displays green colliders and purple hitboxes. See [Collisions](../engine/Collisions.md) and [Hitboxes](../engine/Hitboxes.md) for setup and limitations.

Automated tests cover cardinal directions, diagonal speed, opposing keys, release, zero delta, rendering through Renderer, equal travel at 30/60/120 FPS, focus recovery, blocking and sliding, and projectile obstruction through Engine and GameScene integration.
