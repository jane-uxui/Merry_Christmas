import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

const types = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
};
const initialPort = Number(process.env.PORT || 4173);
let port = initialPort;

const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  const file = path === '/' ? '/index.html' : path;
  if (!/^\/(?:art\/)?[a-zA-Z0-9_.-]+\.[a-z]+$/.test(file)) {
    response.writeHead(404).end();
    return;
  }
  try {
    const body = await readFile(new URL('./public' + file, import.meta.url));
    response.writeHead(200, { 'Content-Type': types[extname(file)] + (extname(file) === '.html' ? '; charset=utf-8' : '') });
    response.end(body);
  } catch {
    response.writeHead(404).end();
  }
});

server.on('error', error => {
  if (error.code === 'EADDRINUSE' && port < initialPort + 10) {
    console.log(`${port} 포트가 사용 중이라 ${port + 1} 포트로 실행합니다.`);
    port += 1;
    server.listen(port, '127.0.0.1');
    return;
  }
  console.error('미리보기 서버를 시작하지 못했어요:', error.message);
  process.exitCode = 1;
});
server.on('listening', () => console.log('http://127.0.0.1:' + port));
server.listen(port, '127.0.0.1');

