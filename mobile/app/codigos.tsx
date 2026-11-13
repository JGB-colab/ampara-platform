import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { coleta, useColeta } from '../lib/coleta';
import { colors, spacing } from '../lib/theme';
import { DTC_LABELS } from '../lib/trend';
import { Btn, Card, Pill } from '../lib/ui';

export default function CodigosScreen() {
  const state = useColeta();
  const connected = state.status === 'ready' || state.status === 'running';
  const busy = state.dtcBusy;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card title="Códigos de falha (DTC)">
        <Text style={styles.help}>
          Lê os códigos armazenados no veículo (modo OBD-II 03) e envia cada um para a API como uma
          leitura com unidade `dtc`. A ignição precisa estar ligada e a coleta parada.
        </Text>
        <View style={styles.row}>
          <Pill
            text={connected ? (state.status === 'running' ? 'coleta ativa' : 'conectado') : 'desconectado'}
            tone={connected ? (state.status === 'running' ? 'warn' : 'ok') : 'muted'}
          />
          <Btn
            label={busy ? 'Lendo…' : 'Ler códigos'}
            onPress={() => void coleta.readDtcs()}
            busy={busy}
            disabled={!connected || state.status === 'running'}
          />
        </View>
      </Card>

      <Card title={`Códigos lidos (${state.dtcs.length})`}>
        {state.dtcs.length === 0 ? (
          <Text style={styles.empty}>
            Nenhum código lido nesta sessão. Conecte ao dongle e toque em “Ler códigos”.
          </Text>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {state.dtcs.map((code) => (
              <View key={code} style={styles.dtcRow}>
                <Text style={styles.dtcCode}>{code}</Text>
                <Text style={styles.dtcLabel}>
                  {DTC_LABELS[code] ?? 'Descrição não disponível (código de fabricante ou genérico)'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      {state.lastError ? <Text style={styles.error}>{state.lastError}</Text> : null}
      {state.notice ? <Text style={styles.notice}>{state.notice}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  help: { color: colors.muted, fontSize: 13, lineHeight: 19, marginBottom: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  empty: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  dtcRow: {
    backgroundColor: colors.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 2,
  },
  dtcCode: { color: colors.bad, fontSize: 16, fontWeight: '700', fontFamily: 'monospace' },
  dtcLabel: { color: colors.text, fontSize: 13, lineHeight: 18 },
  error: { color: colors.bad, fontSize: 13, lineHeight: 19, marginTop: spacing.xs },
  notice: { color: colors.ok, fontSize: 13, lineHeight: 19, marginTop: spacing.xs },
});
