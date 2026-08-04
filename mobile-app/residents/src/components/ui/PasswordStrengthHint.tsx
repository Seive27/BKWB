import { Text, View } from 'react-native';

import {
  getPasswordChecks,
  getPasswordStrength,
  PASSWORD_REQUIREMENTS,
} from '@/lib/password';

type PasswordStrengthHintProps = {
  password: string;
};

const hintShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.1,
  shadowRadius: 12,
  elevation: 4,
};

export function PasswordStrengthHint({ password }: PasswordStrengthHintProps) {
  if (!password) return null;

  const checks = getPasswordChecks(password);
  const strength = getPasswordStrength(checks);

  return (
    <View className="mt-2">
      <View
        className="ml-4 h-2.5 w-2.5 rotate-45 border-l border-t border-slate-200 bg-white"
        style={{ marginBottom: -5, zIndex: 1 }}
      />
      <View className="rounded-xl border border-slate-200 bg-white px-3.5 py-3" style={hintShadow}>
        <View className="mb-3 flex-row items-center gap-2">
          <View className="flex-1 flex-row gap-1">
            {Array.from({ length: 5 }).map((_, index) => (
              <View
                key={index}
                className="h-1.5 flex-1 rounded-full"
                style={{
                  backgroundColor: index < strength.score ? strength.color : '#E5E7EB',
                }}
              />
            ))}
          </View>
          <Text className="text-xs text-slate-500">{strength.label}</Text>
        </View>

        <View className="gap-2">
          {PASSWORD_REQUIREMENTS.map((rule) => {
            const met = checks[rule.key];
            return (
              <View key={rule.key} className="flex-row items-center gap-2">
                <View
                  className="h-4 w-4 items-center justify-center rounded-full"
                  style={{ backgroundColor: met ? '#22C55E' : '#9CA3AF' }}
                >
                  <Text className="text-[9px] font-bold text-white">✓</Text>
                </View>
                <Text className={`text-xs ${met ? 'text-green-500' : 'text-slate-500'}`}>
                  {rule.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}
