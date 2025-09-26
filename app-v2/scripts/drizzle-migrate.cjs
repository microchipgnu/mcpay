#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
const { spawn } = require('node:child_process');

function run(cmd, args, env) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', env });
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} -> ${code}`))));
  });
}

(async () => {
  const env = { ...process.env };
  if (!env.DATABASE_URL) {
    console.log("DRIZZLE MIGRATE", env);
    console.error('DATABASE_URL is required');
    process.exit(1);
  }
  await run('node', ['./node_modules/.bin/drizzle-kit', 'migrate'], env);
})();


