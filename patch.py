import re

with open('desktop-app/staff/src/pages/Payments.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import_statement = "import { getPendingPayments, verifyPendingPaymentRPC } from '../services/paymentService';\n"
if "getPendingPayments" not in content:
    content = content.replace("import { getBills, subscribeToBills }", import_statement + "import { getBills, subscribeToBills }")

# Add state variables
state_vars = """
  const [pendingOnlinePayments, setPendingOnlinePayments] = useState<any[]>([]);
  const [verifyingPaymentId, setVerifyingPaymentId] = useState<string | null>(null);
"""
if "pendingOnlinePayments" not in content:
    content = re.sub(r'const \[selectedBillIds, setSelectedBillIds\] = useState<string\[\]>\(\[\]\);', r'const [selectedBillIds, setSelectedBillIds] = useState<string[]>([]);\n' + state_vars, content)

# Add loadData for pending payments
load_data = """
      const pending = await getPendingPayments();
      setPendingOnlinePayments(pending);
"""
if "getPendingPayments()" not in content:
    content = re.sub(r'(const residentBillsData = await getBills\(\);)', r'\1\n' + load_data, content)

# Add UI for pending payments
ui_section = """
                {/* Pending Online Payments Table */}
                {pendingOnlinePayments.length > 0 && (
                  <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden mb-6">
                    <div className="bg-amber-50 p-4 border-b border-amber-200">
                      <h3 className="font-semibold text-amber-800 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        Pending Online Payments ({pendingOnlinePayments.length})
                      </h3>
                      <p className="text-sm text-amber-700 mt-1">Residents have submitted GCash reference numbers. Please verify.</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-amber-50/50 border-b border-amber-100">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold text-amber-900">Resident</th>
                            <th className="px-4 py-3 text-left font-semibold text-amber-900">Reference #</th>
                            <th className="px-4 py-3 text-left font-semibold text-amber-900">Amount</th>
                            <th className="px-4 py-3 text-left font-semibold text-amber-900">Date</th>
                            <th className="px-4 py-3 text-right font-semibold text-amber-900">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-100">
                          {pendingOnlinePayments.map((p) => (
                            <tr key={p.id} className="hover:bg-amber-50/30">
                              <td className="px-4 py-3">
                                <div className="font-medium text-gray-900">{p.profiles?.first_name} {p.profiles?.last_name}</div>
                                <div className="text-xs text-gray-500">Bill {p.bills?.bill_number}</div>
                              </td>
                              <td className="px-4 py-3 font-mono text-gray-700">{p.reference_number}</td>
                              <td className="px-4 py-3 font-medium text-amber-700">₱{p.amount.toLocaleString()}</td>
                              <td className="px-4 py-3 text-gray-600">{new Date(p.created_at).toLocaleDateString()}</td>
                              <td className="px-4 py-3 text-right space-x-2">
                                <button
                                  onClick={async () => {
                                    if(confirm('Approve payment?')) {
                                      setVerifyingPaymentId(p.id);
                                      try {
                                        await verifyPendingPaymentRPC(p.id, 'approve');
                                        await loadData();
                                      } catch(e: any) { alert(e.message); }
                                      setVerifyingPaymentId(null);
                                    }
                                  }}
                                  disabled={verifyingPaymentId === p.id}
                                  className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 font-medium"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={async () => {
                                    if(confirm('Reject payment?')) {
                                      setVerifyingPaymentId(p.id);
                                      try {
                                        await verifyPendingPaymentRPC(p.id, 'reject');
                                        await loadData();
                                      } catch(e: any) { alert(e.message); }
                                      setVerifyingPaymentId(null);
                                    }
                                  }}
                                  disabled={verifyingPaymentId === p.id}
                                  className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium"
                                >
                                  Reject
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
"""

if "Pending Online Payments Table" not in content:
    content = content.replace("{/* Unpaid Bills Table */}", ui_section + "\n                {/* Unpaid Bills Table */}")

with open('desktop-app/staff/src/pages/Payments.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
