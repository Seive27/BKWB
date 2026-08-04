import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BillingHistory } from '@/components/bills/BillingHistory';
import { CurrentBill } from '@/components/bills/CurrentBill';
import { ChatBotFab } from '@/components/ui/ChatBotFab';
import { Navbar, type NavTab } from '@/components/ui/Navbar';

type BillsProps = {
  activeTab?: NavTab;
  onTabPress?: (tab: NavTab) => void;
  onOpenChatBot?: () => void;
};

type BillsSection = 'current' | 'history';

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

export default function Bills({
  activeTab = 'bills',
  onTabPress,
  onOpenChatBot,
}: BillsProps) {
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

      <ChatBotFab onPress={onOpenChatBot} />
      <Navbar activeTab={activeTab} onTabPress={onTabPress} />
    </View>
  );
}
