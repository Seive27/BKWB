const fs = require('fs');
let code = fs.readFileSync('desktop-app/super-admin/src/pages/SystemSettings.tsx', 'utf8');

code = code.replace(/import type \{ SystemSetting \} from '\.\.\/types';/, `import type { SystemSetting } from '../types';\nimport { GCashQRUploader } from '../components/GCashQRUploader';`);

const start = code.indexOf('const isGcashLink');
if (start > -1) {
  const end = code.indexOf('};', code.indexOf('return (', start)) + 2;
  const replacement = `    const isGcashQr = setting.key === 'billing.gcash_qr_image_url';
    
    if (isGcashQr) {
      return <GCashQRUploader value={String(value ?? '')} onChange={(url) => setDraft(setting.key, url)} />;
    }

    return (
      <input
        type="text"
        value={String(value ?? '')}
        onChange={(e) => setDraft(setting.key, e.target.value)}
        placeholder="..."
        className="w-full max-w-md px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    );`;
  code = code.substring(0, start) + replacement + code.substring(end);
}

code = code.replace(/import \{ QRCodeSVG \} from 'qrcode\.react';\r?\n/, '');
code = code.replace(/function generateSampleGCashQR[\s\S]*?return payload \+[\s\S]*?\}\r?\n/, '');

fs.writeFileSync('desktop-app/super-admin/src/pages/SystemSettings.tsx', code);
