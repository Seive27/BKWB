import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { SelectField } from '@/components/tickets/SelectField';
import {
  TICKET_CATEGORY_LABELS,
  TICKET_SUBJECTS,
  type TicketCategory,
  type TicketDraft,
  type TicketPriority,
} from '@/types/tickets';

const CATEGORIES: TicketCategory[] = [
  'water',
  'billing',
  'meter',
  'account',
  'plumbing',
  'other',
];

const PRIORITIES: { value: TicketPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

type TicketFormProps = {
  onSubmit?: (draft: TicketDraft) => void;
};

function FieldLabel({ children }: { children: string }) {
  return <Text className="mb-2 text-sm font-bold text-slate-700">{children}</Text>;
}

function Chip({
  selected,
  onPress,
  children,
}: {
  selected: boolean;
  onPress: () => void;
  children: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full px-4 py-2 ${selected ? 'bg-brand' : 'bg-slate-200'}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text className={`text-sm font-semibold ${selected ? 'text-white' : 'text-slate-700'}`}>
        {children}
      </Text>
    </Pressable>
  );
}

export function TicketForm({ onSubmit }: TicketFormProps) {
  const [category, setCategory] = useState<TicketCategory | null>(null);
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [subject, setSubject] = useState<string | null>(null);
  const [description, setDescription] = useState('');

  const canSubmit =
    category !== null && subject !== null && subject.trim().length > 0 && description.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit || category === null || subject === null) {
      return;
    }
    onSubmit?.({
      subject: subject.trim(),
      category,
      priority,
      description: description.trim(),
    });
  };

  const handleCategoryChange = (item: TicketCategory) => {
    setCategory(item);
    // A category change invalidates the previously selected subject.
    setSubject(null);
  };

  return (
    <View className="gap-5">
      <View
        className="rounded-2xl bg-white p-5"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <View className="mb-4">
          <FieldLabel>Category</FieldLabel>
          <View className="flex-row flex-wrap gap-2">
            {CATEGORIES.map((item) => (
              <Chip key={item} selected={category === item} onPress={() => handleCategoryChange(item)}>
                {TICKET_CATEGORY_LABELS[item]}
              </Chip>
            ))}
          </View>
        </View>

        <View className="mb-4">
          <SelectField
            label="Subject"
            value={subject}
            options={category ? TICKET_SUBJECTS[category] : []}
            disabled={category === null}
            placeholder="Select a subject"
            disabledPlaceholder="Please select a category first"
            onSelect={setSubject}
          />
        </View>

        <View className="mb-4">
          <FieldLabel>Details</FieldLabel>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the issue or request in detail..."
            placeholderTextColor="#9CA3AF"
            className="rounded-md border border-[#D1D5DB] bg-white px-4 py-3.5 text-[15px] text-[#1E3A5F]"
            multiline
            numberOfLines={5}
            style={{ minHeight: 110, textAlignVertical: 'top' }}
            maxLength={500}
          />
        </View>

        <View>
          <FieldLabel>Priority</FieldLabel>
          <View className="flex-row flex-wrap gap-2">
            {PRIORITIES.map((item) => (
              <Chip key={item.value} selected={priority === item.value} onPress={() => setPriority(item.value)}>
                {item.label}
              </Chip>
            ))}
          </View>
        </View>
      </View>

      <Pressable
        onPress={handleSubmit}
        disabled={!canSubmit}
        className={`items-center rounded-xl py-3.5 ${
          canSubmit ? 'bg-brand active:bg-brand-dark' : 'bg-slate-300'
        }`}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSubmit }}
      >
        <Text className="text-base font-semibold text-white">Submit Ticket</Text>
      </Pressable>
    </View>
  );
}
