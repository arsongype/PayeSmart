import { createServer } from 'vite'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const servers = []
const processes = []
const frontendOnly = process.argv.includes('--frontend-only')

const rootDir = resolve(import.meta.dirname, '..', '..')
const backendDir = resolve(rootDir, 'backend')
const aiServiceDir = resolve(rootDir, 'ai-service')

const startProcess = (name, command, args, cwd, env = {}) => {
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })

  child.on('error', (error) => {
    console.error(`[${name}] impossible de démarrer: ${error.message}`)
  })
  child.on('exit', (code, signal) => {
    if (code !== 0 && signal !== 'SIGTERM') {
      console.error(`[${name}] arrêté avec le code ${code ?? signal}`)
    }
  })
  processes.push(child)
}

if (!frontendOnly) {
  const python = process.platform === 'win32'
    ? resolve(aiServiceDir, '.venv', 'Scripts', 'python.exe')
    : resolve(aiServiceDir, '.venv', 'bin', 'python')

  if (!existsSync(python)) {
    throw new Error(`Python IA introuvable: ${python}. Installez d'abord ai-service/.venv.`)
  }

  startProcess('backend', process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'start:dev'], backendDir)
  startProcess('ai-service', python, ['main.py'], aiServiceDir)
}

for (let port = 5173; port <= 5178; port += 1) {
  try {
    const server = await createServer({
      server: {
        host: '0.0.0.0',
        port,
        strictPort: true,
      },
    })

    await server.listen()
    servers.push(server)
  } catch (error) {
    if (error?.code === 'EADDRINUSE' || error?.message?.includes('already in use')) {
      console.error(`Port ${port} deja utilise`)
    } else {
      throw error
    }
  }
}

for (const server of servers) {
  server.printUrls()
}

const shutdown = async () => {
  await Promise.allSettled(servers.map((server) => server.close()))
  for (const child of processes) {
    child.kill()
  }
}

process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
