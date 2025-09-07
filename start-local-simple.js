#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting development servers (Simple Local Setup)...\n');

// Kill any existing processes on our ports
console.log('🧹 Cleaning up existing processes...');

// Start FastAPI backend first
console.log('🔧 Starting FastAPI backend on http://localhost:8000');
const backend = spawn('python', ['-m', 'uvicorn', 'app.main:app', '--reload', '--host', '0.0.0.0', '--port', '8000'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    FRONTEND_URL: 'http://localhost:3000',
    BACKEND_URL: 'http://localhost:8000',
    ALLOW_ORIGINS: 'http://localhost:3000,http://localhost:3002,http://192.168.1.32:3000,http://192.168.1.32:3002'
  }
});

// Wait a bit for backend to start
setTimeout(() => {
  // Start Next.js frontend
  console.log('📱 Starting Next.js frontend on http://localhost:3000');
  const frontend = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      NEXT_PUBLIC_API_URL: 'http://localhost:8000',
      NEXT_PUBLIC_WS_URL: 'ws://localhost:8000',
      PORT: '3000'
    }
  });

  setTimeout(() => {
    console.log('\n✅ Servers started!');
    console.log('🌐 Frontend: http://localhost:3000');
    console.log('🌐 Backend: http://localhost:8000');
    console.log('🌐 API Docs: http://localhost:8000/docs');
    console.log('\n💡 For multi-device access:');
    console.log('   Frontend: http://192.168.1.32:3000');
    console.log('   Backend: http://192.168.1.32:8000');
    console.log('\n🔧 If ports are busy, the frontend will auto-select another port');
  }, 3000);

  frontend.on('close', (code) => {
    console.log(`Frontend process exited with code ${code}`);
  });

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down servers...');
    frontend.kill();
    backend.kill();
    setTimeout(() => process.exit(), 2000);
  });

}, 2000);

backend.on('close', (code) => {
  console.log(`Backend process exited with code ${code}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down servers...');
  backend.kill();
  setTimeout(() => process.exit(), 2000);
});