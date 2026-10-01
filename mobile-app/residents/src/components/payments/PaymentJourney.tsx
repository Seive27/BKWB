import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View, TextInput, Image, ScrollView } from 'react-native';
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
  getOnlinePaymentConfig,
  submitOnlinePaymentConfirmation,
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

function StatusPill({ status }: { status: ResidentBill['status'] | 'pending_verification' | 'rejected' }) {
  const styles = {
    paid: 'bg-emerald-100 text-emerald-700',
    pending: 'bg-amber-100 text-amber-700',
    pending_verification: 'bg-amber-100 text-amber-700',
    rejected: 'bg-red-100 text-red-700',
    overdue: 'bg-red-100 text-red-600',
    void: 'bg-slate-100 text-slate-500',
  }[status] || 'bg-slate-100 text-slate-500';
  
  const label = status === 'paid' ? 'Paid' : status === 'pending_verification' ? 'Verifying' : status === 'pending' ? 'Unpaid' : status === 'rejected' ? 'Rejected' : status;
  return (
    <View className={"self-start rounded-md px-2.5 py-1 " + styles}>
      <Text className="text-xs font-bold uppercase">{label}</Text>
    </View>
  );
}

function PrimaryButton({ label, onPress, disabled }: { label: string; onPress?: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={"mt-4 items-center rounded-xl py-3.5 " + (disabled ? 'bg-slate-300' : 'bg-brand active:bg-brand-dark')}
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
  const [config, setConfig] = useState<{gcashQrImageUrl: string, gcashActive: boolean, maribankQrImageUrl: string, maribankActive: boolean} | null>(null);
  const [paymentRecord, setPaymentRecord] = useState<ResidentPayment | null>(null);
  
  type Step = 'receipt' | 'rejected' | 'provider' | 'terms' | 'qr' | 'form' | 'success';
  const [step, setStep] = useState<Step>('provider');
  const [provider, setProvider] = useState<'gcash' | 'maribank' | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const billAmount = Number(bill.amount_due) || 0;

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const p = await getPaymentForBill(bill.id);
        setPaymentRecord(p);
        
        if (p) {
          if (p.status === 'rejected' || p.status === 'cancelled') {
            setStep('rejected');
          } else {
            setStep('receipt');
          }
        } else {
          setStep('provider');
        }

        const cfg = await getOnlinePaymentConfig();
        setConfig(cfg);
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

  const handlePayAgain = () => {
    setPaymentRecord(null);
    setProvider(null);
    setTermsAccepted(false);
    setReference('');
    setStep('provider');
  };

  if (step === 'receipt' && paymentRecord) {
    const isCompleted = paymentRecord.status === 'completed';
    return (
      <ScrollView className="gap-4">
        <View className={"items-center rounded-2xl border px-5 py-6 " + (isCompleted ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50')}>
          <View className={"h-14 w-14 items-center justify-center rounded-full " + (isCompleted ? 'bg-emerald-100' : 'bg-amber-100')}>
            {isCompleted ? (
              <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
                <Path d="M5 12.5 10 17.5 19 7.5" stroke="#059669" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            ) : (
              <ActivityIndicator size="small" color="#b45309" />
            )}
          </View>
          <Text className="mt-3 text-lg font-bold text-slate-900">
            {isCompleted ? 'Payment Verified' : 'Pending Verification'}
          </Text>
          <Text className="mt-1 text-center text-sm leading-5 text-slate-500">
            {isCompleted 
              ? 'Your payment was successfully verified by the barangay.'
              : 'Your payment confirmation has been submitted and is waiting for staff verification.'}
          </Text>
        </View>

        <View className="rounded-2xl border border-slate-200 bg-white px-4 py-2 mt-4">
          <InfoRow label="Amount" value={formatPeso(paymentRecord.amount)} />
          <InfoRow label="Method" value={formatPaymentMethod(paymentRecord.payment_method)} />
          <InfoRow label="Reference No." value={paymentRecord.reference_number || '---'} />
          <InfoRow label="Date Submitted" value={formatPaymentDateTime(paymentRecord.payment_date)} />
          <InfoRow label="Status" value={isCompleted ? 'Verified' : 'Pending'} />
        </View>

        <SecondaryButton label="Close" onPress={onClose} />
      </ScrollView>
    );
  }

  if (step === 'rejected' && paymentRecord) {
    return (
      <ScrollView className="gap-4">
        <View className="items-center rounded-2xl border border-red-200 bg-red-50 px-5 py-6">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
              <Path d="M6 18L18 6M6 6l12 12" stroke="#b91c1c" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </View>
          <Text className="mt-3 text-lg font-bold text-slate-900">Payment Rejected</Text>
          <Text className="mt-1 text-center text-sm leading-5 text-slate-500">
            Your previous payment submission could not be verified.
          </Text>
          
          <View className="mt-4 bg-white border border-red-200 rounded-lg p-3 w-full">
            <Text className="text-xs text-red-500 uppercase font-bold mb-1">Reason for Rejection</Text>
            <Text className="text-sm text-slate-700">{paymentRecord.rejection_reason || 'No reason provided.'}</Text>
          </View>
        </View>

        <PrimaryButton label="Pay Again" onPress={handlePayAgain} />
        <SecondaryButton label="Close" onPress={onClose} />
      </ScrollView>
    );
  }

  if (step === 'provider') {
    return (
      <ScrollView className="gap-6">
        <View className="rounded-2xl border border-slate-200 bg-white p-5 mb-4">
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
          </View>
        </View>

        <Text className="mb-2 text-base font-bold text-slate-800">
          Choose Payment Method
        </Text>

        <View className="gap-3">
          <Pressable
            onPress={() => { setProvider('gcash'); setStep('terms'); }}
            disabled={!config?.gcashActive}
            className={"flex-row items-center gap-4 rounded-2xl border-2 bg-white px-4 py-4 " + (config?.gcashActive ? 'border-slate-200 active:border-brand active:bg-slate-50' : 'border-slate-100 opacity-50')}
          >
            <View className="h-10 w-10 bg-blue-500 rounded-full items-center justify-center">
              <Text className="text-white font-bold font-serif text-xl">G</Text>
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-slate-800">GCash</Text>
              <Text className="text-sm text-slate-500">{config?.gcashActive ? 'Pay using GCash' : 'Currently unavailable'}</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => { setProvider('maribank'); setStep('terms'); }}
            disabled={!config?.maribankActive}
            className={"flex-row items-center gap-4 rounded-2xl border-2 bg-white px-4 py-4 " + (config?.maribankActive ? 'border-slate-200 active:border-brand active:bg-slate-50' : 'border-slate-100 opacity-50')}
          >
            <View className="h-10 w-10 bg-orange-500 rounded-full items-center justify-center">
              <Text className="text-white font-bold font-serif text-xl">M</Text>
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-slate-800">MariBank</Text>
              <Text className="text-sm text-slate-500">{config?.maribankActive ? 'Pay using MariBank' : 'Currently unavailable'}</Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  if (step === 'terms') {
    return (
      <ScrollView className="gap-4">
        <View className="mb-4">
          <Text className="text-sm font-semibold text-brand mb-1">Step 1 of 4</Text>
          <Text className="text-2xl font-bold text-slate-900">Terms & Conditions</Text>
        </View>

        <View className="bg-white border border-slate-200 rounded-2xl p-5 mb-4">
          <Text className="text-sm text-slate-700 leading-6 mb-3">By proceeding with this online payment:</Text>
          <View className="gap-3 ml-2">
            <Text className="text-sm text-slate-600 leading-5">� You will complete the payment through {provider === 'gcash' ? 'GCash' : 'MariBank'}.</Text>
            <Text className="text-sm text-slate-600 leading-5">� BKWB does not automatically verify the payment immediately.</Text>
            <Text className="text-sm text-slate-600 leading-5">� You must provide the correct payment reference number after completing the transaction.</Text>
            <Text className="text-sm text-slate-600 leading-5">� Your payment will remain pending until verified by authorized Barangay staff.</Text>
            <Text className="text-sm text-slate-600 leading-5">� Providing an incorrect or fraudulent reference number may result in the payment submission being rejected.</Text>
            <Text className="text-sm text-slate-600 leading-5">� Your bill will only be marked as paid after successful verification.</Text>
          </View>
        </View>

        <Pressable 
          onPress={() => setTermsAccepted(!termsAccepted)}
          className="flex-row items-center gap-3 p-2 active:opacity-70"
        >
          <View className={"w-6 h-6 rounded-md border-2 items-center justify-center " + (termsAccepted ? 'bg-brand border-brand' : 'border-slate-300 bg-white')}>
            {termsAccepted && (
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <Path d="M5 12.5 10 17.5 19 7.5" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            )}
          </View>
          <Text className="text-sm text-slate-800 flex-1 font-medium">I have read and agree to the terms and conditions.</Text>
        </Pressable>

        <View className="mt-4">
          <PrimaryButton label="Continue" disabled={!termsAccepted} onPress={() => setStep('qr')} />
          <SecondaryButton label="Back" onPress={() => setStep('provider')} />
        </View>
      </ScrollView>
    );
  }

  if (step === 'qr') {
    const isGcash = provider === 'gcash';
    const qrUrl = isGcash ? config?.gcashQrImageUrl : config?.maribankQrImageUrl;

    return (
      <ScrollView className="gap-4">
        <View className="mb-4">
          <Text className="text-sm font-semibold text-brand mb-1">Step 2 of 4</Text>
          <Text className="text-2xl font-bold text-slate-900">Payment Instructions</Text>
        </View>

        <View className="rounded-2xl border border-slate-200 bg-white p-5 items-center">
          <Text className="text-lg font-bold text-slate-800 mb-2">{isGcash ? 'GCash Payment' : 'MariBank Payment'}</Text>
          
          <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400 mt-2">Amount Due</Text>
          <Text className="text-3xl font-bold text-brand mb-6">{formatPeso(billAmount)}</Text>

          <Text className="text-sm text-slate-600 mb-6 text-center leading-5">
            Scan the official {isGcash ? 'GCash' : 'MariBank'} QR below using your {isGcash ? 'GCash' : 'MariBank'} app to complete the payment.
          </Text>
          
          {qrUrl ? (
            <View className="mb-6 p-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <Image 
                source={{ uri: qrUrl }} 
                style={{ width: 220, height: 220 }} 
                resizeMode="contain" 
              />
            </View>
          ) : (
            <View className="mb-6 bg-slate-100 rounded-xl items-center justify-center h-52 w-52 border border-slate-200">
              <Text className="text-slate-400 text-center">No QR Code Available</Text>
            </View>
          )}

          <Text className="text-center text-xs leading-5 text-slate-500 bg-slate-50 p-3 rounded-lg">
            After completing your payment in the {isGcash ? 'GCash' : 'MariBank'} app, return to BKWB and continue to the next step.
          </Text>
        </View>

        <View className="mt-2">
          <PrimaryButton label="Continue to Next Step" onPress={() => setStep('form')} />
          <SecondaryButton label="Back" onPress={() => setStep('terms')} />
        </View>
      </ScrollView>
    );
  }

  if (step === 'form') {
    const handleSubmit = async () => {
      if (!reference.trim() || !provider) return;
      setSubmitting(true);
      try {
        await submitOnlinePaymentConfirmation(bill.id, billAmount, reference.trim(), provider);
        setStep('success');
      } catch (err) {
        console.error(err);
        alert(err instanceof Error ? err.message : 'Failed to submit payment.');
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <ScrollView className="gap-4">
        <View className="mb-4">
          <Text className="text-sm font-semibold text-brand mb-1">Step 3 of 4</Text>
          <Text className="text-2xl font-bold text-slate-900">Payment Reference</Text>
          <Text className="mt-2 text-sm text-slate-500 leading-5">
            Enter the {provider === 'gcash' ? 'GCash' : 'MariBank'} Reference Number from your transaction receipt.
          </Text>
        </View>

        <View className="gap-5 bg-white p-5 rounded-2xl border border-slate-200">
          <View>
            <Text className="mb-2 text-sm font-semibold text-slate-700">Reference Number *</Text>
            <TextInput
              value={reference}
              onChangeText={setReference}
              placeholder="e.g. 1000293019283"
              className="rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-base text-slate-900 focus:border-brand focus:ring-1 focus:ring-brand"
              keyboardType="default"
            />
          </View>
          <View>
            <Text className="mb-2 text-sm font-semibold text-slate-700">Payment Amount</Text>
            <TextInput
              value={formatPeso(billAmount)}
              editable={false}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base text-slate-500"
            />
          </View>
          <View>
            <Text className="mb-2 text-sm font-semibold text-slate-700">Payment Method</Text>
            <TextInput
              value={provider === 'gcash' ? 'GCash' : 'MariBank'}
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
      </ScrollView>
    );
  }

  // success step
  return (
    <ScrollView className="px-2 pt-6">
      <View className="items-center">
        <Text className="text-sm font-semibold text-brand mb-4">Step 4 of 4</Text>
        
        <View className="h-16 w-16 items-center justify-center rounded-full bg-brand-100 mb-5">
          <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
            <Path d="M5 12.5 10 17.5 19 7.5" stroke="#186252" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
        
        <Text className="text-xl font-bold text-slate-900 text-center">
          Payment Submitted
        </Text>
        <Text className="mt-3 text-center text-sm leading-6 text-slate-500 px-4">
          Your payment confirmation has been sent to the barangay for verification. Your bill will be marked as paid once staff verifies the transaction.
        </Text>
      </View>
      <View className="mt-8 w-full">
        <PrimaryButton label="Done" onPress={() => {
          onConfirmed?.(null);
          onClose?.();
        }} />
      </View>
    </ScrollView>
  );
}