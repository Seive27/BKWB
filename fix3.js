const fs = require('fs');
let content = fs.readFileSync('mobile-app/residents/src/services/paymentService.ts', 'utf8');

content = content.replace(/status: 'completed' \| 'pending' \| 'cancelled' \| 'refunded';/, "status: 'completed' | 'pending' | 'cancelled' | 'refunded' | 'rejected';\n  rejection_reason?: string | null;");

content = content.replace(/\/\*\*[\s\S]*?export async function createCheckoutSession[\s\S]*?\}\s*\}/, "");

content = content.replace(/export async function getGCashConfig[\s\S]*?\}\s*\}/, 
export async function getOnlinePaymentConfig() {
  const { data, error } = await supabase
    .from('system_settings')
    .select('key, value')
    .in('key', [
      'billing.gcash_qr_image_url', 
      'billing.gcash_payment_active',
      'billing.maribank_qr_image_url',
      'billing.maribank_payment_active'
    ]);
    
  if (error) {
    console.warn('[payments] failed to load online payment config', error);
    return null;
  }
  
  let gcashQrImageUrl = '';
  let gcashActive = false;
  let maribankQrImageUrl = '';
  let maribankActive = false;

  data.forEach(s => {
    if (s.key === 'billing.gcash_qr_image_url') gcashQrImageUrl = String(s.value).replace(/^"|"$/g, '');
    if (s.key === 'billing.gcash_payment_active') gcashActive = s.value === 'true' || s.value === true;
    if (s.key === 'billing.maribank_qr_image_url') maribankQrImageUrl = String(s.value).replace(/^"|"$/g, '');
    if (s.key === 'billing.maribank_payment_active') maribankActive = s.value === 'true' || s.value === true;
  });

  return { gcashQrImageUrl, gcashActive, maribankQrImageUrl, maribankActive };
}

export async function submitOnlinePaymentConfirmation(billId: string, amount: number, referenceNumber: string, paymentMethod: string) {
  const { data, error } = await supabase.rpc('submit_online_payment_confirmation', {
    p_bill_id: billId,
    p_amount: amount,
    p_reference_number: referenceNumber,
    p_payment_method: paymentMethod
  });
  
  if (error) {
    throw new Error(error.message || 'Failed to submit payment confirmation.');
  }
  
  return data;
}
);

content = content.replace(/export async function submitGCashPaymentConfirmation[\s\S]*?\}\s*\}/, "");

fs.writeFileSync('mobile-app/residents/src/services/paymentService.ts', content);
