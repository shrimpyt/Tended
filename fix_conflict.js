const fs = require('fs');

const file = 'tended-web/app/inventory/page.tsx';
let code = fs.readFileSync(file, 'utf8');

const conflictRegex = /<<<<<<< HEAD\n\n=======\n([\s\S]*?)>>>>>>> origin\/main/m;

const match = code.match(conflictRegex);
if (match) {
    const originMainCode = match[1];
    code = code.replace(conflictRegex, originMainCode);
    fs.writeFileSync(file, code);
    console.log("Conflict resolved by taking origin/main changes.");
} else {
    console.log("Conflict markers not found.");
}
