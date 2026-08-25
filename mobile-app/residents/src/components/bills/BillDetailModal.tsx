import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { DetailModal } from '@/components/ui/DetailModal';
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

  if (!bill) return null;

  const extras = bill.extra_components ?? [];

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
