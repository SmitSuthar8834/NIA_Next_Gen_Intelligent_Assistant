#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting development servers with reverse proxy...\n');

// Check if Docker is available
function checkDocker() {
  try {
    const result = spawn('docker', ['--version'], { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

// Create SSL directory if it doesn't exist
if (!fs.existsSync('./ssl')) {
  fs.mkdirSync('./ssl');
}

// Start Next.js frontend
console.log('📱 Starting Next.js frontend on http://localhost:3000');
const frontend = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    NEXT_PUBLIC_API_URL: 'http://localhost/api',
    NEXT_PUBLIC_WS_URL: 'ws://localhost/ws'
  }
});

// Start FastAPI backend
console.log('🔧 Starting FastAPI backend on http://localhost:8000');
const backend = spawn('python', ['-m', 'uvicorn', 'app.main:app', '--reload', '--host', '0.0.0.0', '--port', '8000'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  shell: true
});

// Wait a bit for services to start
setTimeout(() => {
  if (checkDocker()) {
    console.log('🔄 Starting nginx reverse proxy...');
    const proxy = spawn('docker-compose', ['-f', 'docker-compose.local.yml', 'up', '--build'], {
      stdio: 'inherit',
      shell: true
    });

    console.log('\n✅ All servers started!');
    console.log('🌐 Direct Frontend: http://localhost:3000');
    console.log('🌐 Direct Backend: http://localhost:8000');
    console.log('🌐 Proxied (HTTP): http://localhost');
    console.log('🌐 Proxied (HTTPS): https://localhost (self-signed cert)');
    console.log('\n💡 For multi-device access:');
    console.log('   1. Find your local IP: ipconfig (Windows) or ifconfig (Mac/Linux)');
    console.log('   2. Access from other devices: http://YOUR_LOCAL_IP');
    console.log('   3. For HTTPS: https://YOUR_LOCAL_IP (accept security warning)');

    // Handle proxy termination
    proxy.on('close', (code) => {
      console.log(`Proxy process exited with code ${code}`);
    });

    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down servers...');
      frontend.kill();
      backend.kill();
      proxy.kill();
      
      // Stop docker containers
      spawn('docker-compose', ['-f', 'docker-compose.local.yml', 'down'], { 
        stdio: 'inherit', 
        shell: true 
      });
      
      setTimeout(() => process.exit(), 2000);
    });
  } else {
    console.log('\n⚠️  Docker not found. Running without reverse proxy.');
    console.log('🌐 Frontend: http://localhost:3000');
    console.log('🌐 Backend: http://localhost:8000');
    console.log('\n💡 Install Docker to use the reverse proxy for multi-device access');
  }
}, 3000);

frontend.on('close', (code) => {
  console.log(`Frontend process exited with code ${code}`);
});

backend.on('close', (code) => {
  console.log(`Backend process exited with code ${code}`);
});

// Handle process termination (fallback)
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down servers...');
  frontend.kill();
  backend.kill();
  process.exit();
});