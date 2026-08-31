import { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

/**
 * Shared expandable-detail modal used by announcements.
 * Keeps long-form content off the main feed: tapping a list item opens
 * this modal instead of expanding inline.
 */
export function DetailModal({
  visible,
  onClose,
  badge,
  title,
  subtitle,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  /** Optional small pill rendered above the title (e.g. category). */
  badge?: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        className="flex-1 justify-end bg-black/50"
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close details"
      >
        <Pressable
          className="max-h-[88%] rounded-t-3xl bg-white"
          onPress={(e) => e.stopPropagation()}
          accessibilityLiveRegion="polite"
        >
          <View className="items-center pt-3">
            <View className="h-1.5 w-12 rounded-full bg-slate-200" />
          </View>

          <View className="px-5 pb-2 pt-3">
            {badge}
            <Text className="mt-2 text-xl font-bold leading-7 text-navy">{title}</Text>
            {subtitle ? (
              <Text className="mt-1 text-sm text-navy-muted">{subtitle}</Text>
            ) : null}
          </View>

          <ScrollView
            className="px-5"
            style={{ maxHeight: 520 }}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>

          <View className="px-5 pb-6 pt-4">
            <Pressable
              onPress={onClose}
              className="items-center rounded-xl bg-brand py-3.5 active:bg-brand-dark"
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text className="text-base font-semibold text-white">Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
