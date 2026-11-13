import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Btn, Card, Field, Pill } from '../lib/ui';
import { coleta, useColeta } from '../lib/coleta';
import { colors, spacing } from '../lib/theme';

const STATUS_LABEL: Record<string, { text: string; tone: 'ok' | 'warn' | 'bad' | 'muted' }> = {
  disconnected: { text: 'Desconectado', tone: 'muted' },
  connecting: { text: 'Conectando…', tone: 'warn' },
  ready: { text: 'Conectado', tone: 'ok' },
  running: { text: 'Coletando', tone: 'ok' },
  error: { text: 'Erro', tone: 'bad' },
};

const LIVE_FIELDS: { pid: string; label: string; unit: string }[] = [
  { pid: '010C', label: 'Rotação', unit: 'rpm' },
  { pid: '010D', label: 'Velocidade', unit: 'km/h' },
  { pid: '0105', label: 'Refrigerante', unit: '°C' },
];

export default function ColetaScreen() {
  const state = useColeta();

  useEffect(() => {
    coleta.refreshDevices();
  }, []);

  const status = STATUS_LABEL[state.status] ?? STATUS_LABEL.disconnected;
  const running = state.status === 'running';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Card title="Dongle Bluetooth">
        <View style={styles.row}>
          <Pill text={status.text} tone={status.tone} />
          <Text style={styles.deviceName}>
            {state.selectedId
              ? (state.devices.find((d) => d.id === state.selectedId)?.name ?? state.selectedId)
              : 'nenhum selecionado'}
          </Text>
        </View>

        {state.devices.length === 0 ? (
          <Text style={styles.hint}>
            Nenhum dongle pareado. Pareie o ELM327 nos ajustes de Bluetooth do Android e toque em
            Atualizar.
          </Text>
        ) : (
          <View style={styles.deviceList}>
            {state.devices.map((device) => {
              const selected = device.id === state.selectedId;
              return (
                <Text
                  key={device.id}
                  onPress={
                    state.status === 'running' || state.status === 'connecting'
                      ? undefined
                      : () => coleta.connect(device.id)
                  }
                  style={[styles.deviceItem, selected && styles.deviceItemSelected]}
                >
                  {selected ? '● ' : '○ '}
                  {device.name}
                </Text>
              );
            })}
          </View>
        )}

        <View style={styles.btnRow}>
          <Btn
            label="Atualizar"
            variant="secondary"
            onPress={() => coleta.refreshDevices()}
            busy={state.status === 'connecting'}
          />
          <Btn
            label="Abrir ajustes BT"
            variant="secondary"
            onPress={() => coleta.openBluetoothSettings()}
          />
        </View>
        <View style={styles.btnRow}>
          {state.status === 'disconnected' || state.status === 'error' ? (
            <Btn
              label="Conectar"
              onPress={() => {
                const target =
                  state.selectedId ?? state.devices[0]?.id ?? null;
                if (target) void coleta.connect(target);
                else coleta.refreshDevices();
              }}
              busy={false}
              disabled={!state.devices.length && !state.selectedId}
            />
          ) : (
            <Btn
              label="Desconectar"
              variant="danger"
              onPress={() => {
                coleta.stop();
                void coleta.disconnect();
              }}
              disabled={state.status === 'connecting'}
            />
          )}
        </View>
      </Card>

      <Card title="Coleta de telemetria">
        <View style={styles.row}>
          <Pill text={running ? 'ATIVA' : 'parada'} tone={running ? 'ok' : 'muted'} />
          <Text style={styles.counters}>
            {state.cycles} ciclos · {state.sent} enviados
            {state.failed > 0 ? ` · ${state.failed} falhas` : ''}
          </Text>
        </View>

        <Field
          label="Intervalo entre ciclos (segundos)"
          keyboardType="number-pad"
          value={String(state.intervalSec)}
          onChangeText={(text) => coleta.setIntervalSec(Number(text))}
          editable={!running}
        />

        <View style={styles.btnRow}>
          {!running ? (
            <Btn
              label="Iniciar coleta"
              onPress={() => coleta.start()}
              disabled={state.status !== 'ready'}
            />
          ) : (
            <Btn label="Parar" variant="danger" onPress={() => coleta.stop()} />
          )}
        </View>

        <View style={styles.liveGrid}>
          {LIVE_FIELDS.map((field) => (
            <View key={field.pid} style={styles.liveCell}>
              <Text style={styles.liveValue}>
                {state.live[field.pid] !== undefined ? state.live[field.pid] : '—'}
              </Text>
              <Text style={styles.liveUnit}>{field.unit}</Text>
              <Text style={styles.liveLabel}>{field.label}</Text>
            </View>
          ))}
        </View>
      </Card>

      {state.lastError ? <Text style={styles.error}>{state.lastError}</Text> : null}
      {state.notice ? <Text style={styles.notice}>{state.notice}</Text> : null}
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
    marginBottom: spacing.md,
  },
  deviceName: { color: colors.text, fontSize: 14, flexShrink: 1, textAlign: 'right' },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  deviceList: { gap: spacing.xs, marginBottom: spacing.md },
  deviceItem: {
    color: colors.text,
    fontSize: 14,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  deviceItemSelected: { color: colors.accent, fontWeight: '600' },
  btnRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  counters: { color: colors.muted, fontSize: 13 },
  liveGrid: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  liveCell: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  liveValue: { color: colors.text, fontSize: 24, fontWeight: '700' },
  liveUnit: { color: colors.accent, fontSize: 12 },
  liveLabel: { color: colors.muted, fontSize: 11, marginTop: spacing.xs },
  error: { color: colors.bad, fontSize: 13, lineHeight: 19, marginTop: spacing.xs },
  notice: { color: colors.ok, fontSize: 13, lineHeight: 19, marginTop: spacing.xs },
});
