import './style.css'
import { Engine } from '@/engine'

const canvas = document.querySelector('#game')

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('The game canvas was not found')
}

const engine = new Engine({ canvas, width: 1280, height: 720 })

engine.start()

if (import.meta.hot) {
  import.meta.hot.dispose(() => engine.stop())
}
