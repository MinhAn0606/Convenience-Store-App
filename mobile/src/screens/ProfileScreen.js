import React, { useCallback, useState } from 'react';
import { Alert, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api/store';
import { useAuth } from '../context/AuthContext';
import { AuthGate, Button, ErrorText, Field, Loading, Page } from '../components/UI';
import { styles as s } from '../theme';
function Profile() {
  const { user, updateUser, logout } = useAuth();
  const [name, setName] = useState(''), [phone, setPhone] = useState(''), [currentPassword, setCurrent] = useState(''), [newPassword, setNew] = useState('');
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const load = useCallback(async () => { setError(''); try { const p = await api.profile(); setName(p.fullName); setPhone(p.phone || ''); } catch (e) { setError(e.message); } finally { setLoading(false); } }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const perform = async (fn) => { if (busy) return; setBusy(true); setError(''); setNotice(''); try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  if (loading) return <Loading />;
  return <Page><Text style={s.title}>Tài khoản</Text><Text style={s.muted}>{user.email}</Text><ErrorText message={error} />{notice ? <Text style={s.badge}>{notice}</Text> : null}
    <Field label="Họ và tên" value={name} onChangeText={setName} maxLength={120} /><Field label="Số điện thoại" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
    <Button title="Lưu thông tin" busy={busy} onPress={() => perform(async () => { updateUser(await api.updateProfile({ fullName: name, phone })); setNotice('Đã lưu thông tin.'); })} />
    <Text style={s.subtitle}>Đổi mật khẩu</Text><Field label="Mật khẩu hiện tại" value={currentPassword} onChangeText={setCurrent} secureTextEntry autoCapitalize="none" /><Field label="Mật khẩu mới (từ 8 ký tự)" value={newPassword} onChangeText={setNew} secureTextEntry autoCapitalize="none" />
    <Button ghost title="Đổi mật khẩu" disabled={busy} onPress={() => perform(async () => { await api.password({ currentPassword, newPassword }); setCurrent(''); setNew(''); setNotice('Đã đổi mật khẩu.'); })} />
    <Button ghost title="Tải lại thông tin" disabled={busy} onPress={load} /><Button ghost title="Đăng xuất" disabled={busy} onPress={() => Alert.alert('Đăng xuất', 'Bạn muốn đăng xuất khỏi ứng dụng?', [{ text: 'Ở lại', style: 'cancel' }, { text: 'Đăng xuất', style: 'destructive', onPress: () => perform(logout) }])} />
  </Page>;
}
export default function ProfileScreen(props) { return <AuthGate navigation={props.navigation}><Profile /></AuthGate>; }
