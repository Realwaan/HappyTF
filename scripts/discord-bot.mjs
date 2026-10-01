#!/usr/bin/env node
/**
 * CapStoneFlow Standalone Discord Bot Worker
 * Run via: node scripts/discord-bot.mjs
 * Or configure via HappyTF Web Dashboard (Integrations > CapStoneFlow Discord Bot)
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local if present
const envPath = resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...vals] = trimmed.split('=');
      const val = vals.join('=').replace(/^["']|["']$/g, '');
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = val.trim();
      }
    }
  }
}

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

console.log('🤖 [CapStoneFlow Discord Bot Worker]');
console.log('------------------------------------');

if (!BOT_TOKEN) {
  console.log('⚠️  No DISCORD_BOT_TOKEN found in environment.');
  console.log('👉 Configure your Discord Bot Token in the HappyTF Web UI:');
  console.log('   Open HappyTF -> Click "CapStoneFlow Discord Bot" in the top bar.');
  console.log('   Or add DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID to .env.local');
  process.exit(0);
}

console.log(`🔑 Bot Token detected (${BOT_TOKEN.slice(0, 10)}...)`);
console.log(`🌐 HappyTF Endpoint: ${APP_URL}`);

async function testConnection() {
  try {
    const res = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bot ${BOT_TOKEN}` }
    });
    if (!res.ok) {
      console.error(`❌ Discord API rejected token: ${res.statusText}`);
      return;
    }
    const me = await res.json();
    console.log(`✅ Connected to Discord as: ${me.username}#${me.discriminator} (ID: ${me.id})`);
    console.log('🚀 CapStoneFlow commands ready to sync via /sync-commands.');
  } catch (err) {
    console.error('❌ Connection error:', err);
  }
}

testConnection();
