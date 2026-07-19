import { Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

type ScheduleStatus = 'available' | 'interruption-pink' | 'interruption-amber';

type DaySchedule = {
  id: string;
  day: string;
  time: string;
  location: string;
  status: ScheduleStatus;
};

const WEEKDAY_SCHEDULE: DaySchedule[] = [
  {
    id: 'mon',
    day: 'Monday',
    time: 'Full Day',
    location: 'Zone 1 & Zone 2',
    status: 'interruption-pink',
  },
  {
    id: 'tue',
    day: 'Tuesday',
    time: '8:00 AM - 12:00 PM',
    location: 'All Zones',
    status: 'available',
  },
  {
    id: 'wed',
    day: 'Wednesday',
    time: 'Full Day',
    location: 'All Zones',
    status: 'available',
  },
  {
    id: 'thu',
    day: 'Thursday',
    time: '8:00 AM - 12:00 PM',
    location: 'Upper Kalunasan (Zone 4)',
    status: 'interruption-amber',
  },
  {
    id: 'fri',
    day: 'Friday',
    time: 'Full Day',
    location: 'All Zones',
    status: 'available',
  },
];

function LocationIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21s7-5.33 7-11a7 7 0 10-14 0c0 5.67 7 11 7 11z"
        stroke="#94A3B8"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={10} r={2.5} stroke="#94A3B8" strokeWidth={1.8} />
    </Svg>
  );
}

function AvailableIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke="#1E5B8C" strokeWidth={1.8} />
      <Path
        d="M8 12.5l2.5 2.5L16 9.5"
        stroke="#1E5B8C"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function InterruptionWaveIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 12c1.5-2 3-3 4.5-3s3 1 4.5 3 3 3 4.5 3 3-1 4.5-3"
        stroke="#DC2626"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M3 17c1.5-2 3-3 4.5-3s3 1 4.5 3 3 3 4.5 3 3-1 4.5-3"
        stroke="#DC2626"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function InterruptionWarningIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 4L3 20h18L12 4z"
        stroke="#B45309"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path d="M12 10v5" stroke="#B45309" strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx={12} cy={17.5} r={1} fill="#B45309" />
    </Svg>
  );
}

function StatusBadge({ status }: { status: ScheduleStatus }) {
  if (status === 'available') {
    return (
      <View className="flex-row items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1">
        <AvailableIcon />
        <Text className="text-xs font-semibold text-brand">Available</Text>
      </View>
    );
  }

  if (status === 'interruption-pink') {
    return (
      <View className="flex-row items-center gap-1 rounded-full bg-red-100 px-2.5 py-1">
        <InterruptionWaveIcon />
        <Text className="text-xs font-semibold text-red-600">Interruption</Text>
      </View>
    );
  }

  return (
    <View className="flex-row items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1">
      <InterruptionWarningIcon />
      <Text className="text-xs font-semibold text-amber-700">Interruption</Text>
    </View>
  );
}

function accentColor(status: ScheduleStatus) {
  if (status === 'interruption-pink') return 'bg-red-400';
  if (status === 'interruption-amber') return 'bg-amber-500';
  return 'bg-brand';
}

function DayScheduleCard({ schedule }: { schedule: DaySchedule }) {
  return (
    <View
      className="overflow-hidden rounded-2xl bg-white"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <View className="flex-row">
        <View className={`w-1.5 ${accentColor(schedule.status)}`} />
        <View className="flex-1 px-4 py-4">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="text-lg font-bold text-brand">{schedule.day}</Text>
              <Text className="mt-1 text-sm text-slate-500">{schedule.time}</Text>
            </View>
            <StatusBadge status={schedule.status} />
          </View>

          <View className="mt-3 flex-row items-center gap-1.5">
            <LocationIcon />
            <Text className="text-sm text-slate-400">{schedule.location}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function HouseWatermark() {
  return (
    <View className="absolute bottom-0 right-0 opacity-20" pointerEvents="none">
      <Svg width={120} height={110} viewBox="0 0 120 110" fill="none">
        <Path
          d="M20 48L60 16l40 32v46H20V48z"
          stroke="#FFFFFF"
          strokeWidth={4}
          strokeLinejoin="round"
        />
        <Path
          d="M60 42c-8 10-12 16-12 22a12 12 0 0024 0c0-6-4-12-12-22z"
          fill="#FFFFFF"
        />
      </Svg>
    </View>
  );
}

function WeekendMaintenance() {
  return (
    <View className="overflow-hidden rounded-2xl bg-brand px-5 py-5">
      <HouseWatermark />
      <Text className="text-lg font-bold text-white">Weekend Maintenance</Text>
      <Text className="mt-2 text-sm leading-5 text-white/85">
        Scheduled maintenance occurs every Sunday from 2:00 AM to 4:00 AM. Please store sufficient
        water during this period.
      </Text>
    </View>
  );
}

export function WaterSchedule() {
  return (
    <View className="gap-4">
      {WEEKDAY_SCHEDULE.map((schedule) => (
        <DayScheduleCard key={schedule.id} schedule={schedule} />
      ))}
      <WeekendMaintenance />
    </View>
  );
}
