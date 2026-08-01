import { useEffect, useRef } from 'react';
import { Animated, View, type DimensionValue } from 'react-native';

function SkeletonBlock({
  className,
  style,
}: {
  className?: string;
  style?: { width?: DimensionValue; height?: number; borderRadius?: number };
}) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View className={`bg-slate-200 ${className ?? ''}`} style={{ opacity, ...style }} />;
}

/** Skeleton card used while the ticket list is loading. */
export function SkeletonTicketCard() {
  return (
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
      <View className="flex-row items-center justify-between">
        <SkeletonBlock className="rounded" style={{ width: 110, height: 12 }} />
        <SkeletonBlock className="rounded" style={{ width: 70, height: 12 }} />
      </View>
      <SkeletonBlock className="mt-4 rounded" style={{ width: '75%', height: 18 }} />
      <SkeletonBlock className="mt-2 rounded" style={{ width: '100%', height: 14 }} />
      <SkeletonBlock className="mt-2 rounded" style={{ width: '55%', height: 14 }} />
      <View className="mt-4 flex-row items-center gap-2">
        <SkeletonBlock className="rounded-full" style={{ width: 74, height: 26 }} />
        <SkeletonBlock className="rounded-full" style={{ width: 74, height: 26 }} />
      </View>
    </View>
  );
}

/** Skeleton placeholder for the ticket list screen. */
export function SkeletonTicketList() {
  return (
    <View className="gap-4">
      <SkeletonTicketCard />
      <SkeletonTicketCard />
      <SkeletonTicketCard />
    </View>
  );
}

/** Skeleton placeholder for the ticket details screen. */
export function SkeletonTicketDetails() {
  return (
    <View className="gap-4">
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
        <View className="flex-row items-center gap-2">
          <SkeletonBlock className="rounded-full" style={{ width: 74, height: 26 }} />
          <SkeletonBlock className="rounded-full" style={{ width: 74, height: 26 }} />
        </View>
        <SkeletonBlock className="mt-4 rounded" style={{ width: '85%', height: 20 }} />
        <SkeletonBlock className="mt-3 rounded" style={{ width: '100%', height: 14 }} />
        <SkeletonBlock className="mt-2 rounded" style={{ width: '92%', height: 14 }} />
        <SkeletonBlock className="mt-2 rounded" style={{ width: '60%', height: 14 }} />
      </View>

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
        <SkeletonBlock className="rounded" style={{ width: 140, height: 16 }} />
        <View className="mt-5 flex-row">
          <SkeletonBlock className="rounded-full" style={{ width: 24, height: 24 }} />
          <View className="ml-3 flex-1">
            <SkeletonBlock className="rounded" style={{ width: '50%', height: 14 }} />
            <SkeletonBlock className="mt-2 rounded" style={{ width: '70%', height: 12 }} />
          </View>
        </View>
        <View className="mt-6 flex-row">
          <SkeletonBlock className="rounded-full" style={{ width: 24, height: 24 }} />
          <View className="ml-3 flex-1">
            <SkeletonBlock className="rounded" style={{ width: '45%', height: 14 }} />
            <SkeletonBlock className="mt-2 rounded" style={{ width: '80%', height: 12 }} />
          </View>
        </View>
      </View>
    </View>
  );
}
