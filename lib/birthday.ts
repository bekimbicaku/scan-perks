export function isBirthdayWindow(
  month?: number | null,
  day?: number | null,
  windowDays = 7
): boolean {
  if (!month || !day) return false;
  const now = new Date();
  const year = now.getFullYear();
  const birthday = new Date(year, month - 1, day);
  const start = new Date(birthday);
  start.setDate(start.getDate() - 1);
  const end = new Date(birthday);
  end.setDate(end.getDate() + windowDays);
  return now >= start && now <= end;
}

export function parseBirthdayInput(value: string): { month: number; day: number } | null {
  const match = value.trim().match(/^(\d{1,2})[\/\-.](\d{1,2})$/);
  if (!match) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { month, day };
}

export function formatBirthday(month?: number | null, day?: number | null): string {
  if (!month || !day) return '';
  return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
