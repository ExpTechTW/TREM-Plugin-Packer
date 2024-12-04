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
const EXCLUDED_FILES = [
 'LICENSE', 
 'README.md', 
 'package-lock.json', 
 'package.json'
];

const REQUIRED_FIELDS = [
 'name',
 'version',
 'description',
 'author',
 'dependencies'
];

const targetDir = process.argv[2] || '.';

const rl = readline.createInterface({
 input: process.stdin,
 output: process.stdout
});

function question(query) {
 return new Promise(resolve => rl.question(query, resolve));
}

function validateInfoJson(info) {
 for (const field of REQUIRED_FIELDS) {
   if (!(field in info)) {
     throw new Error(`Missing required field in info.json: ${field}`);
   }
 }

 if (typeof info.description !== 'object' || !info.description.zh_tw) {
   throw new Error('description must be an object with zh_tw field');
 }

 if (!Array.isArray(info.author)) {
   throw new Error('author must be an array');
 }

 if (typeof info.dependencies !== 'object') {
   throw new Error('dependencies must be an object');
 }
}

async function packTrem(directory) {
 try {
   const infoPath = path.join(directory, 'info.json');
   if (!fs.existsSync(infoPath)) {
     throw new Error('info.json not found');
   }

   const info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
   validateInfoJson(info);

   const signaturePath = path.join(directory, 'signature.json');
   if (fs.existsSync(signaturePath)) {
     const signature = JSON.parse(fs.readFileSync(signaturePath, 'utf8'));
     if (signature.version !== info.version) {
       throw new Error(`Version mismatch: info.json (${info.version}) ≠ signature.json (${signature.version})`);
     }
   }

   console.log('\n' + colors.yellow + 'Plugin Information:' + colors.reset);
   console.log(`Name: ${info.name}`);
   console.log(`Version: ${info.version}`);
   console.log(`Description: ${info.description.zh_tw}`);
   console.log(`Authors: ${info.author.join(', ')}`);
   console.log('Dependencies:', JSON.stringify(info.dependencies, null, 2));

   const confirm = await question(colors.yellow + '\nConfirm plugin information? (y/N): ' + colors.reset);
   if (confirm.toLowerCase() !== 'y') {
     console.log(colors.red + 'Operation cancelled by user' + colors.reset);
     process.exit(0);
   }

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
       
       if (file.startsWith('.') || 
           file.startsWith('__MACOSX') || 
           EXCLUDED_FILES.includes(file) ||
           file.endsWith('.trem')) {
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
