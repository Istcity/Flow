/**
 * Türkiye iş günü takvimi:
 * - Pazar: tatil (0)
 * - Resmi + dini bayramlar: tatil (0)
 * - Cumartesi: yarım iş günü (0.5)
 * - Diğer günler: tam iş günü (1)
 */

const MS_PER_DAY = 86_400_000;

/** Yılbaşı, 23 Nisan, 1 Mayıs, 19 Mayıs, 15 Temmuz, 30 Ağustos, 29 Ekim */
const FIXED_HOLIDAY_MM_DD = new Set([
  '01-01',
  '04-23',
  '05-01',
  '05-19',
  '07-15',
  '08-30',
  '10-29',
]);

/** 28 Ekim arife — öğleden sonra tatil; üretim planında tam gün kapalı sayılır */
const FIXED_ARIFE_MM_DD = new Set(['10-28']);

/** Miladi tarih (YYYY-MM-DD): bayram + arife günleri */
const RELIGIOUS_AND_ARIFE_BY_YEAR: Record<number, string[]> = {
  2024: [
    '2024-04-09',
    '2024-04-10',
    '2024-04-11',
    '2024-04-12',
    '2024-06-15',
    '2024-06-16',
    '2024-06-17',
    '2024-06-18',
    '2024-06-19',
  ],
  2025: [
    '2025-03-29',
    '2025-03-30',
    '2025-03-31',
    '2025-04-01',
    '2025-06-05',
    '2025-06-06',
    '2025-06-07',
    '2025-06-08',
    '2025-06-09',
  ],
  2026: [
    '2026-03-19',
    '2026-03-20',
    '2026-03-21',
    '2026-03-22',
    '2026-05-26',
    '2026-05-27',
    '2026-05-28',
    '2026-05-29',
    '2026-05-30',
  ],
  2027: [
    '2027-03-08',
    '2027-03-09',
    '2027-03-10',
    '2027-03-11',
    '2027-05-15',
    '2027-05-16',
    '2027-05-17',
    '2027-05-18',
    '2027-05-19',
  ],
  2028: [
    '2028-02-25',
    '2028-02-26',
    '2028-02-27',
    '2028-02-28',
    '2028-05-04',
    '2028-05-05',
    '2028-05-06',
    '2028-05-07',
    '2028-05-08',
  ],
  2029: [
    '2029-02-14',
    '2029-02-15',
    '2029-02-16',
    '2029-02-17',
    '2029-04-23',
    '2029-04-24',
    '2029-04-25',
    '2029-04-26',
    '2029-04-27',
  ],
  2030: [
    '2030-02-04',
    '2030-02-05',
    '2030-02-06',
    '2030-02-07',
    '2030-04-12',
    '2030-04-13',
    '2030-04-14',
    '2030-04-15',
    '2030-04-16',
  ],
  2031: [
    '2031-01-25',
    '2031-01-26',
    '2031-01-27',
    '2031-01-28',
    '2031-04-01',
    '2031-04-02',
    '2031-04-03',
    '2031-04-04',
    '2031-04-05',
  ],
};

const religiousHolidaySetCache = new Map<number, Set<string>>();

function parseDay(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T12:00:00`);
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getReligiousHolidaySet(year: number): Set<string> {
  const cached = religiousHolidaySetCache.get(year);
  if (cached) return cached;

  const set = new Set<string>();
  for (const date of RELIGIOUS_AND_ARIFE_BY_YEAR[year] ?? []) {
    set.add(date);
  }
  religiousHolidaySetCache.set(year, set);
  return set;
}

export function isFixedPublicHoliday(iso: string): boolean {
  const mmdd = iso.slice(5, 10);
  return FIXED_HOLIDAY_MM_DD.has(mmdd) || FIXED_ARIFE_MM_DD.has(mmdd);
}

export function isReligiousOrArifeHoliday(iso: string): boolean {
  const year = Number.parseInt(iso.slice(0, 4), 10);
  return getReligiousHolidaySet(year).has(iso.slice(0, 10));
}

export function isNonWorkingHoliday(iso: string): boolean {
  return isFixedPublicHoliday(iso) || isReligiousOrArifeHoliday(iso);
}

/** 0 = tatil, 0.5 = cumartesi, 1 = tam iş günü */
export function getWorkDayWeight(iso: string): number {
  const day = iso.slice(0, 10);
  if (isNonWorkingHoliday(day)) return 0;

  const dow = parseDay(day).getDay();
  if (dow === 0) return 0;
  if (dow === 6) return 0.5;
  return 1;
}

export function getWorkDayLabel(iso: string): string {
  const weight = getWorkDayWeight(iso);
  if (weight === 0) {
    if (parseDay(iso).getDay() === 0) return 'Pazar (tatil)';
    if (isReligiousOrArifeHoliday(iso)) return 'Dini/resmi tatil';
    if (isFixedPublicHoliday(iso)) return 'Resmi tatil';
    return 'Tatil';
  }
  if (weight === 0.5) return 'Cumartesi (yarım gün)';
  return 'Tam iş günü';
}

/** Başlangıç–bitiş arası (dahil) iş günü birimleri toplamı */
export function sumWorkUnitsBetween(start: string, end: string): number {
  const startDay = start.slice(0, 10);
  const endDay = end.slice(0, 10);
  if (endDay < startDay) return 0;

  let sum = 0;
  const cursor = parseDay(startDay);
  const endDate = parseDay(endDay);

  while (cursor <= endDate) {
    sum += getWorkDayWeight(toIso(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return Math.max(0.5, sum);
}

/** Belirli tarihten itibaren N iş birimi ileri git → takvim tarihi */
export function addWorkUnitsFrom(startIso: string, units: number): string {
  if (units <= 0) return startIso.slice(0, 10);

  let remaining = units;
  const cursor = parseDay(startIso.slice(0, 10));
  let guard = 0;

  while (remaining > 0.0001 && guard < 3660) {
    const weight = getWorkDayWeight(toIso(cursor));
    if (weight > 0) {
      remaining -= weight;
      if (remaining <= 0.0001) {
        return toIso(cursor);
      }
    }
    cursor.setDate(cursor.getDate() + 1);
    guard += 1;
  }

  return toIso(cursor);
}

export function calendarDaysBetween(start: string, end: string): number {
  const diff = parseDay(end).getTime() - parseDay(start).getTime();
  return Math.max(0, Math.round(diff / MS_PER_DAY));
}
