import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { api } from '../api/store';
import { Button, ErrorText, Field, Loading, money, Page } from '../components/UI';
import { styles as s } from '../theme';
export default function CheckoutScreen({ navigation }) {
  const [summary, setSummary] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [method, setMethod] = useState('cash'), [code, setCode] = useState(''), [appliedCode, setApplied] = useState(''), [note, setNote] = useState(''), [busy, setBusy] = useState(false);
  const key = useRef(Crypto.randomUUID()), submitting = useRef(false);
  const preview = useCallback(async (discountCode = '') => {
    setLoading(true); setError('');
    try { setSummary(await api.preview(discountCode)); setApplied(discountCode); } catch (e) { setError(e.message); setSummary(null); } finally { setLoading(false); }
  }, []);
  useEffect(() => { preview(); }, [preview]);
  const submit = async () => {
    if (submitting.current || !summary?.canCheckout) return;
    submitting.current = true; setBusy(true); setError('');
    try {
      const result = await api.checkout({ paymentMethod: method, discountCode: appliedCode || undefined, customerNote: note, expectedTotal: summary.totalAmount }, key.current);
      navigation.replace('OrderDetail', { id: result.order._id, startPayment: method !== 'cash' });
    } catch (e) {
      // Unknown outcome: retain key so a retry returns the same order.
      if (e.status && e.status < 500) {
        key.current = Crypto.randomUUID();
        if (e.data?.summary) setSummary(e.data.summary);
        else await preview(appliedCode);
      }
      setError(e.message);
    } finally { submitting.current = false; setBusy(false); }
  };
  if (loading && !summary) return <Loading />;
  return <Page><Text style={s.title}>Xác nhận đơn hàng</Text><ErrorText message={error} />{!summary ? <Button title="Thử lại" onPress={() => preview(appliedCode)} /> : <>
    <View style={s.card}><Text style={s.subtitle}>Nhận tại cửa hàng</Text><Text style={s.text}>{summary.store?.name || 'Convenience Store'}</Text><Text style={s.muted}>{summary.store?.address || 'Liên hệ cửa hàng để nhận hàng.'}</Text></View>
    <View style={s.card}>{summary.items.map((item) => <View key={item.productId} style={s.between}><Text style={[s.text, { flex: 1 }]}>{item.name} × {item.quantity}</Text><Text style={s.text}>{money(item.lineTotal)}</Text></View>)}</View>
    <Field label="Mã giảm giá" value={code} onChangeText={setCode} autoCapitalize="characters" editable={!busy} /><Button title="Áp dụng mã / cập nhật giá" ghost disabled={busy} busy={loading} onPress={() => { key.current = Crypto.randomUUID(); preview(code.trim().toUpperCase()); }} />
    <ErrorText message={summary.discountError} />{summary.issues.map((i, n) => <ErrorText key={n} message={`${i.name}: không đủ hàng hoặc đã ngừng bán.`} />)}
    <View style={s.card}><Text style={s.text}>Tạm tính: {money(summary.subtotal)}</Text><Text style={s.text}>Khuyến mãi: −{money(summary.promotionDiscount)}</Text>{summary.discountCode && <Text style={s.text}>Mã giảm giá: −{money(summary.discountCode.amount)}</Text>}<Text style={s.subtitle}>Tổng thanh toán: {money(summary.totalAmount)}</Text></View>
    <Text style={s.subtitle}>Phương thức thanh toán</Text>{[['cash', 'Tiền mặt khi nhận hàng'], ['vnpay', 'VNPay'], ['momo', 'Ví MoMo']].map(([value, label]) => <Button key={value} title={`${method === value ? '● ' : '○ '}${label}`} ghost={method !== value} disabled={busy} onPress={() => { setMethod(value); key.current = Crypto.randomUUID(); }} />)}
    <Field label="Ghi chú cho cửa hàng" value={note} onChangeText={setNote} maxLength={500} multiline editable={!busy} /><Button title="Đặt hàng" busy={busy} disabled={loading || !summary.canCheckout} onPress={submit} />
  </>}</Page>;
}
