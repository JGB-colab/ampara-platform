import * as Crypto from 'expo-crypto';

import type { AppConfig, Reading, TelemetryRecord } from './types';

/** Resultado do envio de uma leitura (não lança: o loop continua em falha de rede). */
export interface SendResult {
  ok: boolean;
  status?: number;
  error?: string;
}

/** Envia uma leitura para POST /v1/telemetria (mesmo payload do coletor PC). */
export async function sendReading(
  config: AppConfig,
  reading: Reading,
): Promise<SendResult> {
  const body = {
    event_id: Crypto.randomUUID(),
    vehicle_id: config.vehicleId,
    recorded_at: new Date().toISOString(),
    pid: reading.pid,
    value: reading.value,
    unit: reading.unit,
  };
  try {
    const res = await fetch(`${config.baseUrl}/v1/telemetria`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Token': config.token,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const payload = (await res.json()) as { detail?: unknown };
        if (payload.detail) detail += `: ${JSON.stringify(payload.detail)}`;
      } catch {
        // corpo não-JSON; mantém só o status
      }
      return { ok: false, status: res.status, error: detail };
    }
    return { ok: true, status: res.status };
  } catch (exc) {
    return { ok: false, error: exc instanceof Error ? exc.message : String(exc) };
  }
}

/** Consulta as leituras mais recentes do veículo (GET /v1/veiculos/{id}/telemetria). */
export async function fetchReadings(
  config: AppConfig,
  limit = 50,
): Promise<TelemetryRecord[]> {
  const res = await fetch(
    `${config.baseUrl}/v1/veiculos/${encodeURIComponent(config.vehicleId)}/telemetria?limit=${limit}`,
    { headers: { 'X-Device-Token': config.token } },
  );
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const payload = (await res.json()) as { detail?: unknown };
      if (payload.detail) detail += `: ${JSON.stringify(payload.detail)}`;
    } catch {
      // corpo não-JSON
    }
    throw new Error(detail);
  }
  return (await res.json()) as TelemetryRecord[];
}

/** Verifica /health (usado para diagnosticar conexão na tela Dashboard). */
export async function checkHealth(config: AppConfig): Promise<boolean> {
  try {
    const res = await fetch(`${config.baseUrl}/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}
