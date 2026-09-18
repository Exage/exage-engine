# Debug Overlay

GameScene draws a small diagnostic panel at the top-left corner after rendering its entities. It uses `Renderer.drawRect()` for the dark background and `Renderer.drawText()` for four lines. There is no separate debug system or direct Canvas access in game code.

| Line       | Meaning                                       | Display format                         |
| ---------- | --------------------------------------------- | -------------------------------------- |
| `FPS`      | Instantaneous frame frequency from Time.      | Rounded to an integer.                 |
| `Delta`    | Simulation step used for movement.            | Seconds, three decimal places.         |
| `Entities` | Current number of entries in the scene.       | Integer; the overlay is not an entity. |
| `Player`   | Player's top-left position in logical pixels. | X and Y with one decimal place.        |

GameScene receives `engine.time` as an explicit constructor dependency, typed as a readonly view exposing only `fps` and `deltaTime`. It reads these values during rendering and does not update or reset Time. Player still receives only Input and gets delta time through `update(dt)`.

The display updates every rendered frame, after movement. FPS is not smoothed. FPS and delta start at zero on the first frame and after a timing reset. Delta is capped at 0.1 seconds, while FPS uses the uncapped interval; they are not always reciprocals.

All panel coordinates use logical pixels, so Renderer handles DPI automatically. The panel is drawn on top of entities and stays visible if Player moves behind it. It is always enabled, including production builds; there is no toggle yet. Formatting only affects the text, not the actual position or timing values.

Source: [GameScene.ts](../../src/game/scenes/GameScene.ts). See [Time](../engine/Time.md), [Renderer](../engine/Renderer.md), and [Player and GameScene](Player.md) for related behavior.
