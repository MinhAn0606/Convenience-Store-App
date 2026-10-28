import React, { useState } from 'react';
import { Text } from 'react-native';
import { Button, ErrorText, Field, Page } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { styles as s } from '../theme';
export function AuthScreen({ navigation, register = false }) {
  const auth = useAuth();
  const [fullName, setName] = useState(''), [email, setEmail] = useState(''), [phone, setPhone] = useState('');
  const [password, setPassword] = useState(''), [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const submit = async () => {
    if (busy) return;
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Vui lòng nhập email hợp lệ.');
    if (register && (!fullName.trim() || password.length < 8 || password !== confirmation)) return setError('Nhập họ tên, mật khẩu từ 8 ký tự và xác nhận mật khẩu trùng khớp.');
    setBusy(true); setError('');
    try { await auth[register ? 'register' : 'login']({ fullName: fullName.trim(), email: email.trim().toLowerCase(), password, phone }); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return <Page><Text style={s.title}>{register ? 'Tạo tài khoản' : 'Chào mừng trở lại'}</Text><Text style={s.muted}>Mua sắm tiện lợi, nhận hàng tại cửa hàng.</Text>
    {register && <Field label="Họ và tên" value={fullName} onChangeText={setName} autoComplete="name" />}
    <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
    {register && <Field label="Số điện thoại (không bắt buộc)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />}
    <Field label="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete={register ? 'new-password' : 'current-password'} />
    {register && <Field label="Nhập lại mật khẩu" value={confirmation} onChangeText={setConfirmation} secureTextEntry autoCapitalize="none" />}
    <ErrorText message={error} /><Button title={register ? 'Đăng ký' : 'Đăng nhập'} busy={busy} onPress={submit} />
    <Button ghost title={register ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'} onPress={() => navigation.replace(register ? 'Login' : 'Register')} />
  </Page>;
}
export const LoginScreen = (props) => <AuthScreen {...props} />;
export const RegisterScreen = (props) => <AuthScreen {...props} register />;
