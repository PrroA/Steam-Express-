const { spawn, spawnSync } = require('child_process');
const net = require('net');

const FRONTEND_PORT = 3000;
const BACKEND_PORT = 4000;
const HOST = '127.0.0.1';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: false,
    env: process.env,
    ...options,
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status && result.status !== 0) {
    process.exit(result.status);
  }
}

function canConnect(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: HOST, port });
    socket.setTimeout(700);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => resolve(false));
  });
}

async function waitForPort(port, timeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await canConnect(port)) return true;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return false;
}

function stopProcessTree(child) {
  if (!child || child.killed) return;

  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }

  child.kill('SIGTERM');
}

async function main() {
  const specs = process.argv.slice(2);
  const frontendRunning = await canConnect(FRONTEND_PORT);
  const backendRunning = await canConnect(BACKEND_PORT);
  let devProcess = null;

  if (frontendRunning !== backendRunning) {
    console.error('E2E needs both frontend 3000 and backend 4000. Please stop the partial dev server and retry.');
    process.exit(1);
  }

  if (!frontendRunning && !backendRunning) {
    run(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.backend.json']);
    run(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.server.json']);

    devProcess = spawn(process.execPath, ['scripts/dev.js'], {
      stdio: 'inherit',
      shell: false,
      env: process.env,
    });

    const frontendReady = await waitForPort(FRONTEND_PORT, 120_000);
    const backendReady = await waitForPort(BACKEND_PORT, 120_000);

    if (!frontendReady || !backendReady) {
      stopProcessTree(devProcess);
      console.error('E2E dev server did not become ready in time.');
      process.exit(1);
    }
  }

  const playwrightArgs = ['node_modules/@playwright/test/cli.js', 'test', ...specs];
  const result = spawnSync(process.execPath, playwrightArgs, {
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      E2E_BASE_URL: `http://localhost:${FRONTEND_PORT}`,
      E2E_API_BASE_URL: `http://${HOST}:${BACKEND_PORT}`,
    },
  });

  if (devProcess) stopProcessTree(devProcess);

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  process.exit(result.status || 0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
