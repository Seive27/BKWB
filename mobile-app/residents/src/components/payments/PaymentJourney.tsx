import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View, TextInput, Image } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import {
  formatBillDate,
  formatPeriod,
  formatPeso,
  type ResidentBill,
} from '@/services/billService';
import {
  formatPaymentDateTime,
  formatPaymentMethod,
  getPaymentForBill,
  getGCashConfig,
  submitGCashPaymentConfirmation,
  type ResidentPayment,
} from '@/services/paymentService';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between py-2">
      <Text className="text-sm text-slate-500">{label}</Text>
      <Text className="text-sm font-semibold text-slate-800" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function StatusPill({ status }: { status: ResidentBill['status'] | 'pending_verification' }) {
  const styles = {
    paid: 'bg-emerald-100 text-emerald-700',
    pending: 'bg-amber-100 text-amber-700',
    pending_verification: 'bg-amber-100 text-amber-700',
    overdue: 'bg-red-100 text-red-600',
    void: 'bg-slate-100 text-slate-500',
  }[status] || 'bg-slate-100 text-slate-500';
  
  const label = status === 'paid' ? 'Paid' : status === 'pending_verification' ? 'Verifying' : status === 'pending' ? 'Unpaid' : status;
  return (
    <View className={`self-start rounded-md px-2.5 py-1 ${styles}`}>
      <Text className="text-xs font-bold uppercase">{label}</Text>
    </View>
  );
}

function PrimaryButton({ label, onPress, disabled }: { label: string; onPress?: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`mt-6 items-center rounded-xl py-3.5 ${disabled ? 'bg-slate-300' : 'bg-brand active:bg-brand-dark'}`}
    >
      <Text className="text-base font-semibold text-white">{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress, disabled }: { label: string; onPress?: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="mt-3 items-center rounded-xl border border-slate-200 bg-white py-3.5 active:bg-slate-50"
    >
      <Text className="text-base font-semibold text-slate-600">{label}</Text>
    </Pressable>
  );
}

