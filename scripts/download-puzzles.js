#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

// GitHub API endpoint to get all files in the days directory
const GITHUB_API_URL = 'https://api.github.com/repos/tedmiston/spelling-bee-answers/contents/days';
const RAW_BASE_URL = 'https://raw.githubusercontent.com/tedmiston/spelling-bee-answers/main/days';

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, 'server', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Function to make HTTPS requests
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'spelling-bee-duel-downloader'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

// Function to download a single file
async function downloadFile(filename) {
  try {
    const url = `${RAW_BASE_URL}/${filename}`;
    const data = await httpsGet(url);
    const filePath = path.join(dataDir, filename);
    
    fs.writeFileSync(filePath, data);
    console.log(`✓ Downloaded ${filename}`);
  } catch (error) {
    console.error(`✗ Failed to download ${filename}:`, error.message);
  }
}

// Main function
async function downloadAllPuzzles() {
  try {
    console.log('Fetching file list from GitHub API...');
    
    // Get list of all files in the days directory
    const response = await httpsGet(GITHUB_API_URL);
    const files = JSON.parse(response);
    
    // Filter for JSON files only
    const jsonFiles = files
      .filter(file => file.name.endsWith('.json') && file.type === 'file')
      .map(file => file.name);
    
    console.log(`Found ${jsonFiles.length} JSON files to download...\n`);
    
    // Download files in batches to avoid overwhelming the server
    const batchSize = 10;
    for (let i = 0; i < jsonFiles.length; i += batchSize) {
      const batch = jsonFiles.slice(i, i + batchSize);
      const promises = batch.map(filename => downloadFile(filename));
      
      await Promise.all(promises);
      
      // Small delay between batches
      if (i + batchSize < jsonFiles.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`\n🎉 Successfully downloaded ${jsonFiles.length} puzzle files to ${dataDir}`);
    
    // Create an index file for easy loading
    const indexPath = path.join(dataDir, 'index.json');
    const index = {
      totalPuzzles: jsonFiles.length,
      files: jsonFiles.sort(),
      lastUpdated: new Date().toISOString()
    };
    
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
    console.log(`📋 Created index file: ${indexPath}`);
    
  } catch (error) {
    console.error('Error downloading puzzles:', error.message);
    process.exit(1);
  }
}

// Run the script
downloadAllPuzzles();