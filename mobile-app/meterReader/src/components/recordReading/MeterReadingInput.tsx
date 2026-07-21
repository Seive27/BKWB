import { Text, TextInput, View } from 'react-native';

type MeterReadingInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  error?: string | null;
  unit?: string;
};

export function MeterReadingInput({
  value,
  onChangeText,
  error,
  unit = 'm³',
}: MeterReadingInputProps) {
  const hasError = Boolean(error);

  return (
    <View className="mb-4">
      <Text className="mb-2 text-[15px] font-bold text-navy">Current Meter Reading</Text>
      <View
        className={`flex-row items-center rounded-2xl bg-surface px-4 py-3 ${
          hasError ? 'border border-alert' : 'border border-transparent'
        }`}
      >
        {hasError ? (
          <View className="mr-2 h-6 w-6 items-center justify-center rounded-full bg-alert">
            <Text className="text-xs font-bold text-white">!</Text>
          </View>
        ) : (
          <View className="mr-2 w-6" />
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="numeric"
          className="flex-1 text-center text-[28px] font-bold text-navy"
          placeholder="0"
          placeholderTextColor="#8FA3B5"
        />
        <Text className="ml-2 text-base font-semibold text-navy-muted">{unit}</Text>
      </View>
      {hasError ? (
        <View className="mt-2 flex-row items-start gap-1.5">
          <Text className="mt-0.5 text-xs text-alert">ⓘ</Text>
          <Text className="flex-1 text-[13px] leading-5 text-alert">{error}</Text>
        </View>
      ) : null}
    </View>
  );
}
