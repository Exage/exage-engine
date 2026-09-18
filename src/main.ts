import './style.css'
import { Engine } from '@/engine'
import { GameScene } from '@/game/scenes/GameScene'

const canvas = document.querySelector('#game')

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('The game canvas was not found')
}

const width = Math.max(1, window.innerWidth)
const height = Math.max(1, window.innerHeight)
const engine = new Engine({ canvas, width, height })
engine.setScene(new GameScene(engine.input, engine.time, width, height))

const resize = (): void => {
  engine.resize(Math.max(1, window.innerWidth), Math.max(1, window.innerHeight))
}
window.addEventListener('resize', resize)
engine.start()

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    window.removeEventListener('resize', resize)
    engine.stop()
  })
}
