import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

type SelectFieldProps = {
  label: string;
  value: string | null;
  options: string[];
  disabled?: boolean;
  /** Placeholder shown when the field is enabled but nothing is selected. */
  placeholder?: string;
  /** Placeholder shown when the field is disabled (e.g. no category chosen yet). */
  disabledPlaceholder?: string;
  onSelect: (value: string) => void;
};

function ChevronDown({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 9l6 6 6-6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CheckIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 6L9 17l-5-5"
        stroke="#1E5B8C"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SelectField({
  label,
  value,
  options,
  disabled = false,
  placeholder = 'Select an option',
  disabledPlaceholder = 'Select an option',
  onSelect,
}: SelectFieldProps) {
  const [open, setOpen] = useState(false);

  const handlePress = () => {
    if (!disabled) {
      setOpen(true);
    }
  };

  const handleSelect = (option: string) => {
    onSelect(option);
    setOpen(false);
  };

  return (
    <View>
      <Text className="mb-2 text-sm font-bold text-slate-700">{label}</Text>

      <Pressable
        onPress={handlePress}
        disabled={disabled}
        className={`flex-row items-center justify-between rounded-md border bg-white px-4 py-3.5 ${
          disabled ? 'border-[#E5E7EB] bg-slate-50' : 'border-[#D1D5DB] active:border-brand'
        }`}
        accessibilityRole="button"
        accessibilityState={{ disabled, expanded: open }}
        accessibilityLabel={label}
        accessibilityValue={{ text: value ?? (disabled ? disabledPlaceholder : placeholder) }}
      >
        <Text
          className={`text-[15px] ${
            value ? 'text-[#1E3A5F]' : disabled ? 'text-[#9CA3AF]' : 'text-[#9CA3AF]'
          }`}
          numberOfLines={1}
        >
          {value ?? (disabled ? disabledPlaceholder : placeholder)}
        </Text>
        <ChevronDown color={disabled ? '#9CA3AF' : '#6B7280'} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/40"
          onPress={() => setOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Close subject options"
        >
          <Pressable onPress={(event) => event.stopPropagation()}>
            <View className="mx-4 mb-6 overflow-hidden rounded-2xl bg-white">
              <View className="border-b border-slate-100 px-5 py-4">
                <Text className="text-base font-bold text-slate-800">{placeholder}</Text>
              </View>
              <ScrollView bounces={false} style={{ maxHeight: 320 }} keyboardShouldPersistTaps="handled">
                {options.map((option) => {
                  const selected = option === value;
                  return (
                    <Pressable
                      key={option}
                      onPress={() => handleSelect(option)}
                      className={`flex-row items-center justify-between px-5 py-4 ${
                        selected ? 'bg-brand/5' : 'active:bg-slate-50'
                      }`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <Text
                        className={`text-[15px] ${
                          selected ? 'font-semibold text-brand' : 'text-slate-700'
                        }`}
                      >
                        {option}
                      </Text>
                      {selected ? <CheckIcon /> : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
