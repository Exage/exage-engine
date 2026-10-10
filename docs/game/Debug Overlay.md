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

## Collider, hitbox, and vision overlays

Press **Command+C** while the game is focused to toggle green outlines for enabled colliders, including the player, projectiles, and added obstacles or triggers. Enemies have no physical colliders. Outlines are hidden initially. They follow the exact collision shape and camera, and render above world objects but below the diagnostic panel. Disabled colliders are omitted.

Enabled hitboxes are drawn in **purple** (`#c084fc`) with a thinner line so coincident green edges remain visible. Their visibility and rotation are independent of physical colliders. The player's body hitbox follows the visual rotation while its collider stays axis-aligned. Enemy hitboxes follow body position and rotation, including configured offsets around the body center. Defeated enemies disable their hitboxes. The panel displays a color legend.

There is no collider-rotation toggle in the demo. Aiming rotates the player's visual body and hitbox without changing its movement collider.

Holding the shortcut does not repeatedly toggle the overlay. The game captures Command+C and prevents its normal browser copy action while Input is running. Plain C does not toggle outlines.

Enemy vision sectors toggle with the same **Command+C** shortcut. Yellow sectors indicate idle sight; orange sectors indicate that the enemy sees the player. The sector shows the configured range and angle without clipping against walls; detection separately checks obstacle occlusion. Defeated enemies and enemies with disabled sight are omitted. See [Enemy configuration and vision](Enemy.md) for defaults and per-spawn overrides.

Patrol areas appear as **blue** (`#38bdf8`) rectangles with the same shortcut. They mark the configured patrol area and remain fixed during pursuit. For wall-to-wall patrols, this area also becomes the home room unless a separate `room` is configured; movement stays within the room even through open doorways. Guards have no patrol rectangle.

## Development cheat menu

When `VITE_ENVIRONMENT=development`, press **Cmd+X** to open or close the cheat menu. Use **Up/Down** to select a row and **Enter/Space** to toggle it, or click a row. **Escape** and the **[X]** button also close the menu. Each row shows its ON/OFF state. The game pauses while the menu is open; menu clicks and the closing frame do not move, aim, or fire the player.

- **Invulnerability** prevents enemy projectile hits from ending the game. Projectiles still collide with the player and disappear on impact.
- **Invisible to enemies** prevents detection, pursuit, and new enemy shots. Patrols continue normally, and shots already in flight can still kill the player unless invulnerability is also enabled.

Both cheats start disabled, persist through an R restart, and reset when a new scene is created or the page is reloaded. Enabling invulnerability after death does not revive the player; close the menu and press R to restart. Production does not register or display the cheat menu and ignores both cheat flags.

Source: [CheatMenu.ts](../../src/game/ui/CheatMenu.ts).
