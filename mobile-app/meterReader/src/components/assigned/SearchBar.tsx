import { Image } from 'expo-image';
import { TextInput, View } from 'react-native';

type SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
};

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search residents, accounts...',
}: SearchBarProps) {
  return (
    <View className="mb-4 flex-row items-center rounded-2xl border border-slate-200 bg-white px-3">
      <Image
        source={require('../../../assets/icons/search.png')}
        style={{ width: 18, height: 18, marginRight: 1, tintColor: '#8FA3B5' }}
        contentFit="contain"
      />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8FA3B5"
        className="flex-1 text-[15px] text-navy"
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
    </View>
  );
}
