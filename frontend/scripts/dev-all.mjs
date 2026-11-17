import { createServer } from 'vite'

const ports = [5173, 5174, 5175, 5176, 5177, 5178]
const servers = await Promise.all(ports.map((port, index) => createServer({
  cacheDir: `node_modules/.vite/port-${port}`,
  server: {
    port,
    strictPort: true,
    hmr: {
      port: 24678 + index,
    },
  },
})))

const activeServers = []
await Promise.all(servers.map(async (server, index) => {
  try {
    await server.listen()
    activeServers.push(server)
  } catch (error) {
    await server.close()
    console.warn(`Port ${ports[index]} is already in use; keeping the existing server.`)
  }
}))

if (activeServers.length === 0) {
  throw new Error('No frontend development port could be started.')
}

for (const server of activeServers) {
  server.printUrls()
}

const shutdown = async () => {
  await Promise.all(activeServers.map((server) => server.close()))
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
