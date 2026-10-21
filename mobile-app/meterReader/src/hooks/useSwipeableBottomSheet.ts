import { useCallback, useLayoutEffect } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const DISMISS_DISTANCE = 100;
const DISMISS_VELOCITY = 800;
const CLOSE_DURATION_MS = 260;

/**
 * Swipe-down-to-dismiss for modal bottom sheets (same feel as Start Reading /
 * View Consumers). Attach `panGesture` to the handle/header so ScrollView
 * content still scrolls normally.
 */
export function useSwipeableBottomSheet({
  visible,
  onClose,
  sheetHeight,
}: {
  visible: boolean;
  onClose: () => void;
  /** Off-screen translate distance when the sheet is fully dismissed. */
  sheetHeight: number;
}) {
  const translateY = useSharedValue(sheetHeight);
  const dragStartY = useSharedValue(0);

  const finishClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const animateClosed = useCallback(() => {
    translateY.value = withTiming(
      sheetHeight,
      {
        duration: CLOSE_DURATION_MS,
        easing: Easing.out(Easing.cubic),
      },
      (finished) => {
        if (finished) {
          runOnJS(finishClose)();
        }
      },
    );
  }, [finishClose, sheetHeight, translateY]);

  useLayoutEffect(() => {
    if (visible) {
      translateY.value = sheetHeight;
      translateY.value = withTiming(0, {
        duration: CLOSE_DURATION_MS,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      translateY.value = sheetHeight;
    }
  }, [visible, sheetHeight, translateY]);

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      dragStartY.value = translateY.value;
    })
    .onUpdate((event) => {
      const next = dragStartY.value + event.translationY;
      translateY.value = Math.max(0, next);
    })
    .onEnd((event) => {
      const shouldDismiss =
        translateY.value > DISMISS_DISTANCE || event.velocityY > DISMISS_VELOCITY;

      if (shouldDismiss) {
        translateY.value = withTiming(
          sheetHeight,
          {
            duration: CLOSE_DURATION_MS,
            easing: Easing.out(Easing.cubic),
          },
          (finished) => {
            if (finished) {
              runOnJS(finishClose)();
            }
          },
        );
        return;
      }

      translateY.value = withSpring(0, {
        damping: 28,
        stiffness: 320,
        mass: 0.85,
        overshootClamping: true,
      });
    });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [0, sheetHeight],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return {
    panGesture,
    backdropStyle,
    sheetStyle,
    animateClosed,
  };
}
