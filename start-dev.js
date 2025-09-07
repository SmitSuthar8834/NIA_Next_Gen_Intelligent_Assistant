#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting development servers...\n');

// Start Next.js frontend
console.log('📱 Starting Next.js frontend on http://localhost:3000');
const frontend = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true
});

// Start FastAPI backend
console.log('🔧 Starting FastAPI backend on http://localhost:8000');
const backend = spawn('uvicorn', ['app.main:app', '--reload'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  shell: true
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down servers...');
  frontend.kill();
  backend.kill();
  process.exit();
});

frontend.on('close', (code) => {
  console.log(`Frontend process exited with code ${code}`);
});

backend.on('close', (code) => {
  console.log(`Backend process exited with code ${code}`);
});