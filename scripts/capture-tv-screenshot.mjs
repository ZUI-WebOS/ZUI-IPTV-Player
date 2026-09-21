import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

if (typeof WebSocket === 'undefined') {
  throw new Error('Node 24 gerekli. Ekran_Goruntusu_Al.bat dosyasini kullanin.');
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const screenshotDirectory = path.resolve(scriptDirectory, '..', 'screenshots');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const requestedOutput = process.argv[2] ?? `ZUI-TV-${timestamp}.png`;
const outputPath = path.isAbsolute(requestedOutput)
  ? requestedOutput
  : path.resolve(screenshotDirectory, requestedOutput);

const inspector = spawn(
  process.env.ComSpec ?? 'cmd.exe',
  ['/d', '/s', '/c', 'ares-inspect.cmd -d tv -a com.zui.player'],
  { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] },
);

let combinedOutput = '';
let inspectorUrl;

const urlReady = new Promise((resolve, reject) => {
  const timeout = setTimeout(() => {
    reject(new Error(`Inspector adresi alinamadi. Cikti: ${combinedOutput.trim()}`));
  }, 20_000);

  const collect = (chunk) => {
    combinedOutput += chunk.toString();
    const match = combinedOutput.match(/http:\/\/localhost:\d+\/devtools\/inspector\.html\?ws=\S+/);
    if (match && !inspectorUrl) {
      inspectorUrl = match[0];
      clearTimeout(timeout);
      resolve();
    }
  };

  inspector.stdout.on('data', collect);
  inspector.stderr.on('data', collect);
  inspector.once('error', (error) => {
    clearTimeout(timeout);
    reject(error);
  });
  inspector.once('exit', (code) => {
    if (!inspectorUrl) {
      clearTimeout(timeout);
      reject(new Error(`ares-inspect erken kapandi (kod ${code}).`));
    }
  });
});

async function stopInspector() {
  inspector.stdout.destroy();
  inspector.stderr.destroy();
  if (inspector.killed || inspector.exitCode !== null) return;

  if (process.platform === 'win32' && inspector.pid) {
    await new Promise((resolve) => {
      const killer = spawn(
        'taskkill.exe',
        ['/PID', String(inspector.pid), '/T', '/F'],
        { windowsHide: true, stdio: 'ignore' },
      );
      killer.once('exit', resolve);
      killer.once('error', resolve);
    });
  } else {
    inspector.kill();
  }
}

try {
  await urlReady;
  const endpoint = new URL(inspectorUrl).origin;
  const targets = await (await fetch(`${endpoint}/json/list`)).json();
  const target = targets.find((item) =>
    item.type === 'page' && String(item.url).includes('com.zui.player'),
  ) ?? targets.find((item) => item.type === 'page');

  if (!target?.webSocketDebuggerUrl) {
    throw new Error('ZUI IPTV Player icin inspect edilebilir sayfa bulunamadi.');
  }

  const socket = new WebSocket(target.webSocketDebuggerUrl);
  let nextId = 1;
  const pending = new Map();

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(String(event.data));
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  });

  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  const send = (method, params = {}) => {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  };

  let capture;
  try {
    capture = await send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: false,
    });
  } catch {
    capture = await send('Page.captureScreenshot', { format: 'png' });
  }

  const png = Buffer.from(capture.data, 'base64');
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, png);
  socket.close();

  console.log(`PNG: ${outputPath}`);
  console.log(`Boyut: ${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`);
  console.log(`Bayt: ${png.length}`);
} finally {
  await stopInspector();
}
