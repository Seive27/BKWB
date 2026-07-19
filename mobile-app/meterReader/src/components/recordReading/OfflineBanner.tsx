import { Text, View } from 'react-native';

type OfflineBannerProps = {
  lastSynced?: string;
  message?: string;
};

export function OfflineBanner({
  lastSynced = '2 mins ago',
  message = 'You are offline. Readings will be saved locally and synced when connection is restored.',
}: OfflineBannerProps) {
  return (
    <View className="mb-4 rounded-2xl bg-alert-soft px-4 py-3.5">
      <View className="mb-1.5 flex-row items-center gap-2">
        <Text className="text-base text-alert">📵</Text>
        <Text className="text-[15px] font-bold text-alert">Not Synced</Text>
      </View>
      <Text className="mb-2 text-[13px] leading-5 text-alert-muted">{message}</Text>
      <Text className="text-xs text-alert-muted">Last synced: {lastSynced}</Text>
    </View>
  );
}
