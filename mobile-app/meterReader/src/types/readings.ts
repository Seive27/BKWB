export type ReadingStatus = 'pending' | 'completed';

export type HistorySyncStatus = 'pending' | 'synced';

export type AssignedReading = {
  id: string;
  name: string;
  accountNo: string;
  areaRoute: string;
  lastReadingDate: string;
  previousReading: number;
  status: ReadingStatus;
};

export type HistoryReading = {
  id: string;
  name: string;
  recordedAt: string;
  previous: number;
  current: number;
  consumption: number;
  syncStatus: HistorySyncStatus;
};
