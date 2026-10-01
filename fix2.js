const fs = require('fs');
let code = fs.readFileSync('mobile-app/residents/src/services/paymentService.ts', 'utf8');

// The file got messed up. Let's just fix it by looking for "const result = (data ?? {}) as {" and removing up to the end of that block.
code = code.replace(/const result = \(data \?\? \{\}\) as \{[\s\S]*?currency: result\.currency \|\| 'PHP',\s*\};\s*\}/, '');

fs.writeFileSync('mobile-app/residents/src/services/paymentService.ts', code);
