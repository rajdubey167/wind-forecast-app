const fs = require('fs');
const file = 'src/components/analysis/analysis-client.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /"use client";[\s\S]*?"use client";/;
content = content.replace(regex, '"use client";');

fs.writeFileSync(file, content);
console.log("Fixed imports!");
