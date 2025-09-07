#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting ngrok for WebRTC meetings...\n');

// Start ngrok for the backend (port 8000)
const ngrok = spawn('ngrok', ['http', '8000', '--log=stdout'], {
  stdio: 'pipe'
});

let ngrokUrl = '';

ngrok.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(output);
  
  // Extract the ngrok URL
  const urlMatch = output.match(/https:\/\/[a-z0-9-]+\.ngrok-free\.app/);
  if (urlMatch && !ngrokUrl) {
    ngrokUrl = urlMatch[0];
    console.log(`\n✅ Ngrok tunnel established: ${ngrokUrl}`);
    console.log('\n📝 To use this with your app:');
    console.log('1. Update your .env.local file with:');
    console.log(`   NEXT_PUBLIC_WS_URL=${ngrokUrl.replace('https://', 'wss://')}`);
    console.log(`   NEXT_PUBLIC_API_URL=${ngrokUrl}`);
    console.log('\n2. Restart your Next.js development server');
    console.log('\n3. Share meeting URLs like:');
    console.log(`   ${ngrokUrl.replace('https://', 'http://localhost:3000')}/meeting/room-name`);
    console.log('\n⚠️  Note: You\'ll need to run your Next.js app on localhost:3000');
    console.log('   The backend API calls will go through ngrok, but the frontend stays local');
  }
});

ngrok.stderr.on('data', (data) => {
  console.error(`Ngrok error: ${data}`);
});

ngrok.on('close', (code) => {
  console.log(`\n🛑 Ngrok process exited with code ${code}`);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping ngrok...');
  ngrok.kill();
  process.exit();
});

console.log('📡 Ngrok is starting... This may take a few seconds.');
console.log('💡 Make sure your backend is running on port 8000');
console.log('⏳ Waiting for ngrok URL...\n');