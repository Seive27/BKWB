import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { friendlyErrorMessage } from '@/lib/errors';
import {
  getMyBills,
  subscribeToMyBills,
  type ResidentBill,
} from '@/services/billService';
import {
  createCheckoutSession,
  getPaymentForBill,
  type ResidentPayment,
} from '@/services/paymentService';

/**
 * PayMongo hosted-checkout state machine for one bill.
 *
 * States:
 *   idle       – ready to pay (review screen)
 *   creating   – checkout session is being created with the edge function
 *   opening    – PayMongo hosted checkout is opening in the browser
 *   verifying  – resident returned from PayMongo; waiting for the webhook to
 *                update the database (the DB is the SOURCE OF TRUTH — this
 *                screen never marks a bill paid on its own)
 *   confirmed  – the webhook/database confirmed the payment
 *   error      – checkout creation failed (network, gateway, …)
 *
 * "Cancelled / Expired / Failed" are NOT separate machine states because the
 * database never records them (the webhook acknowledges those events and
 * leaves billing state untouched). Instead the verifying screen honestly
 * tells the resident that if they cancelled or the session expired, no
 * charge was made and the bill stays unpaid.
 *
 * Duplicate protection: `start()` is guarded by a ref so double taps,
 * repeated presses or slow networks can never create two checkout sessions.
 */
export type PayMongoFlowState =
  | 'idle'
  | 'creating'
  | 'opening'
  | 'verifying'
  | 'confirmed'
  | 'error';

export function usePayMongoCheckout(bill: ResidentBill | null) {
  const [state, setState] = useState<PayMongoFlowState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmedPayment, setConfirmedPayment] = useState<ResidentPayment | null>(null);
  const [checkoutReference, setCheckoutReference] = useState('');

  // In-flight guard: a second tap while a checkout is being created or the
  // browser is opening is ignored entirely.
  const busyRef = useRef(false);
  const billIdRef = useRef<string | null>(bill?.id ?? null);
  const stateRef = useRef<PayMongoFlowState>('idle');
  const stopWatcherRef = useRef<(() => void) | null>(null);
  stateRef.current = state;

  useEffect(() => {
    billIdRef.current = bill?.id ?? null;
    // A different bill was loaded — never carry a stale confirmation over.
    setState('idle');
    setConfirmedPayment(null);
    setErrorMessage('');
    setCheckoutReference('');
    stopWatcherRef.current?.();
  }, [bill?.id]);

  /** Check the database directly for the bill being paid. */
  const checkBillStatus = useCallback(async (): Promise<boolean> => {
    const billId = billIdRef.current;
    if (!billId) return false;

    const bills = await getMyBills();
    const current = bills.find((b) => b.id === billId);
    if (!current || current.status !== 'paid') return false;

    const payment = await getPaymentForBill(billId);
    setConfirmedPayment(payment);
    setState('confirmed');
    return true;
  }, []);

  /**
   * Start watching for the webhook confirmation: realtime pushes plus a
   * lightweight poll. Stops as soon as the database confirms the payment,
   * when the flow leaves the verifying state, or on unmount.
   */
  const startWatching = useCallback(() => {
    stopWatcherRef.current?.();

    const unsubscribe = subscribeToMyBills(() => {
      checkBillStatus().catch(() => {});
    });
    const pollTimer = setInterval(() => {
      checkBillStatus().catch(() => {});
    }, 3000);
    const guard = setInterval(() => {
      if (stateRef.current === 'confirmed' || stateRef.current !== 'verifying') {
        stopWatcherRef.current?.();
      }
    }, 500);

    stopWatcherRef.current = () => {
      unsubscribe();
      clearInterval(pollTimer);
      clearInterval(guard);
      stopWatcherRef.current = null;
    };
  }, [checkBillStatus]);

  // Never leak the realtime channel or timers across screen unmounts.
  useEffect(() => {
    return () => {
      stopWatcherRef.current?.();
    };
  }, []);

  const startVerification = useCallback(() => {
    if (stateRef.current === 'confirmed') return;
    setState('verifying');
    startWatching();
  }, [startWatching]);

  /** Open the hosted checkout in an in-app browser (native) or new tab (web). */
  const openCheckout = useCallback(async (url: string) => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.open(url, '_blank');
      } else {
        await Linking.openURL(url);
      }
      return;
    }
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      await Linking.openURL(url);
    }
  }, []);

  /** Run the full flow: create session → open checkout → verify. */
  const start = useCallback(async () => {
    const billId = billIdRef.current;
    if (!billId || busyRef.current) return;
    busyRef.current = true;

    setErrorMessage('');
    setConfirmedPayment(null);
    try {
      setState('creating');
      const session = await createCheckoutSession(billId);
      setCheckoutReference(session.referenceNumber);
      setState('opening');
      await openCheckout(session.checkoutUrl);
      // Returning from the browser means NOTHING about the payment outcome —
      // the webhook is the only authority. Enter the verifying state.
      startVerification();
    } catch (err) {
      console.warn('[paymongo-flow] checkout creation failed:', err);
      setErrorMessage(
        friendlyErrorMessage(err, 'Could not start the payment checkout. Please try again.')
      );
      setState('error');
    } finally {
      busyRef.current = false;
    }
  }, [openCheckout, startVerification]);

  /** Manual re-check from the verifying screen (e.g. after a slow webhook). */
  const checkAgain = useCallback(async () => {
    if (stateRef.current !== 'verifying') return;
    await checkBillStatus();
  }, [checkBillStatus]);

  /** Return to the review screen (retry path after an error). */
  const reset = useCallback(() => {
    setErrorMessage('');
    setState('idle');
  }, []);

  return {
    state,
    errorMessage,
    confirmedPayment,
    checkoutReference,
    start,
    checkAgain,
    reset,
  };
}