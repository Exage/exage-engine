# Enemy AI lab

Press **F2** in the running game to switch between the existing demo and the enemy AI lab. Switching reconstructs the selected level. The lab contains five isolated rooms connected by a safe corridor, cover that blocks sight, and pistol/rifle racks outside each doorway.

Source: [enemyTestLevel.ts](../../src/game/levels/enemyTestLevel.ts).

## Testing

- **1–5** moves the player to the corresponding room entrance and clears in-flight bullets. Walk up through the doorway to test the enemy.
- **R** resets the lab, including enemies, wounds, guns, ammo, and the player. In the original demo, R still restarts after death.
- **E** picks up or swaps weapons; **RMB** drops them; **LMB** fires.
- **Escape** pauses the simulation.
- **Command+C** toggles vision sectors, patrol areas, colliders, and hitboxes. These overlays start enabled in the lab.

| Room | Enemy  | What to observe                                                                                                                 |
| ---- | ------ | ------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Idle   | Stands until the player enters its 460-pixel detection range. Detects in all directions, pursues, and loses sight behind cover. |
| 2    | Patrol | Loops clockwise around the four corners of a rectangular area. Starts unarmed and picks up the pistol placed along its route.   |
| 3    | Random | Chooses one of four diagonals, walks for 1.5–2.5 seconds, and pauses for 0.5–2 seconds. A pause may include looking around.     |
| 4    | Fat    | Larger purple body. One hit starts 2.5 seconds of bleeding; three hits kill immediately. Later hits do not restart the timer.   |
| 5    | Dog    | Patrols a route, charges at 650 px/s when it sees the player, and kills on body contact. Never fires or carries a weapon.       |

Labels above enemies show their type, current activity, health, remaining rounds, and bleeding countdown when wounded. The bottom panel shows the player's held gun and remaining ammo.

Enemies stay inside their assigned rooms in every movement state, so the connecting corridor is safe from contact attacks. Walls and room limits constrain movement; doorway sight lines can still allow ranged attacks once the player is in range. Vision sectors show cone geometry; actual sight also checks wall obstruction.
