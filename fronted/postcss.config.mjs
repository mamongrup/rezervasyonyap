import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {
      // cwd bazen repo kökü (travel) oluyor; tarama ve çözümleme fronted’e sabitlensin
      base: __dirname,
    },
  },
}

export default config
