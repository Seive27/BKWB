import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LinkingExpo from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { friendlyErrorMessage } from '@/lib/errors';
import { SUPABASE_URL } from '@/lib/env';
import {
  getMyBills,
  subscribeToMyBills,
  type ResidentBill,
} from '@/services/billService';
import {
  createCheckoutSession,
  getPaymentForBill,
  verifyPayMongoPayment,
  type ResidentPayment,
} from '@/services/paymentService';

WebBrowser.maybeCompleteAuthSession();

const SESSION_KEY_PREFIX = 'paymongo.checkoutSession.';

function sessionStorageKey(billId: string) {
  return `${SESSION_KEY_PREFIX}${billId}`;
}

/** HTTPS return page used as PayMongo success/cancel_url. */
function paymongoReturnBase(): string {
  return `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/paymongo-return`;
}

/** Deep link that re-opens this Expo session (works in Expo Go + builds). */
function appPaymentReturnUrl(billId?: string | null): string {
  return LinkingExpo.createURL('/', {
    queryParams: {
      paymentReturn: 'success',
      ...(billId ? { bill_id: billId } : {}),
    },
  });
}

/**
 * PayMongo hosted-checkout state machine for one bill.
 *
 * Confirmation is NEVER based on the browser return alone. The DB is the
 * source of truth (webhook and/or verify-paymongo-payment → RPC).
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
  const [statusMessage, setStatusMessage] = useState('');
  const [checking, setChecking] = useState(false);
  const [confirmedPayment, setConfirmedPayment] = useState<ResidentPayment | null>(null);
  const [checkoutReference, setCheckoutReference] = useState('');

  const busyRef = useRef(false);
  const billIdRef = useRef<string | null>(bill?.id ?? null);
  const checkoutSessionIdRef = useRef<string | null>(null);
  const stateRef = useRef<PayMongoFlowState>('idle');
  const stopWatcherRef = useRef<(() => void) | null>(null);
  stateRef.current = state;

  const rememberSession = useCallback(async (billId: string, sessionId: string) => {
    checkoutSessionIdRef.current = sessionId;
    try {
      await AsyncStorage.setItem(sessionStorageKey(billId), sessionId);
    } catch {
      // non-fatal
    }
  }, []);

  const loadStoredSession = useCallback(async (billId: string) => {
    try {
      const stored = await AsyncStorage.getItem(sessionStorageKey(billId));
      if (stored) checkoutSessionIdRef.current = stored;
      return stored;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    billIdRef.current = bill?.id ?? null;
    checkoutSessionIdRef.current = null;
    setState('idle');
    setConfirmedPayment(null);
    setErrorMessage('');
    setStatusMessage('');
    setCheckoutReference('');
    setChecking(false);
    stopWatcherRef.current?.();

    if (bill?.id) {
      void loadStoredSession(bill.id);
    }
  }, [bill?.id, loadStoredSession]);

  /** Check the database directly for the bill being paid. */
  const checkBillStatus = useCallback(async (): Promise<boolean> => {
    const billId = billIdRef.current;
    if (!billId) return false;

    const bills = await getMyBills();
    const current = bills.find((b) => b.id === billId);
    if (!current || current.status !== 'paid') return false;

    const payment = await getPaymentForBill(billId);
    setConfirmedPayment(payment);
    setStatusMessage('');
    setState('confirmed');
    try {
      await AsyncStorage.removeItem(sessionStorageKey(billId));
    } catch {
      // ignore
    }
    return true;
  }, []);

  /** Ask PayMongo (via edge function) whether this checkout is paid yet. */
  const reconcileWithPayMongo = useCallback(async (): Promise<{
    confirmed: boolean;
    error?: string;
    status?: string;
  }> => {
    const billId = billIdRef.current;
    let sessionId = checkoutSessionIdRef.current;
    if (!sessionId && billId) {
      sessionId = await loadStoredSession(billId);
    }
    if (!billId) {
      return { confirmed: false, error: 'Missing bill. Close and open Pay Online again.' };
    }

    // Session may be missing after Safari → deep-link remount; the edge
    // function can still resolve via bills.paymongo_checkout_session_id or
    // a PayMongo payments-list match on bill number.
    try {
      const result = await verifyPayMongoPayment(billId, sessionId);
      if (!result.confirmed) {
        return {
          confirmed: false,
          status: result.status,
          error:
            result.error ||
            (result.status === 'not_paid_yet'
              ? 'PayMongo has not confirmed this payment yet. If you already paid, wait a few seconds and try again.'
              : 'Payment could not be confirmed yet.'),
        };
      }
      const ok = await checkBillStatus();
      return {
        confirmed: ok,
        error: ok ? undefined : 'PayMongo confirmed payment, but the bill has not updated yet. Try again.',
      };
    } catch (err) {
      console.warn('[paymongo-flow] verify-paymongo-payment failed:', err);
      return {
        confirmed: false,
        error: friendlyErrorMessage(err, 'Could not reach the payment verifier. Check your connection.'),
      };
    }
  }, [checkBillStatus, loadStoredSession]);

  const startWatching = useCallback(() => {
    stopWatcherRef.current?.();

    const unsubscribe = subscribeToMyBills(() => {
      checkBillStatus().catch(() => {});
    });
    const pollTimer = setInterval(() => {
      checkBillStatus()
        .then(async (confirmed) => {
          if (confirmed) return true;
          const result = await reconcileWithPayMongo();
          return result.confirmed;
        })
        .catch(() => {});
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
  }, [checkBillStatus, reconcileWithPayMongo]);

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

  const openCheckout = useCallback(async (url: string) => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.open(url, '_blank');
      } else {
        await Linking.openURL(url);
      }
      return;
    }

    const httpsReturn = paymongoReturnBase();
    try {
      await WebBrowser.openAuthSessionAsync(url, httpsReturn);
    } catch {
      try {
        await WebBrowser.openBrowserAsync(url);
      } catch {
        await Linking.openURL(url);
      }
    }
  }, []);

  const start = useCallback(async () => {
    const billId = billIdRef.current;
    if (!billId || busyRef.current) return;
    busyRef.current = true;

    setErrorMessage('');
    setStatusMessage('');
    setConfirmedPayment(null);
    checkoutSessionIdRef.current = null;
    try {
      setState('creating');
      const appReturnUrl = appPaymentReturnUrl(billId);
      const session = await createCheckoutSession(billId, { appReturnUrl });
      await rememberSession(billId, session.checkoutSessionId);
      setCheckoutReference(session.referenceNumber);
      setState('opening');
      startVerification();
      await openCheckout(session.checkoutUrl);
      if (stateRef.current !== 'confirmed') {
        startVerification();
      }
      for (let attempt = 0; attempt < 8; attempt++) {
        const result = await reconcileWithPayMongo();
        if (result.confirmed) break;
        await new Promise((r) => setTimeout(r, 1500));
      }
    } catch (err) {
      console.warn('[paymongo-flow] checkout creation failed:', err);
      setErrorMessage(
        friendlyErrorMessage(err, 'Could not start the payment checkout. Please try again.')
      );
      setState('error');
    } finally {
      busyRef.current = false;
    }
  }, [openCheckout, reconcileWithPayMongo, rememberSession, startVerification]);

  /** Manual re-check from the verifying screen. Always shows feedback. */
  const checkAgain = useCallback(async () => {
    if (checking) return;
    if (stateRef.current === 'confirmed') return;

    // Ensure we are on the verifying UI even if state drifted.
    if (stateRef.current !== 'verifying') {
      setState('verifying');
      startWatching();
    }

    setChecking(true);
    setStatusMessage('Checking with PayMongo…');
    try {
      const alreadyPaid = await checkBillStatus();
      if (alreadyPaid) {
        setStatusMessage('Payment confirmed.');
        return;
      }

      const result = await reconcileWithPayMongo();
      if (result.confirmed) {
        setStatusMessage('Payment confirmed.');
        return;
      }
      setStatusMessage(result.error || 'Still unpaid. Try again in a few seconds.');
    } finally {
      setChecking(false);
    }
  }, [checkBillStatus, checking, reconcileWithPayMongo, startWatching]);

  const reset = useCallback(() => {
    setErrorMessage('');
    setStatusMessage('');
    setState('idle');
  }, []);

  return {
    state,
    errorMessage,
    statusMessage,
    checking,
    confirmedPayment,
    checkoutReference,
    start,
    checkAgain,
    reset,
  };
}
