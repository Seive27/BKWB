const fs = require('fs');
let code = fs.readFileSync('mobile-app/residents/src/components/payments/PaymentJourney.tsx', 'utf8');

code = code.replace(/import \{ generateGCashQR \} from '@\/utils\/gcashQr';\r?\n/, '');
code = code.replace(/import QRCode from 'react-native-qrcode-svg';\r?\n/, '');

// Add Image import if not present
if (!code.includes(', Image }')) {
  code = code.replace(/Linking \} from 'react-native';/, 'Linking, Image } from \'react-native\';');
}

// Replace state
code = code.replace(/const \[gcashConfig, setGcashConfig\] = useState<\{name: string, mobileNumber: string, active: boolean\} \| null>\(null\);/, 'const [gcashConfig, setGcashConfig] = useState<{qrImageUrl: string, active: boolean} | null>(null);');

// Replace instructions text
code = code.replace(/Save this QR code and scan it using your GCash app to send \{formatPeso\(billAmount\)\} to \{gcashConfig\.name\}\./, 'Save this QR code and scan it using your GCash app to pay your {formatPeso(billAmount)} bill.');

// Replace QR condition block
const qrMatch = /\{gcashConfig\.mobileNumber \? \([\s\S]*?<\/View>\s*\)\s*:\s*\([\s\S]*?<\/View>\s*\)\}/;
code = code.replace(qrMatch, `{gcashConfig.qrImageUrl ? (
            <View className="mb-6 p-4 bg-white border border-slate-200 rounded-xl">
              <Image source={{ uri: gcashConfig.qrImageUrl }} style={{ width: 180, height: 180 }} resizeMode="contain" />
            </View>
          ) : (
            <View className="mb-6 p-4 bg-slate-100 rounded-xl items-center justify-center h-48 w-48 border border-slate-200">
               <Text className="text-slate-400 text-center">No QR Code Available</Text>
            </View>
          )}`);

fs.writeFileSync('mobile-app/residents/src/components/payments/PaymentJourney.tsx', code);
