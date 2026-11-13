import RNBluetoothClassic, {
  type BluetoothEventSubscription,
} from 'react-native-bluetooth-classic';

import type { Reading } from './types';

/** PIDs coletados (allowlist do domínio amp) e suas unidades. */
export const PID_UNITS: Record<string, string> = {
  '010C': 'rpm',
  '010D': 'km/h',
  '0105': 'celsius',
};

/** Ordem de leitura por ciclo (rotação primeiro, mais útil na tela). */
export const COLLECTED_PIDS = ['010C', '010D', '0105'] as const;

const DTC_RE = /^[PCBU][0-9A-F]{4}$/;

/** Erro com mensagem amigável para a tela mostrar ao usuário. */
export class ObdError extends Error {}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

interface Waiter {
  resolve: (text: string) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

/** Decodifica 2 bytes de um DTC no padrão SAE J2012 (port de python-obd). */
function decodeDtc(byte1: number, byte2: number): string | null {
  if (byte1 === 0x00 && byte2 === 0x00) return null; // padding
  const letter = 'PCBU'[(byte1 >> 6) & 0b11] ?? '';
  const second = String((byte1 >> 4) & 0b11);
  const rest = (((byte1 & 0x0f) << 8) | byte2).toString(16).toUpperCase().padStart(3, '0');
  const code = letter + second + rest;
  return DTC_RE.test(code) ? code : null;
}

/**
 * Extrai os DTCs de uma resposta do modo 03 (comando "03").
 *
 * CAN e alguns ECUs trazem um byte de contagem logo após o SID "43";
 * protocolos antigos (KWP/ISO 9141) podem vir direto. Usa o byte de contagem
 * quando ele é compatível com o tamanho da resposta, senão interpreta direto.
 */
export function parseDtcResponse(raw: string): string[] {
  const hex = raw.toUpperCase().replace(/[^0-9A-F]/g, '');
  const sid = hex.indexOf('43');
  if (sid < 0) return [];
  const body = hex.slice(sid + 2);
  const bytes: number[] = [];
  for (let i = 0; i + 1 < body.length; i += 2) {
    bytes.push(parseInt(body.slice(i, i + 2), 16));
  }
  if (bytes.length === 0) return [];

  const hasCountByte = bytes[0] * 2 <= bytes.length - 1;
  const pairs = hasCountByte ? bytes.slice(1) : bytes;

  const codes: string[] = [];
  for (let i = 0; i + 1 < pairs.length; i += 2) {
    const code = decodeDtc(pairs[i], pairs[i + 1]);
    if (code && !codes.includes(code)) codes.push(code);
  }
  return codes;
}

/**
 * Extrai o valor numérico de uma resposta do modo 01 (ex.: "410C0BB8").
 * Retorna null se a resposta não contém o PID pedido.
 */
export function parsePidResponse(pid: string, raw: string): number | null {
  const hex = raw.toUpperCase().replace(/[^0-9A-F]/g, '');
  const marker = `41${pid.slice(2)}`;
  const at = hex.indexOf(marker);
  if (at < 0) return null;
  const data = hex.slice(at + marker.length);

  switch (pid) {
    case '010C': {
      // RPM = ((256 * A) + B) / 4
      if (data.length < 4) return null;
      const a = parseInt(data.slice(0, 2), 16);
      const b = parseInt(data.slice(2, 4), 16);
      return Math.round(((256 * a + b) / 4) * 10) / 10;
    }
    case '0105': {
      // Refrigerante = A - 40
      if (data.length < 2) return null;
      return parseInt(data.slice(0, 2), 16) - 40;
    }
    case '010D': {
      // Velocidade = A
      if (data.length < 2) return null;
      return parseInt(data.slice(0, 2), 16);
    }
    default:
      return null;
  }
}

/**
 * Cliente ELM327 sobre Bluetooth Classic (SPP).
 *
 * Espelha a inicialização do python-obd usada pelo coletor PC:
 * ATZ -> ATE0 -> ATL0 -> ATS0 -> ATSP0 e comandos mode 01 / 03.
 */
export class ELM327 {
  private address: string | null = null;
  private buffer = '';
  private waiter: Waiter | null = null;
  private subscription: BluetoothEventSubscription | null = null;

  get connected(): boolean {
    return this.address !== null;
  }

