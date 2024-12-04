#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const readline = require('readline');

const colors = {
 red: '\x1b[31m',
 green: '\x1b[32m', 
 yellow: '\x1b[33m',
 blue: '\x1b[34m',
 reset: '\x1b[0m'
};

const PACKER_VERSION = '1.0.0';
const EXCLUDED_FILES = ['LICENSE', 'README.md', 'package-lock.json', 'package.json'];

const targetDir = process.argv[2] || '.';

// 創建 readline interface
const rl = readline.createInterface({
 input: process.stdin,
 output: process.stdout
});

function question(query) {
 return new Promise(resolve => rl.question(query, resolve));
}

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

   // 顯示插件信息並等待確認
   console.log('\n' + colors.yellow + 'Plugin Information:' + colors.reset);
   console.log(`Name: ${info.name}`);
   console.log(`Version: ${info.version}`);
   console.log('Dependencies:', JSON.stringify(info.dependencies, null, 2));

   const confirm = await question(colors.yellow + '\nConfirm plugin information? (y/N): ' + colors.reset);
   if (confirm.toLowerCase() !== 'y') {
     console.log(colors.red + 'Operation cancelled by user' + colors.reset);
     process.exit(0);
   }

   // 檢查 signature.json
   const signaturePath = path.join(directory, 'signature.json');
   if (!fs.existsSync(signaturePath)) {
     const createSignature = await question(colors.yellow + '\nsignature.json not found. Continue without it? (y/N): ' + colors.reset);
     if (createSignature.toLowerCase() !== 'y') {
       console.log(colors.red + 'Operation cancelled by user' + colors.reset);
       process.exit(0);
     }
   }

   const zip = new AdmZip();
   const outputName = `${info.name}.trem`;

   function addFilesToZip(currentPath, zipPath = '') {
     const files = fs.readdirSync(currentPath);
     
     files.forEach(file => {
       const filePath = path.join(currentPath, file);
       const stat = fs.statSync(filePath);
       
       if (file.startsWith('.') || file.startsWith('__MACOSX') || EXCLUDED_FILES.includes(file)) {
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
   console.log(colors.green + `\nSuccessfully created ${outputName}` + colors.reset);
   console.log(colors.yellow + `Plugin: ${info.name} v${info.version}` + colors.reset);
   console.log(colors.blue + `Packer Version: ${PACKER_VERSION}` + colors.reset);

 } catch (error) {
   console.error(colors.red + 'Error: ' + error.message + colors.reset);
   process.exit(1);
 } finally {
   rl.close();
 }
}

packTrem(targetDir);
