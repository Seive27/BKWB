import { Text, TextInput, View } from 'react-native';

type NotesInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
};

export function NotesInput({
  value,
  onChangeText,
  placeholder = 'Add any observations (e.g., meter damage, leak spotted)...',
}: NotesInputProps) {
  return (
    <View>
      <Text className="mb-2 text-[13px] font-medium text-navy-muted">Optional Notes</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8FA3B5"
        multiline
        textAlignVertical="top"
        className="min-h-[96px] rounded-2xl bg-surface px-4 py-3 text-[14px] leading-5 text-navy"
      />
    </View>
  );
}
