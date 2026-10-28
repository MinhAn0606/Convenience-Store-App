import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api/store';
import { useAuth } from '../context/AuthContext';
import { Button, ErrorText, Loading, money, Page, Picture } from '../components/UI';
import { colors, styles as s } from '../theme';
export function ProductListScreen({ navigation }) {
  const [input, setInput] = useState(''), [search, setSearch] = useState(''), [categoryId, setCategory] = useState('');
  const [categories, setCategories] = useState([]), [data, setData] = useState(null), [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [revision, setRevision] = useState(0);
  useEffect(() => { api.categories().then((r) => setCategories(Array.isArray(r) ? r : r.items || [])).catch(() => {}); }, []);
  useFocusEffect(useCallback(() => {
    let active = true; setLoading(true); setError('');
    api.products({ q: search, categoryId, page, limit: 12 }).then((r) => { if (active) setData(r); }).catch((e) => { if (active) { setData(null); setError(e.message); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [search, categoryId, page, revision]));
  const apply = () => { setPage(1); setSearch(input.trim()); };
  return <View style={s.page}><FlatList data={data?.items || []} keyExtractor={(p) => p._id} contentContainerStyle={s.content} refreshing={loading} onRefresh={() => setRevision((n) => n + 1)}
    ListHeaderComponent={<View style={{ gap: 14 }}><Text style={s.title}>Cửa hàng tiện lợi</Text><Text style={s.muted}>Chọn món yêu thích. Ghé cửa hàng nhận ngay.</Text><TextInput accessibilityLabel="Tìm sản phẩm" style={s.input} placeholder="Tìm sản phẩm…" value={input} onChangeText={setInput} onSubmitEditing={apply} returnKeyType="search" /><Button title="Tìm kiếm" ghost onPress={apply} /><ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={s.row}>{[{ _id: '', name: 'Tất cả' }, ...categories].map((c) => <Pressable key={c._id} accessibilityRole="button" onPress={() => { setCategory(c._id); setPage(1); }}><Text style={[s.badge, categoryId !== c._id && { backgroundColor: 'white', color: colors.muted }]}>{c.name}</Text></Pressable>)}</View></ScrollView><ErrorText message={error} /></View>}
    renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={item.name} onPress={() => navigation.navigate('ProductDetail', { id: item._id })} style={s.card}><Picture uri={item.images?.[0]} /><Text style={s.subtitle}>{item.name}</Text><View style={s.between}><Text style={s.subtitle}>{money(item.price)}</Text><Text style={s.muted}>{item.stockQuantity > 0 ? `Còn ${item.stockQuantity}` : 'Hết hàng'}</Text></View></Pressable>}
    ListEmptyComponent={loading ? <ActivityIndicator color={colors.primary} /> : <Text style={s.muted}>{error ? 'Kéo xuống để thử lại.' : 'Không tìm thấy sản phẩm.'}</Text>}
    ListFooterComponent={<View style={s.between}><Button ghost title="Trước" disabled={page === 1 || loading} onPress={() => setPage(page - 1)} /><Text style={s.muted}>Trang {page}</Text><Button ghost title="Sau" disabled={!data || page * data.limit >= data.total || loading} onPress={() => setPage(page + 1)} /></View>} />
  </View>;
}
export function ProductDetailScreen({ navigation, route }) {
  const { user } = useAuth();
  const [product, setProduct] = useState(null), [error, setError] = useState(''), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  const load = useCallback(() => { setLoading(true); setError(''); api.product(route.params.id).then(setProduct).catch((e) => setError(e.message)).finally(() => setLoading(false)); }, [route.params.id]);
  useEffect(load, [load]);
  const add = async () => {
    if (!user) return navigation.navigate('Login');
    setBusy(true); setError(''); setNotice('');
    try { await api.addItem(product._id); setNotice('Đã thêm vào giỏ hàng.'); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  if (loading) return <Loading />;
  return <Page><ErrorText message={error} />{product ? <><Picture uri={product.images?.[0]} /><Text style={s.title}>{product.name}</Text><Text style={s.subtitle}>{money(product.price)} / {product.unit}</Text><Text style={s.muted}>{product.categoryId?.name} · Còn {product.stockQuantity}</Text><Text style={s.text}>{product.description || 'Chưa có mô tả sản phẩm.'}</Text>{notice ? <Text style={s.badge}>{notice}</Text> : null}<Button title="Thêm vào giỏ" disabled={product.stockQuantity < 1} busy={busy} onPress={add} /><Button ghost title="Xem giỏ hàng" onPress={() => navigation.navigate('Main', { screen: 'Cart' })} /></> : <Button title="Thử lại" onPress={load} />}</Page>;
}
