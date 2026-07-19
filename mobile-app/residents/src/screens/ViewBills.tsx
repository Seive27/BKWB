import { useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BillFilterTabs, type BillFilter } from '@/components/bills/BillFilterTabs';
import { ViewBills as ViewBillsList } from '@/components/bills/ViewBills';
import { Navbar, type NavTab } from '@/components/ui/Navbar';

type ViewBillsScreenProps = {
  activeTab?: NavTab;
  onTabPress?: (tab: NavTab) => void;
  onBack?: () => void;
};

function BackButton({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="-ml-1 h-10 w-10 items-center justify-center active:opacity-70"
      accessibilityLabel="Go back"
      accessibilityRole="button"
    >
      <Image
        source={require('../../assets/Arrow/BackArrow.png')}
        style={{ width: 19, height: 19 }}
        contentFit="contain"
      />
    </Pressable>
  );
}

export default function ViewBillsScreen({
  activeTab = 'dashboard',
  onTabPress,
  onBack,
}: ViewBillsScreenProps) {
  const insets = useSafeAreaInsets();
  const navbarHeight = 64 + Math.max(insets.bottom, 8);
  const [activeFilter, setActiveFilter] = useState<BillFilter>('all');

  const headerTitle =
    activeFilter === 'paid' ? 'Paid' : activeFilter === 'unpaid' ? 'Unpaid' : 'All Payments';

  return (
    <View className="flex-1 bg-slate-50">
      <View className="bg-brand px-5 pb-6" style={{ paddingTop: insets.top + 12 }}>
        <View className="flex-row items-center gap-2">
          <BackButton onPress={onBack} />
          <View className="flex-1">
            <Text className="text-2xl font-bold text-white">{headerTitle}</Text>
            <Text className="mt-1 text-base text-white/80">Manage and pay your water bills</Text>
          </View>
        </View>
      </View>

      <BillFilterTabs activeFilter={activeFilter} onFilterChange={setActiveFilter} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: navbarHeight + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-4 pt-1">
          <ViewBillsList filter={activeFilter} />
        </View>
      </ScrollView>

      <Navbar activeTab={activeTab} onTabPress={onTabPress} />
    </View>
  );
}
