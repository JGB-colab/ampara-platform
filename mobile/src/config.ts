import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AppConfig } from './types';

/** Base da API em produção (Render). */
export const DEFAULT_CONFIG: AppConfig = {
  baseUrl: 'https://ampara-platform.onrender.com',
  token: '',
  vehicleId: 'classic',
};

const STORAGE_KEY = 'ampara.config.v1';

/** Lê a configuração do aparelho; em falha, retorna os padrões. */
export async function loadConfig(): Promise<AppConfig> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<AppConfig>;
    return {
      baseUrl: (parsed.baseUrl || DEFAULT_CONFIG.baseUrl).replace(/\/+$/, ''),
      token: parsed.token ?? DEFAULT_CONFIG.token,
      vehicleId: parsed.vehicleId || DEFAULT_CONFIG.vehicleId,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

/** Persiste a configuração no aparelho. */
export async function saveConfig(config: AppConfig): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...config, baseUrl: config.baseUrl.replace(/\/+$/, '') }),
  );
}
