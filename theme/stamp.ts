import { TextStyle } from 'react-native';

/** Stamp & Sky tokens. Used by Home, Scan, Profile, and the business dashboard. */
export const stamp = {
  deep: '#0A3D62',
  ink: '#062A44',
  sky: '#38BDF8',
  skyTint: '#D9F0FC',
  mist: '#EAF6FD',
  mistBusiness: '#F1F8FD',
  line: '#D5E8F4',
  muted: '#47657C',
  input: '#6B93AD',
  dash: '#7FA6BE',
  mintBg: '#DDF7EC',
  mintText: '#065F46',
  live: '#10B981',
  amberBg: '#FFF0CF',
  amberText: '#8A4B00',
  amber: '#F59E0B',
  danger: '#B42318',
  toggleOff: '#6F8CA0',
  white: '#FFFFFF',
  scanBg: '#041421',
  scanGlow: '#0B2F4A',
  scanMuted: '#C9DDEA',
  navMutedDark: '#9DB9CB',
  orb: '#BDE6FB',
  radiusCard: 28,
  radiusTicket: 30,
  radiusButton: 18,
  radiusInput: 16,
  radiusPill: 14,
  radiusNav: 36,
  buttonHeight: 54,
  shadow: 'rgba(10, 61, 98, 0.14)',
  skyShadow: 'rgba(56, 189, 248, 0.38)',
} as const;

export const outfit = {
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semibold: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
  extra: 'Outfit_800ExtraBold',
} as const;

export function outfitFace(weight: keyof typeof outfit): TextStyle {
  return { fontFamily: outfit[weight] };
}

export function venueMark(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 1);
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`;
}

export function personMark(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.slice(0, 1).toUpperCase() : '';
}
