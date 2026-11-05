// Accept the standard preview host/port flags as well as Next's native flags.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const nextArgs = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--strictPort') continue; // Next fails if an explicit port is busy.
  nextArgs.push(args[i] === '--host' ? '--hostname' : args[i]);
}
if (!nextArgs.some((arg) => ['-p', '--port'].includes(arg))) nextArgs.push('--port', '3000');
if (!nextArgs.some((arg) => ['-H', '--hostname'].includes(arg))) nextArgs.push('--hostname', '0.0.0.0');
const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', ...nextArgs], { stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', (code) => process.exit(code ?? 0));
