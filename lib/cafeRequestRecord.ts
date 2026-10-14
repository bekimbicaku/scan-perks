export const MIN_CAFE_NAME = 2;
export const MAX_CAFE_NAME = 80;

export function normalizeCafeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function validateCafeName(value: string): string | null {
  const name = normalizeCafeName(value);
  if (name.length < MIN_CAFE_NAME) return 'Enter the cafe name';
  if (name.length > MAX_CAFE_NAME) return 'That name is too long';
  return null;
}

export type CafeRequestRecord = {
  userId: string;
  email: string;
  userName: string;
  cafeName: string;
  city: string;
  createdAt: Date;
  updatedAt: Date;
};

export function buildCafeRequestRecord(input: {
  userId: string;
  email?: string;
  userName?: string;
  cafeName: string;
  city: string;
  createdAt?: Date;
  now?: Date;
}): CafeRequestRecord {
  const error = validateCafeName(input.cafeName);
  if (error) {
    throw new Error(error);
  }
  const now = input.now || new Date();
  return {
    userId: input.userId,
    email: (input.email || '').trim(),
    userName: (input.userName || '').trim(),
    cafeName: normalizeCafeName(input.cafeName),
    city: input.city.trim(),
    createdAt: input.createdAt || now,
    updatedAt: now,
  };
}
