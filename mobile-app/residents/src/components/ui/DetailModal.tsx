import { ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import { useSwipeableBottomSheet } from '@/hooks/useSwipeableBottomSheet';

/**
 * Shared expandable-detail modal used by announcements, water schedule
 * entries and bills. Keeps long-form content off the main feed: tapping a
 * list item opens this modal instead of scrolling the page.
 *
 * Drag the handle/header down to dismiss (same as meter-reader Start Reading).
 */
export function DetailModal({
  visible,
  onClose,
  badge,
  title,
  subtitle,
  children,
  secondaryAction,
}: {
  visible: boolean;
  onClose: () => void;
  /** Optional small pill rendered above the title (e.g. category). */
  badge?: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Optional action above Close (e.g. Download PDF). */
  secondaryAction?: {
    label: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
  };
}) {
  const { height: windowHeight } = useWindowDimensions();
  const sheetHeight = Math.round(windowHeight * 0.88);
  // Leave room for handle, title block, and action buttons within the 88% sheet.
  const footerReserve = secondaryAction ? 340 : 260;
  const scrollMaxHeight = sheetHeight - footerReserve;

  const { panGesture, sheetStyle, animateClosed } = useSwipeableBottomSheet({
    visible,
    onClose,
    sheetHeight,
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={animateClosed}
    >
      <GestureHandlerRootView style={styles.root}>
        <Pressable
          className="absolute inset-0 bg-black/50"
          onPress={animateClosed}
          accessibilityRole="button"
          accessibilityLabel="Close details"
        />

        <Animated.View
          style={[styles.sheet, sheetStyle, { maxHeight: sheetHeight }]}
        >
          <GestureDetector gesture={panGesture}>
            <Animated.View accessibilityLabel="Drag down to close">
              <View className="items-center pt-3">
                <View className="h-1.5 w-12 rounded-full bg-slate-200" />
              </View>

              <View className="px-5 pb-2 pt-3">
                {badge}
                <Text className="mt-2 text-xl font-bold leading-7 text-slate-800">{title}</Text>
                {subtitle ? (
                  <Text className="mt-1 text-sm text-slate-400">{subtitle}</Text>
                ) : null}
              </View>
            </Animated.View>
          </GestureDetector>

          <ScrollView
            className="px-5"
            style={{ maxHeight: Math.max(160, scrollMaxHeight) }}
            contentContainerStyle={{ paddingBottom: 8 }}
            showsVerticalScrollIndicator
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            bounces
          >
            {children}
          </ScrollView>

          <View className="gap-2.5 px-5 pb-6 pt-4">
            {secondaryAction ? (
              <Pressable
                onPress={secondaryAction.onPress}
                disabled={secondaryAction.disabled || secondaryAction.loading}
                className="items-center rounded-xl border-2 border-brand bg-white py-3.5 active:bg-slate-50 disabled:opacity-50"
                accessibilityRole="button"
                accessibilityLabel={secondaryAction.label}
              >
                <Text className="text-base font-semibold text-brand">
                  {secondaryAction.loading ? 'Preparing PDF…' : secondaryAction.label}
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={animateClosed}
              className="items-center rounded-xl bg-brand py-3.5 active:bg-brand-dark"
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text className="text-base font-semibold text-white">Close</Text>
            </Pressable>
          </View>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#FFFFFF',
  },
});
