import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useDialog } from '@/components/ui/AppDialog';
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

type PaymentMethodId = 'gcash' | 'maya' | 'cash';

type PaymentMethod = {
  id: PaymentMethodId;
  title: string;
  subtitle: string;
  icon: 'wallet' | 'card' | 'pin';
};

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'gcash',
    title: 'GCash',
    subtitle: 'Pay online with your GCash wallet',
    icon: 'wallet',
  },
  {
    id: 'maya',
    title: 'Maya',
    subtitle: 'Pay online with your Maya wallet',
    icon: 'card',
  },
  {
    id: 'cash',
    title: 'Cash (Pay at Barangay)',
    subtitle: 'Walk-in payment at the Barangay Hall',
    icon: 'pin',
  },
];

function MethodIcon({
  kind,
  selected,
}: {
  kind: PaymentMethod['icon'];
  selected: boolean;
}) {
  const color = selected ? '#186252' : '#94A3B8';
  const bg = selected ? 'bg-brand/10' : 'bg-slate-100';

  return (
    <View className={`h-11 w-11 items-center justify-center rounded-full ${bg}`}>
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        {kind === 'wallet' ? (
          <>
            <Path
              d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5v-9Z"
              stroke={color}
              strokeWidth={1.8}
            />
            <Path d="M16 12.5h3.5V9.5H16a1.5 1.5 0 1 0 0 3Z" stroke={color} strokeWidth={1.8} />
          </>
        ) : null}
        {kind === 'card' ? (
          <>
            <Path
              d="M3.5 8.5A2.5 2.5 0 0 1 6 6h12a2.5 2.5 0 0 1 2.5 2.5v7A2.5 2.5 0 0 1 18 18H6a2.5 2.5 0 0 1-2.5-2.5v-7Z"
              stroke={color}
              strokeWidth={1.8}
            />
            <Path d="M3.5 10.5h17" stroke={color} strokeWidth={1.8} />
          </>
        ) : null}
        {kind === 'pin' ? (
          <>
            <Path
              d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z"
              stroke={color}
              strokeWidth={1.8}
            />
            <Circle cx={12} cy={11} r={2.2} stroke={color} strokeWidth={1.8} />
          </>
        ) : null}
      </Svg>
    </View>
  );
}

