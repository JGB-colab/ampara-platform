import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { coleta, useColeta } from '../lib/coleta';
import { colors, spacing } from '../lib/theme';
import { Btn, Card, Field } from '../lib/ui';

export default function ConfigScreen() {
  const state = useColeta();
  const [baseUrl, setBaseUrl] = useState(state.config.baseUrl);
  const [token, setToken] = useState(state.config.token);
  const [vehicleId, setVehicleId] = useState(state.config.vehicleId);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await coleta.saveAppConfig({ baseUrl: baseUrl.trim(), token: token.trim(), vehicleId: vehicleId.trim() });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Card title="API">
        <Field
          label="URL da API"
          value={baseUrl}
          onChangeText={setBaseUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="https://ampara-platform.onrender.com"
        />
        <Field
          label="Token do dispositivo (X-Device-Token)"
          value={token}
          onChangeText={setToken}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          placeholder="cole o token aqui"
        />
        <Field
          label="Veículo (vehicle_id)"
          value={vehicleId}
          onChangeText={setVehicleId}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="classic"
        />
        <Text style={styles.help}>
          Estes valores ficam gravados apenas neste aparelho (AsyncStorage) e nunca são enviados ao
          repositório.
        </Text>
        <View style={styles.btnRow}>
          <Btn label="Salvar" onPress={() => void save()} busy={saving} />
          <Btn label="Testar API" variant="secondary" onPress={() => void coleta.testApi()} />
        </View>
      </Card>

      <Card title="Status">
        <Text style={styles.statusLine}>
          Conexão: <Text style={styles.statusValue}>{state.status}</Text>
        </Text>
        <Text style={styles.statusLine}>
          Veículo: <Text style={styles.statusValue}>{state.config.vehicleId}</Text>
        </Text>
        <Text style={styles.statusLine}>
          Token: <Text style={styles.statusValue}>{state.config.token ? 'configurado' : 'não configurado'}</Text>
        </Text>
      </Card>

      {state.lastError ? <Text style={styles.error}>{state.lastError}</Text> : null}
      {state.notice ? <Text style={styles.notice}>{state.notice}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  help: { color: colors.muted, fontSize: 12, lineHeight: 17, marginBottom: spacing.md },
  btnRow: { flexDirection: 'row', gap: spacing.sm },
  statusLine: { color: colors.muted, fontSize: 14, marginBottom: spacing.xs },
  statusValue: { color: colors.text, fontWeight: '600' },
  error: { color: colors.bad, fontSize: 13, lineHeight: 19, marginTop: spacing.xs },
  notice: { color: colors.ok, fontSize: 13, lineHeight: 19, marginTop: spacing.xs },
});
