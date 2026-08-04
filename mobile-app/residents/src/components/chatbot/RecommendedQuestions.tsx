import { Pressable, ScrollView, Text, View } from 'react-native';

import type { FaqItem } from '@/types/chatbot';

type RecommendedQuestionsProps = {
  items: FaqItem[];
  onSelect: (item: FaqItem) => void;
};

export function RecommendedQuestions({ items, onSelect }: RecommendedQuestionsProps) {
  return (
    <View className="py-3">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
      >
        {items.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => onSelect(item)}
            className="rounded-xl bg-brand-light px-4 py-2.5 active:bg-brand"
            accessibilityRole="button"
            accessibilityLabel={item.question}
          >
            <Text className="text-sm font-semibold text-white">{item.question}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
