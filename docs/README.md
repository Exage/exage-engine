# Documentation

Start with [Getting Started](Getting%20Started.md) to run the First Motion demo. Engine documentation describes reusable systems; game documentation covers the WASD demo built with them.

## Project

- [Getting Started](Getting%20Started.md): setup, commands, and running the demo.
- [Architecture](Architecture.md): source structure, ownership, and dependency boundaries.
- [First Motion roadmap](First%20Motion%20%E2%80%94%20Engine%20v0.1%20Roadmap.md): v0.1 scope and completion criteria.

## Engine

- [Camera2D](engine/Camera2D.md): bounded world following and screen-space UI.

- [Engine](engine/Engine.md): startup, shutdown, scene selection, and frame order.
- [Time](engine/Time.md): delta time, FPS, and focus recovery.
- [Input](engine/Input.md): held keys and per-frame transitions.
- [Renderer](engine/Renderer.md): rectangles, text, logical resolution, and DPI.
- [Vector2](engine/Vector2.md): positions, directions, and vector operations.
- [Transform](engine/Transform.md): position, rotation, and scale.
- [Entity](engine/Entity.md): the base game object and lifecycle methods.
- [Scene](engine/Scene.md): entity containers and integration with Engine.

## Game

- [Player and GameScene](game/Player.md): WASD movement and demo composition.
- [Debug Overlay](game/Debug%20Overlay.md): live timing, entity count, and player coordinates.