export function PaymentJourney({
  bill,
  onClose,
  onConfirmed,
  onBillPaid,
}: {
  bill: ResidentBill;
  onClose?: () => void;
  onConfirmed?: (payment: ResidentPayment | null) => void;
  onBillPaid?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [gcashConfig, setGcashConfig] = useState<{qrImageUrl: string, active: boolean} | null>(null);
  const [paymentRecord, setPaymentRecord] = useState<ResidentPayment | null>(null);
  const [step, setStep] = useState<'qr' | 'form' | 'success'>('qr');
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const unpaid = bill.status === 'pending' || bill.status === 'overdue';
  const billAmount = Number(bill.amount_due) || 0;

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const p = await getPaymentForBill(bill.id);
        setPaymentRecord(p);
        
        if (!p || p.status === 'cancelled' || p.status === 'refunded') {
          const cfg = await getGCashConfig();
          setGcashConfig(cfg);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [bill.id]);

  if (loading) {
    return (
      <View className="items-center justify-center p-8">
        <ActivityIndicator size="large" color="#186252" />
        <Text className="mt-4 text-sm text-slate-500">Loading payment details...</Text>
      </View>
    );
  }

  // If there's an active or completed payment record, show the receipt view
  if (paymentRecord && paymentRecord.status !== 'cancelled' && paymentRecord.status !== 'refunded') {
    const isCompleted = paymentRecord.status === 'completed';
    return (
      <View className="gap-4">
        <View className={`items-center rounded-2xl border px-5 py-6 ${isCompleted ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
          <View className={`h-14 w-14 items-center justify-center rounded-full ${isCompleted ? 'bg-emerald-100' : 'bg-amber-100'}`}>
            {isCompleted ? (
              <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
                <Path d="M5 12.5 10 17.5 19 7.5" stroke="#059669" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            ) : (
              <ActivityIndicator size="small" color="#b45309" />
            )}
          </View>
          <Text className="mt-3 text-lg font-bold text-slate-900">
            {isCompleted ? 'Payment Completed' : 'Pending Verification'}
          </Text>
          <Text className="mt-1 text-center text-sm leading-5 text-slate-500">
            {isCompleted 
              ? 'Your payment was successfully verified by the barangay.'
              : 'Your payment confirmation has been submitted and is waiting for staff verification.'}
          </Text>
        </View>

        <View className="rounded-2xl border border-slate-200 bg-white px-4 py-2">
          <InfoRow label="Amount" value={formatPeso(paymentRecord.amount)} />
          <InfoRow label="Method" value={formatPaymentMethod(paymentRecord.payment_method)} />
          <InfoRow label="Reference No." value={paymentRecord.reference_number || '---'} />
          <InfoRow label="Date Submitted" value={formatPaymentDateTime(paymentRecord.payment_date)} />
          <InfoRow label="Status" value={isCompleted ? 'Verified' : 'Pending'} />
        </View>

        <SecondaryButton label="Close" onPress={onClose} />
      </View>
    );
  }

  // Otherwise, if not paid and we are in QR step
  if (step === 'qr') {
    return (
      <View className="gap-6">
        <View className="rounded-2xl border border-slate-200 bg-white p-5">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-semibold tracking-wide text-slate-400">
              {formatPeriod(bill.billing_period).toUpperCase()} BILL
            </Text>
            <StatusPill status={bill.status} />
          </View>
          <Text className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Amount Due
          </Text>
          <Text className="text-3xl font-bold text-brand">{formatPeso(billAmount)}</Text>
          <View className="mt-4 border-t border-slate-100 pt-1">
            <InfoRow label="Bill Number" value={bill.bill_number} />
            <InfoRow label="Account Number" value={bill.account?.account_number ?? '---'} />
            <InfoRow label="Due Date" value={bill.due_date ? formatBillDate(bill.due_date) : '---'} />
          </View>
        </View>

        {!gcashConfig?.active ? (
          <View className="rounded-xl border border-red-200 bg-red-50 p-4">
            <Text className="text-sm font-semibold text-red-700">Online Payments Disabled</Text>
            <Text className="mt-1 text-xs text-red-600">
              The barangay is currently not accepting online GCash payments. Please pay walk-in at the barangay hall.
            </Text>
          </View>
        ) : (
          <View className="rounded-2xl border border-slate-200 bg-white p-5 items-center">
            <Text className="text-lg font-bold text-slate-800 mb-1">Pay via GCash</Text>
            <Text className="text-sm text-slate-500 mb-6 text-center">
              Scan the official GCash QR below using your GCash app to pay your {formatPeso(billAmount)} bill.
            </Text>
            
            {gcashConfig.qrImageUrl ? (
              <View className="mb-6 p-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <Image 
                  source={{ uri: gcashConfig.qrImageUrl }} 
                  style={{ width: 220, height: 220 }} 
                  resizeMode="contain" 
                />
              </View>
            ) : (
              <View className="mb-6 bg-slate-100 rounded-xl items-center justify-center h-52 w-52 border border-slate-200">
                <Text className="text-slate-400 text-center">No QR Code Available</Text>
              </View>
            )}

            <Text className="text-center text-xs leading-4 text-slate-400">
              After completing your payment in the GCash app, return here to submit your payment confirmation.
            </Text>
          </View>
        )}

        {gcashConfig?.active && (
          <PrimaryButton label="I Have Paid" onPress={() => setStep('form')} />
        )}
      </View>
    );
  }

  if (step === 'form') {
    const handleSubmit = async () => {
      if (!reference.trim()) return;
      setSubmitting(true);
      try {
        await submitGCashPaymentConfirmation(bill.id, billAmount, reference.trim());
        setStep('success');
      } catch (err) {
        console.error(err);
        alert(err instanceof Error ? err.message : 'Failed to submit payment.');
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <View className="gap-6">
        <View className="items-center pt-2">
          <Text className="text-xl font-bold text-slate-900">Payment Confirmation</Text>
          <Text className="mt-2 text-center text-sm text-slate-500">
            Enter the GCash Reference Number from your transaction receipt.
          </Text>
        </View>

        <View className="gap-4">
          <View>
            <Text className="mb-1.5 text-sm font-semibold text-slate-700">GCash Reference Number *</Text>
            <TextInput
              value={reference}
              onChangeText={setReference}
              placeholder="e.g. 1000293019283"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900"
              keyboardType="number-pad"
            />
          </View>
          <View>
            <Text className="mb-1.5 text-sm font-semibold text-slate-700">Payment Amount</Text>
            <TextInput
              value={formatPeso(billAmount)}
              editable={false}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base text-slate-500"
            />
          </View>
        </View>

        <View className="mt-2">
          <PrimaryButton 
            label={submitting ? "Submitting..." : "Submit Payment"} 
            onPress={handleSubmit} 
            disabled={submitting || !reference.trim()} 
          />
          <SecondaryButton label="Back" onPress={() => setStep('qr')} disabled={submitting} />
        </View>
      </View>
    );
  }

  // success step
  return (
    <View className="items-center px-2 pt-6">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-brand-100">
        <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
          <Path d="M5 12.5 10 17.5 19 7.5" stroke="#186252" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </View>
      <Text className="mt-5 text-center text-xl font-bold text-slate-900">
        Payment Submitted
      </Text>
      <Text className="mt-2 text-center text-sm leading-5 text-slate-500">
        Your payment confirmation has been sent to the barangay for verification.
      </Text>
      <View className="mt-8 w-full">
        <PrimaryButton label="Close" onPress={() => {
          onConfirmed?.(null);
          onClose?.();
        }} />
      </View>
    </View>
  );
}
