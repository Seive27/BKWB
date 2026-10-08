import { Image } from 'expo-image';
import { View } from 'react-native';

import { useEffect, useState } from 'react';
import { getPendingReadings } from '@/services/offlineSyncService';

type CloudStatusIconProps = {
  variant?: 'synced' | 'issue' | 'pending';
  size?: number;
};

export function CloudStatusIcon({
  variant: propVariant,
  size = 26,
}: CloudStatusIconProps) {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let active = true;
    const checkPending = async () => {
      try {
        const pending = await getPendingReadings();
        if (active) setPendingCount(pending.length);
      } catch (e) {
        // ignore
      }
    };
    checkPending();
    const interval = setInterval(checkPending, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const effectiveVariant = pendingCount > 0 ? 'pending' : (propVariant || 'synced');

  let source;
  if (effectiveVariant === 'issue') {
    source = require('../../../assets/icons/synch-alert.png');
  } else if (effectiveVariant === 'pending') {
    source = require('../../../assets/icons/synch.png');
  } else {
    source = require('../../../assets/icons/cloud-check.png');
  }

  return (
    <View className="items-center justify-center" style={{ width: size, height: size }}>
      <Image source={source} style={{ width: size, height: size }} contentFit="contain" />
    </View>
  );
}
