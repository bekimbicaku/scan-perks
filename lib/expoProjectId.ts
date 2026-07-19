import Constants from 'expo-constants';

const EAS_PROJECT_ID = 'c5472ecf-b98c-43a6-b987-86ce074f2a47';

export function getExpoProjectId(): string {
  const fromConfig = Constants.expoConfig?.extra?.eas?.projectId;
  if (typeof fromConfig === 'string' && fromConfig.trim()) {
    return fromConfig;
  }

  const fromEnv = process.env.EXPO_PUBLIC_PROJECT_ID;
  if (typeof fromEnv === 'string' && fromEnv.trim()) {
    return fromEnv;
  }

  return EAS_PROJECT_ID;
}
