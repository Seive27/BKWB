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

/** The two ways a resident can settle a bill. */
type PaymentOptionId = 'online' | 'barangay';

type PaymentOptionIcon = 'wallet' | 'card' | 'pin';

type PaymentOption = {
  id: PaymentOptionId;
  title: string;
  subtitle: string;
  icon: PaymentOptionIcon;
};

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: 'online',
    title: 'Pay Online',
    subtitle: 'Secure online payment through the available payment gateway.',
    icon: 'wallet',
  },
  {
    id: 'barangay',
    title: 'Pay at Barangay Hall',
    subtitle: 'Pay your bill directly at the barangay hall.',
    icon: 'pin',
  },
];

function MethodIcon({
  kind,
  selected,
}: {
  kind: PaymentOptionIcon;
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

/**
 * One tappable payment option. Tapping it either starts PayMongo or shows the
 * walk-in instructions — there is no radio state that can be left unselected.
 */
function PaymentOptionCard({
  option,
  onPress,
  disabled,
}: {
  option: PaymentOption;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`flex-row items-center gap-3 rounded-2xl border-2 border-slate-200 bg-white px-4 py-3.5 active:border-brand active:opacity-90 ${
        disabled ? 'opacity-60' : ''
      }`}
      accessibilityRole="button"
      accessibilityLabel={option.title}
    >
      <MethodIcon kind={option.icon} selected={false} />
      <View className="flex-1">
        <Text className="text-base font-bold text-slate-800">{option.title}</Text>
        <Text className="mt-0.5 text-sm text-slate-400">{option.subtitle}</Text>
      </View>
    </Pressable>
  );
}

/**
 * First step: the bill facts the resident must see (amount due, bill number)
 * followed by the two ways to settle it.
 */
function PaymentOptionsStep({
  bill,
  busy,
  onPayOnline,
  onPayBarangay,
}: {
  bill: ResidentBill;
  busy: boolean;
  onPayOnline: () => void;
  onPayBarangay: () => void;
}) {
  const billAmount = Number(bill.amount_due) || 0;

  return (
    <View className="gap-6">
      {/* Bill summary */}
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

      {/* The two ways to settle the bill. */}
      <View>
        <Text className="mb-3 text-base font-bold text-slate-800">
          Choose how you want to pay
        </Text>
        <View className="gap-3">
          {PAYMENT_OPTIONS.map((option) => (
            <PaymentOptionCard
              key={option.id}
              option={option}
              disabled={busy}
              onPress={option.id === 'online' ? onPayOnline : onPayBarangay}
            />
          ))}
        </View>
        <Text className="mt-3 text-center text-xs leading-4 text-slate-400">
          Online payments are completed securely on PayMongo. You can also pay in
          person at the barangay hall.
        </Text>
      </View>
    </View>
  );
}

/**
 * Walk-in instructions for a manual payment. Informational only — it never
 * creates a payment record and never marks the bill paid; staff record the
 * payment through their own workflow.
 */
function BarangayPaymentInfo({
  bill,
  onClose,
  onPayOnlineInstead,
}: {
  bill: ResidentBill;
  onClose?: () => void;
  onPayOnlineInstead: () => void;
}) {
  const billAmount = Number(bill.amount_due) || 0;

  return (
    <View className="gap-4">
      <View className="items-center rounded-2xl border border-slate-200 bg-white px-5 py-6">
        <View className="h-14 w-14 items-center justify-center rounded-full bg-brand/10">
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z"
              stroke="#186252"
              strokeWidth={1.8}
            />
            <Circle cx={12} cy={11} r={2.2} stroke="#186252" strokeWidth={1.8} />
          </Svg>
        </View>
        <Text className="mt-3 text-lg font-bold text-slate-900">Pay at Barangay Hall</Text>
        <Text className="mt-1 text-center text-sm leading-5 text-slate-500">
          You can pay this bill at the Barangay Kalunasan Water Billing office.
        </Text>
      </View>

      <View className="rounded-2xl border border-slate-200 bg-white px-4 py-2">
        <InfoRow label="Bill Number" value={bill.bill_number} />
        <InfoRow label="Amount Due" value={formatPeso(billAmount)} />
        <InfoRow label="Billing Period" value={formatPeriod(bill.billing_period)} />
      </View>

      <View className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <Text className="text-center text-xs leading-5 text-amber-800">
          Pay during office hours (Mon–Fri, 8AM–5PM). Barangay staff will record your
          payment — this bill stays unpaid until they do.
        </Text>
      </View>

      <PrimaryButton label="Close" onPress={onClose} />
      <SecondaryButton label="Pay Online Instead" onPress={onPayOnlineInstead} />
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
 *   Choose how to pay → (Pay Online) → Creating → Opening → Verifying → Confirmed
 *                     → (Pay at Barangay Hall) → walk-in instructions (no record)
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
  const [showBarangayInfo, setShowBarangayInfo] = useState(false);
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
  // A different bill always starts back on the payment-options step.
  useEffect(() => {
    confirmedHandledRef.current = false;
    setShowBarangayInfo(false);
  }, [bill.id]);

  useEffect(() => {
    if (flow.state === 'confirmed' && !confirmedHandledRef.current) {
      confirmedHandledRef.current = true;
      onConfirmed?.(flow.confirmedPayment);
      onBillPaid?.();
    }
  }, [flow.state, flow.confirmedPayment, onConfirmed, onBillPaid]);

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
        <SecondaryButton label="Cancel" onPress={onClose} />
      </View>
    );
  } else if (!unpaid) {
    // idle + already paid → receipt instead of a pay button.
    content = <PaidReceiptContent payment={paidReceipt} />;
  } else if (showBarangayInfo) {
    content = (
      <BarangayPaymentInfo
        bill={bill}
        onClose={onClose}
        onPayOnlineInstead={() => setShowBarangayInfo(false)}
      />
    );
  } else {
    content = (
      <PaymentOptionsStep
        bill={bill}
        busy={busy}
        onPayOnline={() => {
          void flow.start();
        }}
        onPayBarangay={() => setShowBarangayInfo(true)}
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