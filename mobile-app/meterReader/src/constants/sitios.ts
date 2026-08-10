/** Barangay Kalunasan sitios used for meter reading routes. */
export const SITIO_OPTIONS = [
  'Lower Kalunasan',
  'Upper Kalunasan',
  'Kamparang',
  'Oppra',
  'Pangpang Langub',
] as const;

export type SitioName = (typeof SITIO_OPTIONS)[number];
