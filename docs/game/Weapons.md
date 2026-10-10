# Weapons

`Weapon` is a game entity shared by players and human enemies. Its instance owns its ammunition, firing interval, projectile speed, and cooldown. Picking it up, swapping it, or dropping it preserves these values; ammo is never restored on transfer. Weapons are not exported by the engine.

Source: [Weapon.ts](../../src/game/entities/Weapon.ts).

## Controls and pickup

- **Left mouse button** fires the held weapon when it has rounds and its cooldown has elapsed.
- **E** picks up the closest available weapon within 64 world pixels. If already armed, the player drops their current weapon and takes the selected one.
- **Right mouse button** drops the current weapon at the player's center. The canvas suppresses the browser context menu.
- An unarmed living human enemy automatically takes an available, nonempty weapon within 48 pixels along its movement route. Dogs cannot equip weapons.

Pickup requires a clear line through attack-blocking obstacles. Dropping or dying releases ownership and leaves the weapon in the scene. A 0.4-second pickup lock prevents immediate recapture. Bullets already in flight retain their original shooter after a weapon changes hands.

## Settings

`new Weapon(x, y, options)` places a loose weapon at its world-space center. Level files use `weapons: [{ x, y, options }]`. `EnemyOptions.weapon` configures its starting weapon; `weapon: null` starts the enemy unarmed. Human spawns otherwise receive a separate weapon entity that `GameScene` registers in `entities` and `weapons`.

| Option            | Pistol        | Rifle         |
| ----------------- | ------------- | ------------- |
| `kind`            | `pistol`      | `rifle`       |
| `ammo`            | 12            | 30            |
| `shotInterval`    | 0.25 s        | 0.12 s        |
| `projectileSpeed` | 1000 px/s     | 1200 px/s     |
| `initialDelay`    | Shot interval | Shot interval |

Enemy starting weapons preserve the existing 1.2-second interval and 450 px/s projectile speed unless overridden. The player starts with a pistol containing 24 rounds and no initial delay. Empty guns remain visible and can be picked up by the player; they cannot fire. There is no reload or automatic ammo refill.

`owner`, `ammo`, and `available` expose current state. `equip(carrier)` enforces a single owner and a single held weapon. `canPickup(carrier, world, range)` checks ground availability, distance, and obstruction; game code calls it before equipping loose weapons. `drop()` releases the carrier. `advance(dt)` advances a held gun's firing cooldown from its actor's combat update; `update(dt)` advances loose gun timers. `fire()` emits at most one projectile per call and deducts one round only on a successful shot. Pausing freezes both actor combat updates and loose weapon updates.
