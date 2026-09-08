import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { SelectField } from '@/components/tickets/SelectField';
import {
  TICKET_CATEGORY_LABELS,
  TICKET_SUBJECTS,
  type TicketCategory,
  type TicketDraft,
} from '@/types/tickets';

const CATEGORIES: TicketCategory[] = [
  'water_supply',
  'billing',
  'plumbing',
  'water_quality',
  'meter_concern',
  'other',
];

type TicketFormProps = {
  onSubmit?: (draft: TicketDraft) => void;
  /** Disables the submit button while a submission is in flight. */
  submitting?: boolean;
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

export function TicketForm({ onSubmit, submitting = false }: TicketFormProps) {
  const [category, setCategory] = useState<TicketCategory | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [description, setDescription] = useState('');

  const canSubmit =
    !submitting &&
    category !== null &&
    subject !== null &&
    subject.trim().length > 0 &&
    description.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit || category === null || subject === null) {
      return;
    }
    onSubmit?.({
      subject: subject.trim(),
      category,
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

        <View>
          <FieldLabel>Details</FieldLabel>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the issue or request in detail..."
            placeholderTextColor="#94A3B8"
            className="rounded-md border border-[#CBD5E1] bg-white px-4 py-3.5 text-[15px] text-slate-800"
            multiline
            numberOfLines={5}
            style={{ minHeight: 110, textAlignVertical: 'top' }}
            maxLength={500}
          />
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
        <Text className="text-base font-semibold text-white">
          {submitting ? 'Submitting…' : 'Submit Ticket'}
        </Text>
      </Pressable>
    </View>
  );
}
