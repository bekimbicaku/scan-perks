export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  full: 9999,
} as const;

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, color: '#0C4A6E' },
  h2: { fontSize: 22, fontWeight: '700' as const, color: '#0C4A6E' },
  h3: { fontSize: 18, fontWeight: '600' as const, color: '#075985' },
  body: { fontSize: 16, fontWeight: '400' as const, color: '#0369A1' },
  caption: { fontSize: 14, fontWeight: '400' as const, color: '#64748B' },
  label: { fontSize: 12, fontWeight: '600' as const, color: '#0284C7' },
} as const;