  /** Conecta ao dispositivo pareado com retry (SPP precisa de instantes para religar). */
  async connect(address: string, attempts = 4, delayMs = 3000): Promise<void> {
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        await RNBluetoothClassic.connectToDevice(address);
        this.address = address;
        this.buffer = '';
        this.subscription = RNBluetoothClassic.onDeviceRead(address, (event) => {
          this.buffer += event.data;
          this.checkPrompt();
        });
        await this.init();
        return;
      } catch (exc) {
        lastError = exc;
        await this.disconnect().catch(() => undefined);
        if (attempt < attempts) await sleep(delayMs);
      }
    }
    const detail = lastError instanceof Error ? lastError.message : String(lastError);
    throw new ObdError(
      `Não foi possível conectar ao dongle após ${attempts} tentativas (${detail}). ` +
        'Verifique pareamento, Bluetooth ligado e se outro app não está usando o dongle.',
    );
  }

  /** Inicializa o ELM327 e detecta o protocolo do veículo. */
  private async init(): Promise<void> {
    await this.send('ATZ', 5000);
    await this.expectOk('ATE0');
    await this.expectOk('ATL0');
    await this.expectOk('ATS0');
    await this.expectOk('ATSP0');
    // Primeiro comando dispara a busca de protocolo; pode demorar ~10s.
    const probe = await this.send('0100', 20000);
    if (/UNABLE TO CONNECT|BUS INIT: *ERROR/i.test(probe)) {
      throw new ObdError(
        'O dongle não encontrou o veículo. Ligue a ignição e confirme que é o dongle correto.',
      );
    }
    if (probe.includes('?')) {
      throw new ObdError('Dongle não respondeu ao comando de inicialização (ATZ/protocolo).');
    }
  }

  private async expectOk(command: string): Promise<void> {
    const response = await this.send(command, 4000);
    if (response.includes('?')) {
      throw new ObdError(`Dongle não reconheceu o comando ${command}.`);
    }
  }

  /** Envia um comando CR-terminado e espera o prompt ">". */
  private send(command: string, timeoutMs: number): Promise<string> {
    const address = this.address;
    if (!address) return Promise.reject(new ObdError('Dongle não conectado.'));
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.waiter?.timer === timer) this.waiter = null;
        reject(new ObdError(`Sem resposta do dongle ao comando "${command}".`));
      }, timeoutMs);
      this.waiter = { resolve, reject, timer };
      this.buffer = '';
      RNBluetoothClassic.writeToDevice(address, `${command}\r`, 'ascii').catch((exc: unknown) => {
        clearTimeout(timer);
        if (this.waiter?.timer === timer) this.waiter = null;
        reject(
          new ObdError(
            `Falha ao enviar comando: ${exc instanceof Error ? exc.message : String(exc)}`,
          ),
        );
      });
    });
  }

  private checkPrompt(): void {
    const waiter = this.waiter;
    if (!waiter) return;
    const end = this.buffer.indexOf('>');
    if (end < 0) return;
    const text = this.buffer.slice(0, end);
    this.buffer = this.buffer.slice(end + 1);
    clearTimeout(waiter.timer);
    this.waiter = null;
    waiter.resolve(text);
  }

  /** Lê um PID do modo 01; null quando o veículo não respondeu. */
  async readPid(pid: string, timeoutMs = 5000): Promise<number | null> {
    const raw = await this.send(pid, timeoutMs);
    if (/NO DATA|UNABLE TO CONNECT|BUS INIT: *ERROR/i.test(raw)) return null;
    return parsePidResponse(pid, raw);
  }

  /** Lê todos os PIDs coletados no ciclo atual. */
  async readCycle(): Promise<Reading[]> {
    const readings: Reading[] = [];
    for (const pid of COLLECTED_PIDS) {
      try {
        const value = await this.readPid(pid);
        if (value === null) continue;
        readings.push({ pid, value, unit: PID_UNITS[pid] });
      } catch (exc) {
        if (exc instanceof ObdError) continue; // um PID sem resposta não mata o ciclo
        throw exc;
      }
    }
    return readings;
  }

  /** Lê os códigos de falha armazenados (modo 03). */
  async readDtcs(timeoutMs = 10000): Promise<string[]> {
    const raw = await this.send('03', timeoutMs);
    if (/UNABLE TO CONNECT|BUS INIT: *ERROR/i.test(raw)) {
      throw new ObdError('Veículo não respondeu à leitura de códigos. Ligue a ignição.');
    }
    return parseDtcResponse(raw);
  }

  /** Desconecta e libera o subscription de leitura. */
  async disconnect(): Promise<void> {
    const address = this.address;
    const waiter = this.waiter;
    this.waiter = null;
    if (waiter) {
      clearTimeout(waiter.timer);
      waiter.reject(new ObdError('Conexão encerrada.'));
    }
    this.subscription?.remove();
    this.subscription = null;
    this.address = null;
    this.buffer = '';
    if (address) {
      await RNBluetoothClassic.disconnectFromDevice(address).catch(() => undefined);
    }
  }
}

/** Lista os dongles já pareados com o celular. */
export async function listBondedDevices(): Promise<
  { id: string; name: string }[]
> {
  const devices = await RNBluetoothClassic.getBondedDevices();
  return devices.map((device) => ({ id: device.id, name: device.name || device.id }));
}

/** Garante que o Bluetooth está ligado; pede ativação ao usuário se precisar. */
export async function ensureBluetoothEnabled(): Promise<boolean> {
  const enabled = await RNBluetoothClassic.isBluetoothEnabled();
  if (enabled) return true;
  return RNBluetoothClassic.requestBluetoothEnabled();
}
