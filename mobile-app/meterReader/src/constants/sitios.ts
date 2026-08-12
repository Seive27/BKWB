/** Barangay Kalunasan sitios used for meter reading routes. */
export const SITIO_OPTIONS = [
  'Back Crisanto',
  'Ellena Homes',
  'Lariha',
  'Lokana',
  'Lower Awihaw',
  'Lower Camparang',
  'Lower Kalunasan',
  'Mountain View Village',
  'Pang Pang Lanog',
  'San Jose Ville',
  'San Marcelo',
  'Sobusteha',
  'Unit 2',
  'Unit 3',
  'Unit 4',
  'Unit 5',
  'Upper Awiha',
  'Upper Camprang',
  'Upper Kalunasan',
  'Valle Estrella',
] as const;

export type SitioName = (typeof SITIO_OPTIONS)[number];
