#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const targetDir = process.argv[2] || '.';

async function packTrem(directory) {
  try {
    const infoPath = path.join(directory, 'info.json');
    if (!fs.existsSync(infoPath)) {
      console.error(colors.red + 'Error: info.json not found' + colors.reset);
      process.exit(1);
    }

    const info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
    if (!info.name) {
      console.error(colors.red + 'Error: name field is required in info.json' + colors.reset);
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
          console.log(colors.blue + `Adding: ${zipFilePath}` + colors.reset);
        }
      });
    }

    addFilesToZip(directory);
    zip.writeZip(outputName);
    console.log(colors.green + `Successfully created ${outputName}` + colors.reset);
    console.log(colors.yellow + `Plugin: ${info.name}${info.version ? ' v' + info.version : ''}` + colors.reset);
  } catch (error) {
    console.error(colors.red + 'Error: ' + error.message + colors.reset);
    process.exit(1);
  }
}

packTrem(targetDir);