function RadioSelected() {
  return (
    <View className="h-6 w-6 items-center justify-center rounded-full bg-brand">
      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
        <Path
          d="M5 12.5 10 17.5 19 7.5"
          stroke="#fff"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

function RadioEmpty() {
  return <View className="h-6 w-6 rounded-full border-2 border-slate-300" />;
}

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

function StatusPill({ status }: { status: ResidentBill['status'] }) {
  const styles = {
    paid: 'bg-emerald-100 text-emerald-700',
    pending: 'bg-amber-100 text-amber-700',
    overdue: 'bg-red-100 text-red-600',
    void: 'bg-slate-100 text-slate-500',
  }[status];
  const label = status === 'paid' ? 'Paid' : status === 'pending' ? 'Unpaid' : status;
  return (
    <View className={`self-start rounded-md px-2.5 py-1 ${styles}`}>
      <Text className="text-xs font-bold uppercase">{label}</Text>
    </View>
  );
}

/** Review step content: bill facts + payment method + pay action. */
function ReviewStepContent({
  bill,
  method,
  onMethodChange,
  onPay,
  busy,
}: {
  bill: ResidentBill;
  method: PaymentMethodId;
  onMethodChange: (id: PaymentMethodId) => void;
  onPay: () => void;
  busy: boolean;
}) {
  const billAmount = Number(bill.amount_due) || 0;
  const unpaid = bill.status === 'pending' || bill.status === 'overdue';

  return (
    <View className="gap-6">
      {/* Bill summary */}
      <View className="rounded-2xl border border-slate-200 bg-white p-5">
        <View className="mb-1 flex-row items-center justify-between">
          <Text className="text-xs font-semibold tracking-wide text-slate-400">
            {formatPeriod(bill.billing_period).toUpperCase()} BILL
          </Text>
          <StatusPill status={bill.status} />
        </View>
        <Text className="text-3xl font-bold text-brand">{formatPeso(billAmount)}</Text>
        <View className="mt-4 border-t border-slate-100 pt-1">
          <InfoRow label="Account Number" value={bill.account?.account_number ?? '—'} />
          <InfoRow label="Bill Number" value={bill.bill_number} />
          <InfoRow label="Billing Period" value={formatPeriod(bill.billing_period)} />
          <InfoRow
            label="Due Date"
            value={bill.due_date ? formatBillDate(bill.due_date) : '—'}
          />
          <InfoRow
            label="Payment Status"
            value={bill.status === 'paid' ? 'Paid' : unpaid ? 'Unpaid' : bill.status}
          />
        </View>
      </View>

      {/* Payment method */}
      <View>
        <Text className="mb-3 text-base font-bold text-slate-800">Payment Method</Text>
        <View className="gap-3">
          {PAYMENT_METHODS.map((item) => {
            const selected = method === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => onMethodChange(item.id)}
                disabled={busy}
                className={`flex-row items-center gap-3 rounded-2xl border-2 bg-white px-4 py-3.5 active:opacity-90 ${
                  selected ? 'border-brand' : 'border-slate-200'
                }`}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={item.title}
              >
                <MethodIcon kind={item.icon} selected={selected} />
                <View className="flex-1">
                  <Text className="text-base font-bold text-slate-800">{item.title}</Text>
                  <Text className="mt-0.5 text-sm text-slate-400">{item.subtitle}</Text>
                </View>
                {selected ? <RadioSelected /> : <RadioEmpty />}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Summary */}
      <View>
        <Text className="mb-3 text-base font-bold text-slate-800">Summary</Text>
        <View className="rounded-2xl bg-slate-100 px-4 py-4">
          <View className="flex-row items-center justify-between py-1">
            <Text className="text-sm text-slate-500">Bill Amount</Text>
            <Text className="text-sm font-semibold text-slate-800">
              {formatPeso(billAmount)}
            </Text>
          </View>
          <View className="my-2 border-t border-slate-200" />
          <View className="flex-row items-center justify-between py-1">
            <Text className="text-base font-bold text-slate-800">Total</Text>
            <Text className="text-base font-bold text-brand">{formatPeso(billAmount)}</Text>
          </View>
        </View>

        {method !== 'cash' ? (
          <Text className="mt-2 text-center text-xs leading-4 text-slate-400">
            You'll complete the payment securely on PayMongo — GCash, Maya, cards and more.
          </Text>
        ) : null}

        <Pressable
          onPress={onPay}
          disabled={busy}
          className={`mt-4 items-center justify-center rounded-xl py-3.5 ${
            busy ? 'bg-brand/60' : 'bg-brand active:bg-brand-dark'
          }`}
          accessibilityRole="button"
          accessibilityLabel={method === 'cash' ? 'Pay at Barangay Hall' : 'Pay Online'}
        >
          {busy ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text className="text-base font-semibold text-white">
              {method === 'cash' ? 'Pay at Barangay Hall' : 'Pay Online'}
            </Text>
          )}
        </Pressable>
      </View>
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

/** Busy state with a spinner and honest status copy. */
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
      <View className="h-16 w-16 items-center justify-center rounded-full bg-brand-100">
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

function PrimaryButton({ label, onPress, disabled }: { label: string; onPress?: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`mt-6 items-center rounded-xl py-3.5 ${disabled ? 'bg-slate-300' : 'bg-brand active:bg-brand-dark'}`}
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

/**
 * Full resident payment journey for one bill. Rendered inline by the
 * Payments screen and inside a modal by the bill cards.
 *
 *   Review → (Pay Online) → Creating → Opening → Verifying → Confirmed
 *                                                        ↘ Cancelled/Expired: bill stays unpaid
 *                                                        ↘ Checkout error → retry
 *
 * Confirmation is ONLY ever driven by the database (webhook) — never by
 * returning from the PayMongo browser.
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
  const dialog = useDialog();
  const [method, setMethod] = useState<PaymentMethodId>('gcash');
  const [paidReceipt, setPaidReceipt] = useState<ResidentPayment | null>(null);
  const flow = usePayMongoCheckout(bill);
  // Fire the parent's confirmation callbacks exactly once per bill.
  const confirmedHandledRef = useRef(false);

  const unpaid = bill.status === 'pending' || bill.status === 'overdue';
  const busy = flow.state === 'creating' || flow.state === 'opening';

  // Already-paid bill → load the recorded payment so the receipt view can
  // show real data. If none exists yet, show an honest "no record" note.
  useEffect(() => {
    let cancelled = false;
    if (!unpaid) {
      getPaymentForBill(bill.id)
        .then((payment) => {
          if (!cancelled) setPaidReceipt(payment);
        })
        .catch(() => {
          if (!cancelled) setPaidReceipt(null);
        });
    } else {
      setPaidReceipt(null);
    }
    return () => {
      cancelled = true;
    };
  }, [bill.id, unpaid]);

  // Surface the confirmation to the parent (refresh bill card, etc.) — once.
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

  const handlePay = () => {
    if (method === 'cash') {
      dialog.alert(
        'Pay at Barangay Hall',
        `Bring ${formatPeso(Number(bill.amount_due) || 0)} for your ${formatPeriod(
          bill.billing_period
        )} bill to the Barangay Kalunasan Hall (Mon–Fri, 8AM–5PM) or an authorized payment center.`,
        { tone: 'info' }
      );
      return;
    }
    flow.start();
  };

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
        <View className="h-16 w-16 items-center justify-center rounded-full bg-brand-100">
          <ActivityIndicator size="large" color="#186252" />
        </View>
        <Text className="mt-5 text-center text-lg font-bold text-slate-900">
          Payment is being verified
        </Text>
        <Text className="mt-2 max-w-[85%] text-center text-sm leading-5 text-slate-500">
          Your payment is being confirmed by the barangay billing system. This
          usually takes a minute — we'll update this screen automatically as
          soon as it's confirmed.
        </Text>
        <View className="mt-4 w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Text className="text-center text-xs leading-5 text-amber-800">
            If you cancelled the payment or the session expired, no charge was
            made and your bill stays unpaid.
          </Text>
        </View>
        <PrimaryButton label="Check Payment Status" onPress={() => { void flow.checkAgain(); }} />
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
            value={formatPeso(payment?.amount ?? (Number(bill.amount_due) || 0))}
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

        <PrimaryButton label="Done" onPress={onClose} />
      </View>
    );
  } else if (flow.state === 'error') {
    content = (
      <View className="items-center px-2 pt-6">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <Text className="text-3xl">⚠️</Text>
        </View>
        <Text className="mt-5 text-center text-lg font-bold text-slate-900">
          Payment Could Not Start
        </Text>
        <Text className="mt-2 max-w-[85%] text-center text-sm leading-5 text-slate-500">
          {flow.errorMessage || 'Could not start the payment checkout. Please try again.'}
        </Text>
        <PrimaryButton label="Try Again" onPress={() => { void flow.start(); }} />
        <SecondaryButton label="Cancel" onPress={onClose} />
      </View>
    );
  } else if (!unpaid) {
    // idle + already paid → receipt instead of a pay button.
    content = <PaidReceiptContent payment={paidReceipt} />;
  } else {
    content = (
      <ReviewStepContent
        bill={bill}
        method={method}
        onMethodChange={setMethod}
        onPay={handlePay}
        busy={busy}
      />
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