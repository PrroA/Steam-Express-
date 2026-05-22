const { spawn } = require('child_process');

const children = [];

function run(name, command, args) {
  const child = spawn(command, args, {
    shell: false,
    stdio: 'inherit',
    env: process.env,
  });

  children.push(child);

  child.on('exit', (code, signal) => {
    if (signal) {
      return;
    }

    if (code && code !== 0) {
      console.error(`${name} exited with code ${code}`);
      shutdown(code);
    }
  });
}

function shutdown(code = 0) {
  while (children.length) {
    const child = children.pop();

    if (child && !child.killed) {
      child.kill();
    }
  }

  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

run('backend', process.execPath, ['server.js']);
run('frontend', process.execPath, [require.resolve('next/dist/bin/next'), 'dev']);
