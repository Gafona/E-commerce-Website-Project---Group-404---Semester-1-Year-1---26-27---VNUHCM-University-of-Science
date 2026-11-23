import { spawn } from 'node:child_process'

const [task, ...extraArgs] = process.argv.slice(2)
const commands = {
  dev: ['next', ['dev', '--port', process.env.PORT || '3000', '--hostname', '0.0.0.0']],
  build: ['payload', ['build']],
  start: ['next', ['start']],
  'generate:importmap': ['payload', ['generate:importmap']],
  'generate:types': ['payload', ['generate:types']],
  payload: ['payload', extraArgs],
}

const selected = commands[task]
if (!selected) {
  console.error(`Unknown task: ${task || '(missing)'}`)
  console.error(`Available tasks: ${Object.keys(commands).join(', ')}`)
  process.exit(1)
}

const [command, args] = selected
const env = {
  ...process.env,
  NODE_OPTIONS: [process.env.NODE_OPTIONS, '--no-deprecation'].filter(Boolean).join(' '),
}
const child = spawn(command, args, {
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

child.on('error', (error) => {
  console.error(`Unable to start ${command}: ${error.message}`)
  process.exitCode = 1
})
child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
  } else {
    process.exitCode = code ?? 1
  }
})
