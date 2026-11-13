/**
 * Regras de tendência do dashboard web (src/ampara/static/index.html),
 * portadas para o app. São heurísticas explícitas sobre as últimas
 * leituras - não são diagnóstico.
 */

export interface PidLabel {
  name: string;
  unit: string;
}

export const PID_LABELS: Record<string, PidLabel> = {
  '0105': { name: 'Temperatura do refrigerante', unit: '°C' },
  '010C': { name: 'Rotação do motor', unit: 'rpm' },
  '010D': { name: 'Velocidade', unit: 'km/h' },
};

export const DTC_LABELS: Record<string, string> = {
  P0301: 'Falha de ignição — cilindro 1',
  P0302: 'Falha de ignição — cilindro 2',
  P0303: 'Falha de ignição — cilindro 3',
  P0304: 'Falha de ignição — cilindro 4',
  P0420: 'Eficiência do catalisador abaixo do esperado',
  P0171: 'Mistura combustível/ar muito pobre (banco 1)',
  P0172: 'Mistura combustível/ar muito rica (banco 1)',
  P0128: 'Termostato não atingindo temperatura ideal',
  P0442: 'Circuito do sensor de nível de combustível',
  C0035: 'Sensor de velocidade das rodas dianteiras',
  U0100: 'Perda de comunicação com a ECU',
};

export interface Trend {
  dir: 'up' | 'down' | 'flat';
  label: string;
}

/** Direção da tendência: média da 2ª metade contra a 1ª metade das leituras. */
export function trendOf(values: number[]): Trend {
  if (values.length < 3) return { dir: 'flat', label: '—' };
  const half = Math.floor(values.length / 2);
  const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
  const delta = avg(values.slice(half)) - avg(values.slice(0, half));
  const ref = Math.abs(avg(values)) || 1;
  if (delta / ref > 0.05) return { dir: 'up', label: 'subindo ↑' };
  if (delta / ref < -0.05) return { dir: 'down', label: 'descendo ↓' };
  return { dir: 'flat', label: 'estável →' };
}

export interface Alert {
  level: 'ok' | 'warn' | 'bad';
  text: string;
}

/** Regras de tendência (heurística, não diagnóstico). */
export function buildAlerts(hist: Record<string, { value: number }[]>): Alert[] {
  const alerts: Alert[] = [];
  const temp = (hist['0105'] ?? []).map((r) => r.value);
  const rpm = (hist['010C'] ?? []).map((r) => r.value);
  const speed = (hist['010D'] ?? []).map((r) => r.value);

  if (temp.length >= 3) {
    const last = temp[temp.length - 1];
    const trend = trendOf(temp);
    if (last >= 105) {
      alerts.push({
        level: 'bad',
        text: `Temperatura do refrigerante em ${last} °C — acima do normal (≥105 °C). Verifique o veículo.`,
      });
    } else if (trend.dir === 'up' && last >= 95) {
      alerts.push({
        level: 'warn',
        text: `Temperatura subindo e em ${last} °C — tendência de aquecimento. Acompanhe.`,
      });
    }
  }

  if (rpm.length >= 3) {
    const last = rpm[rpm.length - 1];
    if (last >= 6000) {
      alerts.push({
        level: 'warn',
        text: `Rotação alta sustentada (${last} rpm) — atenção à carga do motor.`,
      });
    }
  }

  if (speed.length >= 3) {
    const trend = trendOf(speed);
    const last = speed[speed.length - 1];
    if (trend.dir === 'up' && last >= 100) {
      alerts.push({
        level: 'ok',
        text: `Velocidade em aceleração (${last} km/h) — comportamento normal de condução.`,
      });
    }
  }

  if (alerts.length === 0) {
    alerts.push({ level: 'ok', text: 'Sem sinais de risco nas últimas leituras.' });
  }
  return alerts;
}
