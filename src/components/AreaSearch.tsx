import React, { useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { searchAreas, SearchArea } from '../api/areaSearch';
import { colors, typography, spacing, borderRadius } from '../theme';

export function AreaSearch({ onSelect }: { onSelect: (area: SearchArea) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchArea[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const search = async () => {
    if (query.trim().length < 3) return;
    const id = ++requestId.current;
    setLoading(true); setError(null); setResults([]);
    try {
      const found = await searchAreas(query);
      if (id !== requestId.current) return;
      setResults(found);
      if (!found.length) setError('No areas found. Try a city or neighborhood name.');
    } catch (err) {
      if (id === requestId.current) setError(err instanceof Error ? err.message : 'Search failed. Try again.');
    } finally { if (id === requestId.current) setLoading(false); }
  };
  return <View style={styles.container}>
    <View style={styles.row}>
      <TextInput accessibilityLabel="City or neighborhood" placeholder="Or search a city / neighborhood" placeholderTextColor={colors.disabledGray}
        value={query} onChangeText={(text) => { setQuery(text); requestId.current += 1; setResults([]); setError(null); setLoading(false); }}
        onSubmitEditing={search} style={styles.input} />
      <TouchableOpacity accessibilityRole="button" onPress={search} disabled={loading || query.trim().length < 3} style={styles.button}>
        {loading ? <ActivityIndicator color={colors.background} /> : <Text style={styles.buttonText}>Search area</Text>}
      </TouchableOpacity>
    </View>
    {error ? <Text style={styles.error}>{error}</Text> : null}
    {results.map((area) => <TouchableOpacity key={area.id} accessibilityRole="button" style={styles.result}
      onPress={() => { onSelect(area); setResults([]); setQuery(area.label); }}><Text style={styles.text}>{area.label}</Text></TouchableOpacity>)}
  </View>;
}
const styles = StyleSheet.create({
  container: { gap: spacing.sm }, row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  input: { ...typography.body, minWidth: 180, flex: 1, padding: spacing.md, borderWidth: 1, borderColor: colors.disabledGray, borderRadius: borderRadius.sm, color: colors.text },
  button: { padding: spacing.md, backgroundColor: colors.accent, borderRadius: borderRadius.sm, justifyContent: 'center' },
  buttonText: { ...typography.bodySemibold, color: colors.background },
  result: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.disabledGray },
  text: { ...typography.body, color: colors.text }, error: { ...typography.bodySmall, color: colors.errorRed },
});
