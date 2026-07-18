import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { BillingHistory } from '@/components/bills/BillingHistory';
import { CurrentBill } from '@/components/bills/CurrentBill';
import { Navbar, type NavTab } from '@/components/ui/Navbar';

type BillsProps = {
  activeTab?: NavTab;
  onTabPress?: (tab: NavTab) => void;
};

type BillsSection = 'current' | 'history';

function EditFab({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="absolute bottom-24 right-5 z-10 h-12 w-12 items-center justify-center rounded-xl bg-brand shadow-md"
      style={{
        shadowColor: '#1E5B8C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
      }}
      accessibilityLabel="Edit"
    >
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path
          d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 000-1.42l-2.34-2.34a1.003 1.003 0 00-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"
          fill="#FFFFFF"
        />
      </Svg>
    </Pressable>
  );
}

function BillsSectionTabs({
  activeSection,
  onSectionChange,
}: {
  activeSection: BillsSection;
  onSectionChange: (section: BillsSection) => void;
}) {
  return (
    <View className="flex-row border-b border-slate-200 bg-white">
      <Pressable
        onPress={() => onSectionChange('current')}
        className="flex-1 items-center py-3.5"
        accessibilityRole="tab"
        accessibilityState={{ selected: activeSection === 'current' }}
      >
        <Text
          className={`text-base ${
            activeSection === 'current' ? 'font-semibold text-brand' : 'font-medium text-slate-400'
          }`}
        >
          Current Bill
        </Text>
        {activeSection === 'current' ? (
          <View className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />
        ) : null}
      </Pressable>

      <Pressable
        onPress={() => onSectionChange('history')}
        className="flex-1 items-center py-3.5"
        accessibilityRole="tab"
        accessibilityState={{ selected: activeSection === 'history' }}
      >
        <Text
          className={`text-base ${
            activeSection === 'history' ? 'font-semibold text-brand' : 'font-medium text-slate-400'
          }`}
        >
          Billing History
        </Text>
        {activeSection === 'history' ? (
          <View className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />
        ) : null}
      </Pressable>
    </View>
  );
}

export default function Bills({ activeTab = 'bills', onTabPress }: BillsProps) {
  const insets = useSafeAreaInsets();
  const navbarHeight = 64 + Math.max(insets.bottom, 8);
  const [activeSection, setActiveSection] = useState<BillsSection>('current');

  return (
    <View className="flex-1 bg-slate-50">
      <View className="bg-brand px-5 pb-6" style={{ paddingTop: insets.top + 16 }}>
        <Text className="text-2xl font-bold text-white">Water Bills</Text>
        <Text className="mt-1 text-base text-white/80">Billing statements and payment history</Text>
      </View>

      <BillsSectionTabs activeSection={activeSection} onSectionChange={setActiveSection} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: navbarHeight + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-4 pt-5">
          {activeSection === 'current' ? <CurrentBill /> : <BillingHistory />}
        </View>
      </ScrollView>

      <EditFab />
      <Navbar activeTab={activeTab} onTabPress={onTabPress} />
    </View>
  );
}
