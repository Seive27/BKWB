import { Text, View } from 'react-native';

import { DetailModal } from '@/components/ui/DetailModal';
import {
  ANNOUNCEMENT_CATEGORY_LABELS,
  type AnnouncementCategory,
} from '@/types/announcements';

const CATEGORY_ACCENTS: Record<AnnouncementCategory, string> = {
  schedule: '#1E5B8C',
  interruption: '#EF4444',
  maintenance: '#F59E0B',
  billing: '#8B5CF6',
  general: '#64748B',
  emergency: '#DC2626',
};

function formatFullDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Full announcement view opened by tapping a card anywhere in the app,
 * matching the residents-side interaction so long posts never expand inline.
 */
export function AnnouncementDetailModal({
  visible,
  onClose,
  title,
  category,
  date,
  content,
  createdBy,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  category: AnnouncementCategory;
  date: string;
  content: string;
  createdBy?: string | null;
}) {
  return (
    <DetailModal
      visible={visible}
      onClose={onClose}
      badge={
        <View
          className="self-start rounded-full px-2.5 py-1"
          style={{ backgroundColor: `${CATEGORY_ACCENTS[category]}22` }}
        >
          <Text
            className="text-xs font-bold uppercase"
            style={{ color: CATEGORY_ACCENTS[category] }}
          >
            {ANNOUNCEMENT_CATEGORY_LABELS[category]}
          </Text>
        </View>
      }
      title={title}
      subtitle={formatFullDate(date)}
    >
      <Text className="pb-2 text-[15px] leading-6 text-navy-soft">{content}</Text>
      {createdBy ? (
        <Text className="pb-4 text-xs text-navy-muted">Posted by {createdBy}</Text>
      ) : null}
    </DetailModal>
  );
}
