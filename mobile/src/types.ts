/** Configuração do app gravada no aparelho (AsyncStorage). */
export interface AppConfig {
  /** Base da API, ex.: https://ampara-platform.onrender.com */
  baseUrl: string;
  /** X-Device-Token; digitado pelo usuário na tela Config. */
  token: string;
  /** vehicle_id autorizado para este token. */
  vehicleId: string;
}

/** Leitura enviada/consultada de telemetria (contrato /v1/telemetria). */
export interface TelemetryRecord {
  event_id: string;
  vehicle_id: string;
  recorded_at: string;
  pid: string;
  value: number;
  unit: string;
  duplicate?: boolean;
}

/** Leitura local ainda não enviada. */
export interface Reading {
  pid: string;
  value: number;
  unit: string;
}
