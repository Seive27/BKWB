import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { usePayMongoCheckout } from '@/hooks/usePayMongoCheckout';
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
      accessibilityRole="button"
      accessibilityLabel={label}
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
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text className="text-base font-semibold text-slate-600">{label}</Text>
    </Pressable>
  );
}

/** Busy state with a spinner and honest status copy while checkout is prepared. */
function BusyStep({
  title,
  message,
  reference,
}: {
  title: string;
  message: string;
  reference?: string;
}) {
  return (
    <View className="items-center px-2 pt-6">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-brand/10">
        <ActivityIndicator size="large" color="#186252" />
      </View>
      <Text className="mt-5 text-center text-lg font-bold text-slate-900">{title}</Text>
      <Text className="mt-2 max-w-[85%] text-center text-sm leading-5 text-slate-500">
        {message}
      </Text>
      {reference ? (
        <Text className="mt-3 text-xs font-semibold text-slate-400">
          Reference: {reference}
        </Text>
      ) : null}
    </View>
  );
}

/** Paid bill → show the recorded payment receipt (never invented data). */
function PaidReceiptContent({ payment }: { payment: ResidentPayment | null }) {
  return (
    <View className="gap-4">
      <View className="items-center rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-6">
        <View className="h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
            <Path
              d="M5 12.5 10 17.5 19 7.5"
              stroke="#059669"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
        <Text className="mt-3 text-lg font-bold text-slate-900">Bill Already Paid</Text>
        <Text className="mt-1 text-center text-sm leading-5 text-slate-500">
          This bill was settled on{' '}
          {payment ? formatPaymentDateTime(payment.payment_date) : 'a previous payment date'}.
        </Text>
      </View>

      <View className="rounded-2xl border border-slate-200 bg-white px-4 py-2">
        <InfoRow label="Amount Paid" value={payment ? formatPeso(payment.amount) : '—'} />
        <InfoRow
          label="Payment Method"
          value={payment ? formatPaymentMethod(payment.payment_method) : '—'}
        />
        <InfoRow label="Payment Reference" value={payment?.reference_number ?? '—'} />
        <InfoRow
          label="Payment Date"
          value={payment ? formatPaymentDateTime(payment.payment_date) : '—'}
        />
        <InfoRow
          label="Status"
          value={payment?.status === 'completed' ? 'Completed' : (payment?.status ?? '—')}
        />
      </View>

      {!payment ? (
        <Text className="text-center text-xs leading-4 text-slate-400">
          No payment record was found for this bill yet — the payment history will
          appear here once the barangay records it.
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Full resident payment journey for one bill. Rendered inline by the
 * Payments screen and inside a modal by the bill cards.
 *
 *   Pay Now → Pay Online → PayMongo Hosted Checkout → Return → Payment status
 *
 * Online payment is handled entirely by PayMongo: BKWB creates a hosted
 * checkout session and opens it in the device browser; the resident completes
 * payment on PayMongo's own secure UI (GCash / Maya / card / …). There is no
 * QR scanning and no manual reference-number entry for online payments.
 *
 * Confirmation is ONLY ever driven by the database (paymongo-webhook →
 * process_paymongo_payment) — never by returning from the PayMongo browser.
 *
 * Walk-in payments are recorded by barangay staff and are intentionally NOT
 * offered here.
 */
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
  const flow = usePayMongoCheckout(bill);
  const [loading, setLoading] = useState(true);
  const [paymentRecord, setPaymentRecord] = useState<ResidentPayment | null>(null);
  const [step, setStep] = useState<'options' | 'receipt' | 'rejected'>('options');

  // Fire the parent's confirmation callbacks exactly once per bill.
  const confirmedHandledRef = useRef(false);

  const unpaid = bill.status === 'pending' || bill.status === 'overdue';
  const busy = flow.state === 'creating' || flow.state === 'opening';
  const billAmount = Number(bill.amount_due) || 0;

  // Load any existing payment record for this bill so already-paid bills and
  // previously submitted payments show their real status instead of a pay button.
  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      try {
        const p = await getPaymentForBill(bill.id);
        if (cancelled) return;
        setPaymentRecord(p);

        if (!unpaid) {
          setStep('receipt');
        } else if (p && (p.status === 'rejected' || p.status === 'cancelled')) {
          setStep('rejected');
        } else if (p && p.status === 'pending') {
          setStep('receipt');
        } else {
          setStep('options');
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [bill.id, unpaid]);

  // Surface the webhook/database confirmation to the parent (refresh bill card,
  // etc.) — once per bill.
  useEffect(() => {
    confirmedHandledRef.current = false;
  }, [bill.id]);

  useEffect(() => {
    if (flow.state === 'confirmed' && !confirmedHandledRef.current) {
      confirmedHandledRef.current = true;
      onConfirmed?.(flow.confirmedPayment);
      onBillPaid?.();
    }
  }, [flow.state, flow.confirmedPayment, onConfirmed, onBillPaid]);

  const handlePayAgain = () => {
    setPaymentRecord(null);
    setStep('options');
    flow.reset();
  };

  if (loading) {
    return (
      <View className="items-center justify-center p-8">
        <ActivityIndicator size="large" color="#186252" />
        <Text className="mt-4 text-sm text-slate-500">Loading payment details...</Text>
      </View>
    );
  }

  let content: ReactNode;

  if (flow.state === 'creating') {
    content = (
      <BusyStep
        title="Creating your secure checkout"
        message="Contacting the payment gateway. This usually takes a few seconds."
      />
    );
  } else if (flow.state === 'opening') {
    content = (
      <BusyStep
        title="Opening PayMongo checkout"
        message="You'll be taken to the secure PayMongo payment page to complete your payment."
        reference={flow.checkoutReference || undefined}
      />
    );
  } else if (flow.state === 'verifying') {
    content = (
      <View className="items-center px-2 pt-6">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-brand/10">
          <ActivityIndicator size="large" color="#186252" />
        </View>
        <Text className="mt-5 text-center text-lg font-bold text-slate-900">
          Payment is being verified
        </Text>
        <Text className="mt-2 max-w-[85%] text-center text-sm leading-5 text-slate-500">
          Your payment is being confirmed by the barangay billing system. This
          usually takes a minute — we'll update this screen automatically as soon
          as it's confirmed.
        </Text>
        {flow.statusMessage ? (
          <View className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3">
            <Text className="text-center text-sm leading-5 text-slate-700">
              {flow.statusMessage}
            </Text>
          </View>
        ) : null}
        <View className="mt-4 w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Text className="text-center text-xs leading-5 text-amber-800">
            If you cancelled the payment or the session expired, no charge was
            made and your bill stays unpaid.
          </Text>
        </View>
        <PrimaryButton
          label={flow.checking ? 'Checking…' : 'Check Payment Status'}
          disabled={flow.checking}
          onPress={() => { void flow.checkAgain(); }}
        />
        <SecondaryButton label="Back to Bills" onPress={onClose} />
      </View>
    );
  } else if (flow.state === 'confirmed') {
    const payment = flow.confirmedPayment;
    content = (
      <View className="gap-4">
        <View className="items-center rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-6">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
              <Path
                d="M5 12.5 10 17.5 19 7.5"
                stroke="#059669"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
          <Text className="mt-3 text-lg font-bold text-slate-900">Payment Confirmed</Text>
          <Text className="mt-1 text-center text-sm leading-5 text-slate-500">
            Your {formatPeriod(bill.billing_period)} bill has been paid. Thank you!
          </Text>
        </View>

        <View className="rounded-2xl border border-slate-200 bg-white px-4 py-2">
          <InfoRow
            label="Amount Paid"
            value={formatPeso(payment?.amount ?? billAmount)}
          />
          <InfoRow
            label="Payment Method"
            value={payment ? formatPaymentMethod(payment.payment_method) : '—'}
          />
          <InfoRow label="Payment Reference" value={payment?.reference_number ?? '—'} />
          <InfoRow label="Bill Number" value={bill.bill_number} />
          <InfoRow
            label="Payment Date"
            value={payment ? formatPaymentDateTime(payment.payment_date) : '—'}
          />
          <InfoRow label="Status" value="Completed" />
        </View>

        {!payment ? (
          <Text className="text-center text-xs leading-4 text-slate-400">
            Your payment is recorded on your bill. Detailed receipt information
            will appear here shortly.
          </Text>
        ) : null}

        <PrimaryButton label="Back to Bills" onPress={onClose} />
      </View>
    );
  } else if (flow.state === 'error') {
    content = (
      <View className="items-center px-2 pt-6">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 3.5 21.5 20.5H2.5L12 3.5Z"
              stroke="#DC2626"
              strokeWidth={1.8}
              strokeLinejoin="round"
            />
            <Path d="M12 9.5v5" stroke="#DC2626" strokeWidth={1.8} strokeLinecap="round" />
            <Circle cx={12} cy={17.5} r={1} fill="#DC2626" />
          </Svg>
        </View>
        <Text className="mt-5 text-center text-lg font-bold text-slate-900">
          Payment Could Not Start
        </Text>
        <Text className="mt-2 max-w-[85%] text-center text-sm leading-5 text-slate-500">
          {flow.errorMessage || 'Could not start the payment checkout. Please try again.'}
        </Text>
        <PrimaryButton label="Try Again" onPress={() => { void flow.start(); }} />
        <SecondaryButton label="Cancel" onPress={flow.reset} />
      </View>
    );
  } else if (step === 'receipt' && paymentRecord) {
    const isCompleted = paymentRecord.status === 'completed';
    content = (
      <View className="gap-4">
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
      </View>
    );
  } else if (step === 'rejected' && paymentRecord) {
    content = (
      <View className="gap-4">
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
      </View>
    );
  } else if (!unpaid) {
    content = <PaidReceiptContent payment={paymentRecord} />;
  } else {
    // Options step — online payment through PayMongo.
    content = (
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
            <InfoRow label="Account Number" value={bill.account?.account_number ?? '—'} />
            <InfoRow label="Billing Period" value={formatPeriod(bill.billing_period)} />
            <InfoRow
              label="Due Date"
              value={bill.due_date ? formatBillDate(bill.due_date) : '—'}
            />
          </View>
        </View>

        <View>
          <Text className="mb-3 text-base font-bold text-slate-800">
            Choose how you want to pay
          </Text>
          <Pressable
            onPress={() => { void flow.start(); }}
            disabled={busy}
            className={"flex-row items-center gap-4 rounded-2xl border-2 border-slate-200 bg-white px-4 py-4 active:border-brand active:bg-slate-50 " + (busy ? 'opacity-60' : '')}
            accessibilityRole="button"
            accessibilityLabel="Pay Online"
          >
            <View className="h-11 w-11 items-center justify-center rounded-full bg-brand/10">
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5v-9Z"
                  stroke="#186252"
                  strokeWidth={1.8}
                />
                <Path d="M16 12.5h3.5V9.5H16a1.5 1.5 0 1 0 0 3Z" stroke="#186252" strokeWidth={1.8} />
              </Svg>
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-slate-800">Pay Online</Text>
              <Text className="mt-0.5 text-sm text-slate-400">
                Secure payment through PayMongo (GCash, Maya, card, and more).
              </Text>
            </View>
          </Pressable>
        </View>

        <Text className="text-center text-xs leading-4 text-slate-400">
          You'll complete the payment on PayMongo's secure checkout page. Your bill
          is marked paid automatically once PayMongo confirms the payment.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 8 }}
      showsVerticalScrollIndicator={false}
    >
      {content}
    </ScrollView>
  );
}
