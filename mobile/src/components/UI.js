import React from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { styles as s, colors } from '../theme';
import { useAuth } from '../context/AuthContext';
export function Button({ title, onPress, busy, disabled, ghost, style }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} disabled={disabled || busy} onPress={onPress} style={[s.button, ghost && s.ghost, (disabled || busy) && { opacity: 0.5 }, style]}>{busy ? <ActivityIndicator color={ghost ? colors.primary : 'white'} /> : <Text style={[s.buttonText, ghost && s.ghostText]}>{title}</Text>}</Pressable>;
}
export function Field({ label, ...props }) { return <View style={{ gap: 6 }}><Text style={s.muted}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor={colors.muted} style={s.input} {...props} /></View>; }
export const ErrorText = ({ message }) => message ? <Text accessibilityRole="alert" style={s.error}>{message}</Text> : null;
export const Loading = () => <View style={[s.page, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
export function Page({ children, ...props }) { return <KeyboardAvoidingView style={s.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" {...props}>{children}</ScrollView></KeyboardAvoidingView>; }
export function Picture({ uri, small }) { return uri ? <Image source={{ uri }} resizeMode="contain" style={small ? s.thumb : s.image} /> : <View style={[small ? s.thumb : s.image, { justifyContent: 'center', alignItems: 'center' }]}><Text style={s.muted}>Chưa có ảnh</Text></View>; }
export function AuthGate({ navigation, children }) {
  const { user } = useAuth();
  return user ? children : <Page><Text style={s.title}>Chào bạn!</Text><Text style={s.text}>Đăng nhập để quản lý giỏ hàng, đơn hàng và tài khoản.</Text><Button title="Đăng nhập" onPress={() => navigation.navigate('Login')} /><Button ghost title="Tạo tài khoản" onPress={() => navigation.navigate('Register')} /></Page>;
}
export const money = (value) => `${new Intl.NumberFormat('vi-VN').format(value || 0)} ₫`;
export const statusLabel = (status) => ({ pending_payment: 'Chờ thanh toán', confirmed: 'Đã xác nhận', preparing: 'Đang chuẩn bị', ready_for_pickup: 'Sẵn sàng nhận hàng', completed: 'Đã nhận hàng', failed: 'Không thành công' }[status] || status);
