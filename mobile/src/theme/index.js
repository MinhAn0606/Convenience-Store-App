import { StyleSheet } from 'react-native';
export const colors = { primary: '#14694c', accent: '#f4c95d', background: '#f6f8f5', text: '#18352b', muted: '#65776f', danger: '#b3261e', border: '#dce5de' };
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background }, content: { padding: 20, gap: 16, paddingBottom: 36 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text }, subtitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  text: { fontSize: 15, color: colors.text, lineHeight: 23 }, muted: { fontSize: 14, color: colors.muted, lineHeight: 21 },
  card: { backgroundColor: 'white', borderRadius: 18, padding: 16, gap: 10, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  input: { backgroundColor: 'white', borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, color: colors.text, fontSize: 16 },
  button: { backgroundColor: colors.primary, borderRadius: 12, padding: 15, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
  buttonText: { color: 'white', fontWeight: '700', fontSize: 15 }, ghost: { backgroundColor: '#e3eee8' }, ghostText: { color: colors.primary },
  error: { color: colors.danger, backgroundColor: '#ffedea', padding: 12, borderRadius: 10, lineHeight: 21 },
  image: { height: 180, width: '100%', borderRadius: 12, backgroundColor: '#edf2ed' }, thumb: { width: 70, height: 70, borderRadius: 10, backgroundColor: '#edf2ed' },
  badge: { color: colors.primary, fontWeight: '700', backgroundColor: '#e3eee8', padding: 8, borderRadius: 8, overflow: 'hidden' },
});
