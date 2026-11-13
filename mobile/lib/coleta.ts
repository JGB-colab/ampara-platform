import { useSyncExternalStore } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';

import { checkHealth, sendReading } from '../src/api';
import { DEFAULT_CONFIG, loadConfig, saveConfig } from '../src/config';
import {
  ELM327,
  ObdError,
  ensureBluetoothEnabled,
  listBondedDevices,
} from '../src/obd';
import type { AppConfig } from '../src/types';

/** Estado da conexão/coleta. */
export type ColetaStatus = 'disconnected' | 'connecting' | 'ready' | 'running' | 'error';

export interface ColetaState {
  status: ColetaStatus;
  devices: { id: string; name: string }[];
  selectedId: string | null;
  intervalSec: number;
  cycles: number;
  sent: number;
  failed: number;
  /** Último valor lido por PID na coleta ao vivo. */
  live: Record<string, number>;
  lastError: string | null;
  notice: string | null;
  config: AppConfig;
  dtcs: string[];
  dtcBusy: boolean;
}

const initialState: ColetaState = {
  status: 'disconnected',
  devices: [],
  selectedId: null,
  intervalSec: 5,
  cycles: 0,
  sent: 0,
  failed: 0,
  live: {},
  lastError: null,
  notice: null,
  config: DEFAULT_CONFIG,
  dtcs: [],
  dtcBusy: false,
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Permissões de runtime exigidas por Android 12+ (BLE/CONNECT) e anteriores (localização). */
async function ensureAndroidPermissions(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const apiLevel = Number(Platform.Version);
  const permissions =
    apiLevel >= 31
      ? [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        ]
      : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
  const results = await PermissionsAndroid.requestMultiple(permissions);
  const denied = Object.values(results).some(
    (result) => result !== PermissionsAndroid.RESULTS.GRANTED,
  );
  if (denied) {
    throw new ObdError(
      'Permissão de Bluetooth negada. Conceda a permissão nos ajustes do aplicativo.',
    );
  }
}

/**
 * Store único de coleta: o loop roda fora da React tree, então a coleta
 * continua ao trocar de aba e as telas apenas assinam o estado.
 */
class ColetaStore {
  private state: ColetaState = { ...initialState };
  private listeners = new Set<() => void>();
  private elm = new ELM327();
  private loopToken = 0;
  private configLoaded = false;

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly getState = (): ColetaState => this.state;

  private set(patch: Partial<ColetaState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }

  /** Carrega a configuração gravada no aparelho (assíncrono, uma vez). */
  ensureConfigLoaded(): void {
    if (this.configLoaded) return;
    this.configLoaded = true;
    loadConfig().then((config) => this.set({ config }));
  }

  get connected(): boolean {
    return this.elm.connected;
  }

  /** Lista os dongles pareados. */
  async refreshDevices(): Promise<void> {
    this.ensureConfigLoaded();
    this.set({ lastError: null, notice: null });
    try {
      await ensureAndroidPermissions();
      const enabled = await ensureBluetoothEnabled();
      if (!enabled) {
        this.set({ lastError: 'Bluetooth desativado. Ative o Bluetooth e tente de novo.' });
        return;
      }
      const devices = await listBondedDevices();
      this.set({
        devices,
        notice:
          devices.length === 0
            ? 'Nenhum dongle pareado. Pareie o ELM327 nos ajustes de Bluetooth do Android.'
            : null,
      });
    } catch (exc) {
      this.set({ lastError: msg(exc) });
    }
  }

  /** Conecta ao dongle selecionado (com retry herdado do ELM327). */
  async connect(deviceId: string): Promise<void> {
    if (this.state.status === 'connecting' || this.state.status === 'running') return;
    this.ensureConfigLoaded();
    this.set({ status: 'connecting', selectedId: deviceId, lastError: null, notice: null });
    try {
      await ensureAndroidPermissions();
      await ensureBluetoothEnabled();
      await this.elm.connect(deviceId);
      this.set({ status: 'ready', notice: 'Dongle conectado. Ignição ligada para ler dados.' });
    } catch (exc) {
      await this.elm.disconnect().catch(() => undefined);
      this.set({ status: 'error', lastError: msg(exc) });
    }
  }

  /** Encerra a coleta (se ativa) e desconecta. */
  async disconnect(): Promise<void> {
    this.loopToken += 1;
    await this.elm.disconnect().catch(() => undefined);
    this.set({ status: 'disconnected', live: {}, notice: null });
  }

  setIntervalSec(seconds: number): void {
    const clamped = Math.min(60, Math.max(1, Math.round(seconds) || 1));
    this.set({ intervalSec: clamped });
  }

  /** Inicia o ciclo de coleta e envio para a API. */
  start(): void {
    if (!this.elm.connected || this.state.status === 'running') return;
    this.set({
      status: 'running',
      cycles: 0,
      sent: 0,
      failed: 0,
      lastError: null,
      notice: 'Coletando…',
    });
    this.loopToken += 1;
    void this.runLoop(this.loopToken);
  }

  /** Para a coleta mantendo a conexão. */
  stop(): void {
    this.loopToken += 1;
    if (this.state.status === 'running') {
      this.set({ status: 'ready', notice: 'Coleta parada.' });
    }
  }

  private async runLoop(token: number): Promise<void> {
    while (this.state.status === 'running' && this.loopToken === token) {
      const started = Date.now();
      try {
        const readings = await this.elm.readCycle();
        if (readings.length === 0) {
          this.set({ lastError: 'Nenhum PID respondeu (ignição ligada? dongle na porta certa?)' });
        } else {
          this.set({ lastError: null });
          for (const reading of readings) {
            this.set({ live: { ...this.state.live, [reading.pid]: reading.value } });
            const result = await sendReading(this.state.config, reading);
            if (result.ok) {
              this.set({ sent: this.state.sent + 1 });
            } else {
              this.set({
                failed: this.state.failed + 1,
                lastError: result.error ?? 'Falha ao enviar leitura.',
              });
            }
          }
        }
        this.set({ cycles: this.state.cycles + 1 });
      } catch (exc) {
        this.set({ status: 'error', lastError: msg(exc) });
        return;
      }
      const elapsed = Date.now() - started;
      const wait = Math.max(500, this.state.intervalSec * 1000 - elapsed);
      await sleep(wait);
      if (this.loopToken !== token) return;
    }
  }

  /** Lê os códigos de falha (modo 03) e envia cada um para a API. */
  async readDtcs(): Promise<void> {
    if (!this.elm.connected) {
      this.set({ lastError: 'Conecte ao dongle antes de ler os códigos.' });
      return;
    }
    if (this.state.status === 'running') {
      this.set({ lastError: 'Pare a coleta antes de ler os códigos de falha.' });
      return;
    }
    this.set({ dtcBusy: true, lastError: null, notice: null });
    try {
      const codes = await this.elm.readDtcs();
      let sentCount = 0;
      for (const code of codes) {
        const result = await sendReading(this.state.config, {
          pid: code,
          value: 1,
          unit: 'dtc',
        });
        if (result.ok) sentCount += 1;
      }
      this.set({
        dtcs: codes,
        dtcBusy: false,
        notice:
          codes.length === 0
            ? 'Nenhum código de falha armazenado.'
            : `${sentCount}/${codes.length} códigos enviados à API.`,
      });
    } catch (exc) {
      this.set({ dtcBusy: false, lastError: msg(exc) });
    }
  }

  /** Persiste a configuração no aparelho. */
  async saveAppConfig(config: AppConfig): Promise<void> {
    await saveConfig(config);
    this.configLoaded = true;
    this.set({ config, notice: 'Configuração salva neste aparelho.' });
  }

  /** Testa /health da API configurada. */
  async testApi(): Promise<void> {
    const ok = await checkHealth(this.state.config);
    this.set({
      notice: ok ? 'API respondendo (health OK).' : null,
      lastError: ok ? null : 'API não respondeu. Verifique a URL e a conexão de internet.',
    });
  }

  openBluetoothSettings(): void {
    RNBluetoothClassic.openBluetoothSettings();
  }
}

export const coleta = new ColetaStore();

/** Assina o estado da coleta na React tree. */
export function useColeta(): ColetaState {
  return useSyncExternalStore(coleta.subscribe, coleta.getState, coleta.getState);
}
