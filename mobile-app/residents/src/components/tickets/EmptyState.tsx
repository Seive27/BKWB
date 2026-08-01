import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

type EmptyStateProps = {
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

function TicketsIllustration() {
  return (
    <View className="h-36 w-36 items-center justify-center rounded-full bg-blue-50">
      <Svg width={88} height={88} viewBox="0 0 88 88" fill="none">
        {/* Ticket body */}
        <Path
          d="M18 34h52a4 4 0 014 4v6a8 8 0 000 14v6a4 4 0 01-4 4H18a4 4 0 01-4-4v-6a8 8 0 000-14v-6a4 4 0 014-4z"
          fill="#FFFFFF"
          stroke="#BFDBFE"
          strokeWidth={2.5}
        />
        {/* Perforation dots */}
        <Circle cx={28} cy={44} r={1.5} fill="#BFDBFE" />
        <Circle cx={28} cy={50} r={1.5} fill="#BFDBFE" />
        <Circle cx={60} cy={44} r={1.5} fill="#BFDBFE" />
        <Circle cx={60} cy={50} r={1.5} fill="#BFDBFE" />
        {/* Center badge */}
        <Circle cx={44} cy={47} r={13} fill="#1E5B8C" />
        <Path
          d="M37.5 47l4.5 4.5 8.5-9.5"
          stroke="#FFFFFF"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Sparkles */}
        <Path d="M68 22l1.2 3 3 1.2-3 1.2-1.2 3-1.2-3-3-1.2 3-1.2 1.2-3z" fill="#93C5FD" />
        <Path d="M20 20l0.9 2.3 2.3 0.9-2.3 0.9L20 26.4l-0.9-2.3-2.3-0.9 2.3-0.9L20 20z" fill="#BFDBFE" />
      </Svg>
    </View>
  );
}

export function EmptyState({
  title = 'No Tickets Yet',
  message = "You haven't submitted any service requests.",
  actionLabel = 'Create Your First Ticket',
  onAction,
}: EmptyStateProps) {
  return (
    <View className="items-center px-6 py-14">
      <TicketsIllustration />
      <Text className="mt-6 text-xl font-bold text-slate-800">{title}</Text>
      <Text className="mt-2 max-w-[260px] text-center text-sm leading-5 text-slate-500">
        {message}
      </Text>
      {onAction ? (
        <Pressable
          onPress={onAction}
          className="mt-6 items-center rounded-xl bg-brand px-8 py-3.5 active:bg-brand-dark"
          accessibilityRole="button"
        >
          <Text className="text-base font-semibold text-white">{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
