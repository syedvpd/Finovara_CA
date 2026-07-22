import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(dirPath);
  });
}

let modifiedFiles = 0;

walk(path.join(__dirname, 'src'), function(filePath) {
  // Only process ts/tsx files, skip the navbar since we already updated it manually
  if ((filePath.endsWith('.tsx') || filePath.endsWith('.ts')) && !filePath.includes('Navbar.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;

    // 1. Backgrounds
    // Replace light background with Financial Navy
    newContent = newContent.replace(/#F7F9FC/ig, '#102A43');
    
    // Replace pure white backgrounds with a subtle transparent white for card glass effect on dark navy
    // Matches `bg-white` followed by space, quote, or backtick. Does not match `bg-white/10`
    newContent = newContent.replace(/bg-white([ "'`\n])/ig, 'bg-white/5$1');

    // 2. Primary Text
    // Replace Navy text with Cloud White
    newContent = newContent.replace(/text-\[#102A43\]/ig, 'text-white');
    // Replace inline styles setting color to Navy
    newContent = newContent.replace(/color:\s*['"]#102A43['"]/ig, 'color: "white"');

    // 3. Secondary Text
    // Replace Slate text with lighter Slate Grey for dark mode visibility
    newContent = newContent.replace(/text-\[#52606D\]/ig, 'text-[#94A3B8]');
    newContent = newContent.replace(/color:\s*['"]#52606D['"]/ig, 'color: "#94A3B8"');

    // 4. Borders
    // Replace dark borders with light transparent borders
    newContent = newContent.replace(/border-black\/\d+/ig, 'border-white/10');
    newContent = newContent.replace(/border-\[#102A43\]\/\d+/ig, 'border-white/10');

    // 5. CTA Buttons & Emerald Accents
    // The user requested CTA buttons to be Premium Gold. 
    // We can swap primary bg-[#087F5B] text-white buttons to bg-[#C8A45D] text-[#102A43]
    newContent = newContent.replace(/bg-\[#087F5B\]\s+text-white/ig, 'bg-[#C8A45D] text-[#102A43]');

    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      modifiedFiles++;
    }
  }
});

console.log(`Global Dark Theme applied successfully. Modified ${modifiedFiles} files.`);
