const http = require('http');
const { spawn } = require('child_process');

const child = spawn(process.execPath, ['server/index.js'], {
  env: { ...process.env, PORT: '0' },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let output = '';
let settled = false;
const timeout = setTimeout(() => finish(new Error('Server did not start within 10 seconds.')), 10000);

function finish(error) {
  if (settled) return;
  settled = true;
  clearTimeout(timeout);
  child.kill();
  if (error) {
    console.error(error.message);
    if (output) console.error(output.trim());
    process.exitCode = 1;
    return;
  }
  console.log('Smoke test passed: /healthz returned 200.');
}

child.stdout.on('data', chunk => {
  output += chunk.toString();
  const match = output.match(/Game server running on port (\d+)/);
  if (!match) return;

  const request = http.get(`http://127.0.0.1:${match[1]}/healthz`, response => {
    let body = '';
    response.setEncoding('utf8');
    response.on('data', chunk => { body += chunk; });
    response.on('end', () => {
      if (response.statusCode !== 200 || body.trim() !== '{"status":"ok"}') {
        finish(new Error(`Unexpected /healthz response: ${response.statusCode} ${body}`));
        return;
      }
      finish();
    });
  });
  request.on('error', error => finish(error));
});

child.stderr.on('data', chunk => { output += chunk.toString(); });
child.on('error', finish);
child.on('exit', code => {
  if (!settled && code !== null) finish(new Error(`Server exited before smoke test completed (code ${code}).`));
});
