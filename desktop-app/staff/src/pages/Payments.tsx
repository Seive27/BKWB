import React, { useState } from 'react';
import {
  User,
  MapPin,
  Calendar as CalendarIcon,
  CheckCircle,
  Printer,
  Download,
  X,
  CreditCard,
  Smartphone,
  Building,
  Info,
  Check,
} from 'lucide-react';

interface UnpaidBill {
  period: string;
  accountName: string;
  amount: number;
  status: 'unpaid';
  selected: boolean;
}

const Payments: React.FC = () => {
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  return (
    <>
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-8">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Process Payment</h1>
              <p className="text-gray-600">
                Manage resident billings and record payment transactions.
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase">Current Session</p>
              <p className="text-sm font-semibold text-gray-900">Oct 24, 2023 | 10:45 AM</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* Left Section - Resident Info */}
            <div className="col-span-2 space-y-6">
              {/* Resident Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center">
                      <User className="w-8 h-8 text-primary-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">John Dela Cruz</h2>
                      <p className="text-sm text-primary-600 font-medium">KW-2024-001</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase mb-1">Consumer ID</p>
                    <p className="text-lg font-bold text-gray-900">429</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-2">Service Address</p>
                    <div className="flex items-start space-x-2">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                      <p className="text-sm text-gray-900">
                        Block 5, Lot 12,<br />Kalunasan Phase 1
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-2">Last Payment Date</p>
                    <div className="flex items-start space-x-2">
                      <CalendarIcon className="w-4 h-4 text-gray-400 mt-0.5" />
                      <p className="text-sm text-gray-900">Sep 15, 2023</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-2">Next Due Date</p>
                    <div className="flex items-start space-x-2">
                      <CalendarIcon className="w-4 h-4 text-red-400 mt-0.5" />
                      <p className="text-sm text-red-600 font-medium">Oct 30, 2023</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Unpaid Bills Table */}
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">Unpaid Billing Summary</h3>
                  <span className="text-sm text-gray-600">3 Pending Bills</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left w-12">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                          Billing Period
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                          Account Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                          Amount Due
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked
                            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">Sep 2023</div>
                          <div className="text-xs text-gray-500">Sep 01 - 30</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          Water Consumption Fee
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                          ₱450.00
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                            UNPAID
                          </span>
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked
                            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">Aug 2023</div>
                          <div className="text-xs text-gray-500">Aug 01 - 31</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          Late Payment Penalty
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                          ₱50.00
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                            UNPAID
                          </span>
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">Jul 2023</div>
                          <div className="text-xs text-gray-500">Jul 01 - 31</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          Maintenance Fee
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                          ₱120.00
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                            UNPAID
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Section - Payment Summary */}
            <div className="space-y-6">
              {/* Payment Summary Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Payment Summary</h3>

                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-2">Total Selected</p>
                  <p className="text-4xl font-bold text-primary-600">₱500.00</p>
                </div>

                <div className="mb-6">
                  <p className="text-xs text-gray-600 uppercase mb-3">Payment Method</p>
                  <div className="space-y-2">
                    <label className="flex items-center p-3 border-2 border-primary-500 rounded-lg cursor-pointer bg-primary-50">
                      <input
                        type="radio"
                        name="payment"
                        checked
                        className="w-4 h-4 text-primary-600"
                      />
                      <CreditCard className="w-5 h-5 text-primary-600 mx-3" />
                      <span className="text-sm font-medium text-gray-900">Cash</span>
                    </label>
                    <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="payment"
                        className="w-4 h-4 text-primary-600"
                      />
                      <Smartphone className="w-5 h-5 text-gray-400 mx-3" />
                      <span className="text-sm font-medium text-gray-900">GCash</span>
                    </label>
                    <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="payment"
                        className="w-4 h-4 text-primary-600"
                      />
                      <Building className="w-5 h-5 text-gray-400 mx-3" />
                      <span className="text-sm font-medium text-gray-900">Bank</span>
                    </label>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-xs text-gray-600 uppercase mb-2">
                    Amount Received
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                      ₱
                    </span>
                    <input
                      type="text"
                      value="0.00"
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg font-semibold"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-t border-gray-200">
                  <span className="text-sm text-gray-600">Change Due</span>
                  <span className="text-xl font-bold text-gray-900">₱0.00</span>
                </div>

                <button
                  onClick={() => {
                    setShowProcessModal(false);
                    setShowConfirmModal(true);
                  }}
                  className="w-full mt-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold">Process Payment</span>
                </button>

                <div className="flex items-center space-x-2 mt-4">
                  <button className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                    Clear Selection
                  </button>
                  <button className="flex-1 py-2 border border-gray-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Payment Modal */}
      {showConfirmModal && (
        <ConfirmPaymentModal
          onClose={() => setShowConfirmModal(false)}
          onConfirm={() => {
            setShowConfirmModal(false);
            setShowSuccessModal(true);
          }}
        />
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <PaymentSuccessModal onClose={() => setShowSuccessModal(false)} />
      )}
    </>
  );
};

// Confirm Payment Modal
const ConfirmPaymentModal: React.FC<{
  onClose: () => void;
  onConfirm: () => void;
}> = ({ onClose, onConfirm }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-primary-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Confirm Payment</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <div>
            <p className="text-xs text-gray-500 uppercase mb-3">Selected Bills</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-700">Billing: October 2023 (Unit 402)</span>
                <span className="text-sm font-semibold text-gray-900">₱450.00</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-700">Billing: October 2023 (Unit 201)</span>
                <span className="text-sm font-semibold text-gray-900">₱50.00</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <span className="text-base font-medium text-gray-900">Total Amount</span>
              <span className="text-2xl font-bold text-primary-600">₱500.00</span>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Payment Method</p>
                <div className="flex items-center space-x-2">
                  <CreditCard className="w-4 h-4 text-primary-600" />
                  <span className="text-sm font-medium text-gray-900">Cash</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Reference ID</p>
                <span className="text-sm font-medium text-gray-900">KW-TXN-9421</span>
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-900">
              Are you sure you want to process this payment? This action will mark these bills
              as paid and generate a digital receipt for the residents.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center space-x-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Check className="w-4 h-4" />
            <span>Confirm Payment</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Payment Success Modal
const PaymentSuccessModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        {/* Header */}
        <div className="p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful</h2>
          <p className="text-sm text-gray-600">Thank you for your payment.</p>
        </div>

        {/* Body */}
        <div className="px-8 pb-8 space-y-6">
          <div className="p-6 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-500 uppercase text-center mb-2">Total Paid</p>
            <p className="text-4xl font-bold text-primary-600 text-center">₱500.00</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">Resident Name</span>
              <span className="text-sm font-semibold text-gray-900">John Dela Cruz</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">Reference / OR</span>
              <span className="text-sm font-semibold text-gray-900">OR-882190</span>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-gray-200 pt-3">
              <span className="text-sm text-gray-600">Date & Time</span>
              <span className="text-sm font-semibold text-gray-900">Oct 24, 2023, 10:30 AM</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">Payment Method</span>
              <div className="flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-semibold text-gray-900">Cash</span>
              </div>
            </div>
          </div>

          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 uppercase mb-1">Kalunasan Waters</p>
            <p className="text-xs text-gray-400">Official Electronic Receipt</p>
          </div>

          <div className="space-y-3">
            <button className="w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center space-x-2">
              <Printer className="w-5 h-5" />
              <span className="font-semibold">Print Receipt</span>
            </button>
            <button className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2">
              <Download className="w-5 h-5" />
              <span className="font-semibold">Download PDF</span>
            </button>
            <button
              onClick={onClose}
              className="w-full py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payments;
