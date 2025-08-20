#!/usr/bin/env tsx

import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(__dirname, '../data');
const TEST_FILE = path.join(DATA_DIR, 'test.json');

async function testStorage() {
  console.log('🧪 Testing file storage...');
  
  try {
    // Create data directory
    console.log(`📁 Creating directory: ${DATA_DIR}`);
    await fs.mkdir(DATA_DIR, { recursive: true });
    
    // Test data
    const testData = {
      test: true,
      timestamp: new Date().toISOString(),
      message: 'Storage test successful'
    };
    
    // Write test file
    console.log(`💾 Writing test file: ${TEST_FILE}`);
    await fs.writeFile(TEST_FILE, JSON.stringify(testData, null, 2));
    
    // Read test file
    console.log('📖 Reading test file...');
    const readData = await fs.readFile(TEST_FILE, 'utf-8');
    const parsed = JSON.parse(readData);
    
    console.log('✅ Storage test successful!');
    console.log('📄 File contents:', parsed);
    
    // Clean up
    await fs.unlink(TEST_FILE);
    console.log('🧹 Test file cleaned up');
    
  } catch (error) {
    console.error('❌ Storage test failed:', error);
    process.exit(1);
  }
}

testStorage();
