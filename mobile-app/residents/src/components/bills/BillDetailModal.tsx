import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { DetailModal } from '@/components/ui/DetailModal';
import { supabase } from '@/lib/supabase';
import {
  downloadBillPdf,
  formatBillDate,
  formatPeriod,
  formatPeso,
  type ResidentBill,
} from '@/services/billService';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between py-2">
      <Text className="text-sm text-slate-400">{label}</Text>
      <Text className="text-sm font-semibold text-slate-700">{value}</Text>
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
  return (
    <View className={`self-start rounded-full px-3 py-1 ${styles}`}>
      <Text className="text-xs font-bold uppercase">{status}</Text>
    </View>
  );
}

/**
 * Expanded bill view opened by tapping any bill card. Shows only the data
 * that actually exists in Supabase for this bill — nothing invented.
 * Download PDF uses the barangay printed-receipt layout.
 */
export function BillDetailModal({
  visible,
  onClose,
  bill,
}: {
  visible: boolean;
  onClose: () => void;
  bill: ResidentBill | null;
}) {
  const [downloading, setDownloading] = useState(false);
  const [testingPayMongo, setTestingPayMongo] = useState(false);

  if (!bill) return null;

  const extras = bill.extra_components ?? [];
  const unpaid = bill.status === 'pending' || bill.status === 'overdue';

  const handleTestPayMongoCheckout = async () => {
    if (!bill?.id) {
      Alert.alert('No Bill Found', 'There is no bill record available to test.');
      return;
    }
    if (testingPayMongo) return;

    setTestingPayMongo(true);
    try {
      const existingBillId = bill.id;

      const { data, error: fnError } = await supabase.functions.invoke(
        'create-paymongo-checkout',
        {
          body: {
            bill_id: existingBillId,
          },
        }
      );

      if (fnError) {
        throw new Error(fnError.message || 'Failed to invoke payment function.');
      }

      if (!data?.checkout_url) {
        throw new Error(data?.error || 'Payment gateway did not return a checkout URL.');
      }

      console.log('[PayMongo Test Checkout Result]', {
        success: data.success,
        checkout_session_id: data.checkout_session_id,
        checkout_url: data.checkout_url,
        amount: data.amount,
        currency: data.currency,
        reference_number: data.reference_number,
      });

      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          window.open(data.checkout_url, '_blank');
        } else {
          await Linking.openURL(data.checkout_url);
        }
      } else {
        try {
          await WebBrowser.openBrowserAsync(data.checkout_url);
        } catch {
          await Linking.openURL(data.checkout_url);
        }
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      console.error('[PayMongo Test Error]:', errMsg);
      Alert.alert('Test Checkout Error', errMsg);
    } finally {
      setTestingPayMongo(false);
    }
  };

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadBillPdf(bill);
    } catch (err) {
      Alert.alert(
        'Download failed',
        err instanceof Error ? err.message : 'Could not create the PDF receipt.'
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <DetailModal
      visible={visible}
      onClose={onClose}
      badge={<StatusPill status={bill.status} />}
      title={formatPeriod(bill.billing_period)}
      subtitle={`${bill.bill_number}${bill.account?.account_number ? ` · Account ${bill.account.account_number}` : ''}`}
      secondaryAction={{
        label: 'Download PDF',
        onPress: handleDownload,
        loading: downloading,
        disabled: downloading,
      }}
    >
      <View className="rounded-2xl bg-brand/5 px-4 py-4">
        <Text className="text-center text-xs uppercase tracking-wide text-slate-400">
          Amount Due
        </Text>
        <Text className="mt-1 text-center text-3xl font-bold text-brand">
          {formatPeso(bill.amount_due)}
        </Text>
      </View>

      {unpaid ? (
        <View className="mt-3">
          <Pressable
            onPress={handleTestPayMongoCheckout}
            disabled={testingPayMongo}
            className={`items-center justify-center rounded-xl bg-amber-500 py-3.5 active:bg-amber-600 ${
              testingPayMongo ? 'opacity-70' : ''
            }`}
            accessibilityRole="button"
            accessibilityLabel="Test PayMongo Checkout"
          >
            {testingPayMongo ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text className="text-sm font-bold text-white">Creating Checkout Session…</Text>
              </View>
            ) : (
              <Text className="text-sm font-bold text-white">🧪 Test PayMongo Checkout</Text>
            )}
          </Pressable>
        </View>
      ) : null}

      <View className="mt-4 rounded-2xl bg-white px-4 py-2">
        <Row label="Billing Period" value={formatPeriod(bill.billing_period)} />
        {bill.period_start && bill.period_end ? (
          <Row
            label="Covers"
            value={`${formatBillDate(bill.period_start)} – ${formatBillDate(bill.period_end)}`}
          />
        ) : null}
        <Row
          label="Previous Reading"
          value={bill.previous_reading !== null ? `${bill.previous_reading} m³` : '—'}
        />
        <Row
          label="Current Reading"
          value={bill.current_reading !== null ? `${bill.current_reading} m³` : '—'}
        />
        <Row
          label="Consumption"
          value={bill.consumption !== null ? `${bill.consumption} m³` : '—'}
        />
        <Row label="Rate (per m³)" value={formatPeso(bill.water_rate)} />
        {extras.map((c, i) => (
          <Row key={`${c.category}-${i}`} label={c.category} value={formatPeso(c.price)} />
        ))}
      </View>

      <View className="mb-4 mt-4 rounded-2xl bg-white px-4 py-2">
        <Row label="Due Date" value={bill.due_date ? formatBillDate(bill.due_date) : '—'} />
        <Row
          label="Payment Status"
          value={bill.status === 'paid' ? 'Paid' : bill.status === 'void' ? 'Voided' : 'Unpaid'}
        />
        {bill.paid_at ? <Row label="Paid On" value={formatBillDate(bill.paid_at)} /> : null}
      </View>
    </DetailModal>
  );
}
