import { spawn } from 'node:child_process'
import { createServer } from 'vite'

const baseURL = 'http://localhost:5173'

async function isServerReady() {
  try {
    const response = await fetch(baseURL)
    return response.ok
  } catch {
    return false
  }
}

function runPlaywright() {
  const args = ['./node_modules/@playwright/test/cli.js', 'test', '--no-deps', ...process.argv.slice(2)]
  const child = spawn(process.execPath, args, { stdio: 'inherit' })

  return new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('exit', (code, signal) => {
      if (signal) resolve(1)
      else resolve(code ?? 1)
    })
  })
}

let server

try {
  if (!(await isServerReady())) {
    server = await createServer({
      server: {
        host: 'localhost',
        port: 5173,
        strictPort: true,
      },
    })
    await server.listen()
    server.printUrls()
  }

  const exitCode = await runPlaywright()
  process.exitCode = exitCode
} finally {
  if (server) await server.close()
}
