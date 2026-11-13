import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { fetchReadings } from '../src/api';
import { useColeta } from '../lib/coleta';
import { colors, spacing } from '../lib/theme';
import { buildAlerts, PID_LABELS, trendOf, type Alert } from '../lib/trend';
import { Btn, Card, Pill } from '../lib/ui';
import type { TelemetryRecord } from '../src/types';

/** Agrupa as leituras por PID em ordem cronológica. */
function historyByPid(records: TelemetryRecord[]): Record<string, TelemetryRecord[]> {
  const hist: Record<string, TelemetryRecord[]> = {};
  for (const record of records) {
    (hist[record.pid] ??= []).push(record);
  }
  for (const values of Object.values(hist)) {
    values.sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
  }
  return hist;
}

const ALERT_TONE: Record<Alert['level'], 'ok' | 'warn' | 'bad'> = {
  ok: 'ok',
  warn: 'warn',
  bad: 'bad',
};

export default function DashboardScreen() {
  const { config } = useColeta();
  const [records, setRecords] = useState<TelemetryRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const rows = await fetchReadings(config, 100);
      setRecords(rows);
      setError(null);
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : String(exc));
    } finally {
      setRefreshing(false);
    }
  }, [config]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const hist = historyByPid(records);
  const alerts = buildAlerts(hist);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void load()}
          tintColor={colors.accent}
        />
      }
    >
      <Card title={`Veículo: ${config.vehicleId}`}>
        <View style={styles.row}>
          <Pill
            text={records.length > 0 ? `${records.length} leituras` : 'sem dados'}
            tone={records.length > 0 ? 'ok' : 'muted'}
          />
          <Btn label="Atualizar" variant="secondary" onPress={() => void load()} busy={refreshing} />
        </View>
        {error ? <Text style={styles.error}>Falha ao consultar a API: {error}</Text> : null}
      </Card>

      <View style={styles.grid}>
        {Object.entries(PID_LABELS).map(([pid, label]) => {
          const values = (hist[pid] ?? []).map((r) => r.value);
          const latest = values.length > 0 ? values[values.length - 1] : null;
          const trend = trendOf(values);
          const lastRecord = hist[pid]?.[hist[pid].length - 1];
          return (
            <View key={pid} style={styles.card}>
              <Text style={styles.cardLabel}>{label.name}</Text>
              <Text style={styles.cardValue}>{latest ?? '—'}</Text>
              <Text style={styles.cardUnit}>{label.unit}</Text>
              <Text
                style={[
                  styles.trend,
                  trend.dir === 'up' && { color: colors.warn },
                  trend.dir === 'down' && { color: colors.ok },
                  trend.dir === 'flat' && { color: colors.muted },
                ]}
              >
                {trend.label}
              </Text>
              {lastRecord ? (
                <Text style={styles.time}>
                  {new Date(lastRecord.recorded_at).toLocaleString('pt-BR')}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>

      <Card title="Alertas preditivos">
        <Text style={styles.disclaimer}>
          Regras de tendência sobre as últimas leituras — não é diagnóstico.
        </Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          {alerts.map((alert, index) => (
            <Pill key={`${alert.text}-${index}`} text={alert.text} tone={ALERT_TONE[alert.level]} />
          ))}
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  error: { color: colors.bad, fontSize: 13, lineHeight: 19, marginTop: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    flexGrow: 1,
    flexBasis: '47%',
  },
  cardLabel: { color: colors.muted, fontSize: 12 },
  cardValue: { color: colors.text, fontSize: 32, fontWeight: '700', marginTop: spacing.xs },
  cardUnit: { color: colors.accent, fontSize: 13 },
  trend: { fontSize: 13, marginTop: spacing.xs, fontWeight: '600' },
  time: { color: colors.muted, fontSize: 11, marginTop: spacing.xs },
  disclaimer: { color: colors.muted, fontSize: 12, lineHeight: 17 },
});
