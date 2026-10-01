const fs = require('fs');

function fixFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 1. Add useToast import
    if (!content.includes("import { useToast }")) {
        content = content.replace("import { useAuth }", "import { useAuth } from '../hooks/useAuth';\nimport { useToast } from '../components/ui/ToastProvider';\n//");
    }
    
    // 2. Add getPendingPayments to loadData and subscribeToPayments
    if (!content.includes("getPendingPayments().catch")) {
        content = content.replace("getSitioOptions().catch(() => [] as string[]),", "getSitioOptions().catch(() => [] as string[]),\n          getPendingPayments().catch(() => []),");
        content = content.replace("const [resList, billList, sitioList] = await Promise.all([", "const [resList, billList, sitioList, pendingPaymentsList] = await Promise.all([");
        content = content.replace("setBills(billList);", "setBills(billList);\n        setPendingOnlinePayments(pendingPaymentsList);");
        
        content = content.replace(/const unsubPayments = subscribeToPayments\(\(\) => \{[\s\S]*?\}\);/, 
        `const unsubPayments = subscribeToPayments((event, row) => {
        getBills().then((b) => setBills(b)).catch(() => {});
        getPendingPayments().then((p) => setPendingOnlinePayments(p)).catch(() => {});
        if (event === 'INSERT' && row && row.status === 'pending') {
          showToast('info', 'New online payment submitted!');
        }
      });`);
    }

    // 3. Add showToast hook
    if (!content.includes("showToast = useToast()")) {
        content = content.replace("const [verifyingPaymentId, setVerifyingPaymentId] = useState<string | null>(null);", "const [verifyingPaymentId, setVerifyingPaymentId] = useState<string | null>(null);\n  const { showToast } = useToast();");
    }

    // 4. Update the Pending Online Payments Table to filter by resident_id and remove Resident column
    const pendingTableStart = content.indexOf('{pendingOnlinePayments.length > 0 && (');
    if (pendingTableStart !== -1) {
        const pendingTableReplacement = `{pendingOnlinePayments.filter(p => p.resident_id === selectedResident.id).length > 0 && (
                    <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden mb-6 mt-4">
                      <div className="bg-amber-50 p-4 border-b border-amber-200 flex justify-between items-center">
                        <div>
                          <h3 className="font-semibold text-amber-800 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            Pending Online Payments ({pendingOnlinePayments.filter(p => p.resident_id === selectedResident.id).length})
                          </h3>
                          <p className="text-sm text-amber-700 mt-1">Resident has submitted payment reference numbers. Please verify.</p>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-amber-50/50 border-b border-amber-100">
                            <tr>
                              <th className="px-4 py-3 text-left font-semibold text-amber-900">Reference #</th>
                              <th className="px-4 py-3 text-left font-semibold text-amber-900">Amount</th>
                              <th className="px-4 py-3 text-left font-semibold text-amber-900">Date</th>
                              <th className="px-4 py-3 text-right font-semibold text-amber-900">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-amber-100">
                            {pendingOnlinePayments.filter(p => p.resident_id === selectedResident.id).map((p) => (
                              <tr key={p.id} className="hover:bg-amber-50/30">
                                <td className="px-4 py-3 font-mono text-gray-700 font-semibold">{p.reference_number}</td>
                                <td className="px-4 py-3 font-medium text-amber-700">?{p.amount.toLocaleString()}</td>
                                <td className="px-4 py-3 text-gray-600">{new Date(p.created_at).toLocaleDateString()}</td>
                                <td className="px-4 py-3 text-right space-x-2">
                                  <button
                                    onClick={async () => {
                                      if(window.confirm('Approve ' + p.payment_method + ' payment?')) {
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
                                        const reason = window.prompt('Enter rejection reason (Required):');
                                        if (reason !== null) {
                                          if (reason.trim() === '') {
                                            alert('Rejection reason is required.');
                                            return;
                                          }
                                          setVerifyingPaymentId(p.id);
                                          try {
                                            await verifyPendingPaymentRPC(p.id, 'reject', reason.trim());
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
                  )}`;
        const pendingTableEnd = content.indexOf(')}', content.indexOf('</tbody>', pendingTableStart)) + 2;
        content = content.slice(0, pendingTableStart) + pendingTableReplacement + content.slice(pendingTableEnd);
    }
    
    // 5. Replace Payment Method Radio buttons (Remove Bank Transfer, Add MariBank)
    const bankTransferStr = `<label
                          onClick={() => setPaymentMethod('bank')}
                          className={\`flex items-center p-3 border rounded-lg cursor-pointer transition-all \${
                            paymentMethod === 'bank'
                              ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500 text-primary-900'
                              : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                          }\`}
                        >
                          <input
                            type="radio"
                            name="paymentMethod"
                            checked={paymentMethod === 'bank'}
                            onChange={() => setPaymentMethod('bank')}
                            className="w-4 h-4 text-primary-600 accent-primary-600 focus:ring-primary-500"
                          />
                          <Building className="w-5 h-5 text-primary-600 mx-3 flex-shrink-0" />
                          <div>
                            <span className="text-sm font-bold block">Bank Transfer</span>
                            <span className="text-xs text-gray-500">Bank deposit or online transfer</span>
                          </div>
                        </label>`;
                        
    const maribankStr = `<label
                          onClick={() => setPaymentMethod('maribank' as PaymentMethod)}
                          className={\`flex items-center p-3 border rounded-lg cursor-pointer transition-all \${
                            paymentMethod === 'maribank'
                              ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500 text-primary-900'
                              : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                          }\`}
                        >
                          <input
                            type="radio"
                            name="paymentMethod"
                            checked={paymentMethod === 'maribank'}
                            onChange={() => setPaymentMethod('maribank' as PaymentMethod)}
                            className="w-4 h-4 text-primary-600 accent-primary-600 focus:ring-primary-500"
                          />
                          <Building className="w-5 h-5 text-primary-600 mx-3 flex-shrink-0" />
                          <div>
                            <span className="text-sm font-bold block">MariBank</span>
                            <span className="text-xs text-gray-500">MariBank online payment</span>
                          </div>
                        </label>`;
                        
    content = content.replace(bankTransferStr, maribankStr);
    
    // 6. Fix "Bank Transaction Reference" label logic
    content = content.replace(
        `{paymentMethod === 'gcash' ? 'GCash Reference No.' : 'Bank Transaction Reference'} *`,
        `{paymentMethod === 'gcash' ? 'GCash Reference No.' : 'MariBank Reference No.'} *`
    );
    
    // 7. Update getPendingPayments import
    content = content.replace("import { verifyPendingPaymentRPC } from '../services/paymentService';", "import { getPendingPayments, verifyPendingPaymentRPC } from '../services/paymentService';");
    content = content.replace("import { getPendingPayments, getPendingPayments, verifyPendingPaymentRPC }", "import { getPendingPayments, verifyPendingPaymentRPC }");

    fs.writeFileSync(filePath, content);
}

fixFile('desktop-app/staff/src/pages/Payments.tsx');
fixFile('desktop-app/super-admin/src/pages/Payments.tsx');
