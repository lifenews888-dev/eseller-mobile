import { useState } from 'react';
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, F, R, UI } from '../design';
import { AppButton } from './AppUI';

interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: any) => void;
  type: 'store' | 'feed';
}

const DISTRICTS = ['СБД', 'ХУД', 'БЗД', 'ЧД', 'БГД', 'СХД', 'НД', 'БНД'];

const SORT_OPTIONS = [
  { key: 'newest', label: 'Шинэ эхэнд' },
  { key: 'price_asc', label: 'Үнэ: багаас их' },
  { key: 'price_desc', label: 'Үнэ: ихээс бага' },
  { key: 'popular', label: 'Эрэлттэй' },
];

export function FilterSheet({ visible, onClose, onApply, type }: FilterSheetProps) {
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [district, setDistrict] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const handleApply = () => {
    onApply({
      minPrice: minPrice ? parseInt(minPrice, 10) : undefined,
      maxPrice: maxPrice ? parseInt(maxPrice, 10) : undefined,
      district: district || undefined,
      sortBy,
    });
    onClose();
  };

  const handleReset = () => {
    setMinPrice('');
    setMaxPrice('');
    setDistrict('');
    setSortBy('newest');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        style={{ flex: 1, backgroundColor: C.text + '73' }}
        onPress={onClose}
      />

      <View
        style={{
          backgroundColor: C.bgCard,
          borderTopLeftRadius: R.xxl,
          borderTopRightRadius: R.xxl,
          maxHeight: '82%',
          borderTopWidth: 1,
          borderTopColor: C.border,
        }}
      >
        <View style={{ alignItems: 'center', paddingTop: R.md, paddingBottom: R.xs }}>
          <View style={{ width: 40, height: 4, borderRadius: R.full, backgroundColor: C.border2 }} />
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: R.xl,
            paddingVertical: R.md,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
          }}
        >
          <Text style={{ ...F.h3, color: C.text }}>Шүүлтүүр</Text>
          <TouchableOpacity activeOpacity={0.82} onPress={handleReset}>
            <Text style={{ ...F.small, color: C.brand, fontWeight: '800' }}>Цэвэрлэх</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: R.xl, paddingBottom: R.md }}>
          <Text style={{ ...F.h4, color: C.text, marginBottom: R.md }}>Үнийн муж (₮)</Text>
          <View style={{ flexDirection: 'row', gap: R.sm, marginBottom: R.xxl }}>
            <TextInput
              value={minPrice}
              onChangeText={setMinPrice}
              placeholder="Доод үнэ"
              placeholderTextColor={C.textMuted}
              keyboardType="number-pad"
              style={inputStyle}
            />
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: C.textMuted }}>-</Text>
            </View>
            <TextInput
              value={maxPrice}
              onChangeText={setMaxPrice}
              placeholder="Дээд үнэ"
              placeholderTextColor={C.textMuted}
              keyboardType="number-pad"
              style={inputStyle}
            />
          </View>

          {type === 'feed' ? (
            <>
              <Text style={{ ...F.h4, color: C.text, marginBottom: R.md }}>Байршил</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: R.sm, marginBottom: R.xxl }}>
                {DISTRICTS.map((item) => {
                  const active = district === item;
                  return (
                    <TouchableOpacity
                      key={item}
                      activeOpacity={0.84}
                      onPress={() => setDistrict(active ? '' : item)}
                      style={{
                        paddingHorizontal: R.md,
                        paddingVertical: R.sm,
                        borderRadius: R.full,
                        backgroundColor: active ? C.brand : C.bgSection,
                        borderWidth: 1,
                        borderColor: active ? C.brand : C.border,
                      }}
                    >
                      <Text style={{ ...F.small, color: active ? C.bgCard : C.textSub, fontWeight: '700' }}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          ) : null}

          <Text style={{ ...F.h4, color: C.text, marginBottom: R.md }}>Эрэмбэлэх</Text>
          <View style={{ gap: R.sm }}>
            {SORT_OPTIONS.map((option) => {
              const active = sortBy === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  activeOpacity={0.84}
                  onPress={() => setSortBy(option.key)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: active ? C.brandDim : C.bgSection,
                    borderRadius: UI.controlRadius,
                    padding: R.md,
                    borderWidth: 1,
                    borderColor: active ? C.brand : C.border,
                  }}
                >
                  <Text style={{ ...F.small, color: active ? C.text : C.textSub, fontWeight: active ? '800' : '500' }}>
                    {option.label}
                  </Text>
                  {active ? <Ionicons name="checkmark-circle" size={18} color={C.brand} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <View style={{ padding: R.lg, paddingBottom: 36, borderTopWidth: 1, borderTopColor: C.border }}>
          <AppButton label="Хэрэглэх" icon="checkmark" onPress={handleApply} />
        </View>
      </View>
    </Modal>
  );
}

const inputStyle = {
  flex: 1,
  backgroundColor: C.bgSection,
  borderRadius: UI.controlRadius,
  padding: R.md,
  color: C.text,
  borderWidth: 1,
  borderColor: C.border,
};
