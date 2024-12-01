#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const targetDir = process.argv[2] || '.';

async function packTrem(directory) {
  try {
    const infoPath = path.join(directory, 'info.json');
    if (!fs.existsSync(infoPath)) {
      console.error('Error: info.json not found');
      process.exit(1);
    }

    const info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
    if (!info.name) {
      console.error('Error: name field is required in info.json');
      process.exit(1);
    }

    const zip = new AdmZip();
    const outputName = `${info.name}.trem`;

    function addFilesToZip(currentPath, zipPath = '') {
      const files = fs.readdirSync(currentPath);
      
      files.forEach(file => {
        const filePath = path.join(currentPath, file);
        const stat = fs.statSync(filePath);
        
        if (file.startsWith('.') || file.startsWith('__MACOSX')) {
          return;
        }

        if (stat.isDirectory()) {
          addFilesToZip(filePath, path.join(zipPath, file));
        } else {
          const fileData = fs.readFileSync(filePath);
          const zipFilePath = path.join(zipPath, file);
          zip.addFile(zipFilePath, fileData);
        }
      });
    }

    addFilesToZip(directory);

    zip.writeZip(outputName);
    console.log(`Successfully created ${outputName}`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

packTrem(targetDir);
