import { useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F, R, UI } from '../src/shared/design';

const SLIDES = [
  {
    icon: 'storefront' as const,
    color: C.brand,
    title: 'Монголын нэгдсэн зах зээл',
    desc: 'Бараа, дэлгүүр, зар, хүргэлт нэг дор. Хурдан хайж, найдвартай худалдан авалт хийнэ.',
    bg: C.brandDim,
  },
  {
    icon: 'people' as const,
    color: C.primary,
    title: 'Нэг аккаунт, олон үүрэг',
    desc: 'Худалдан авагч, дэлгүүр эзэн, борлуулагч, жолооч нэг апп дотроо уялдан ажиллана.',
    bg: C.primaryDim,
  },
  {
    icon: 'shield-checkmark' as const,
    color: C.secondary,
    title: 'Ил тод төлбөр ба захиалга',
    desc: 'Захиалгын төлөв, төлбөр, хүргэлтийн мэдээлэл ойлгомжтой, нэг стандарт урсгалтай.',
    bg: C.secondaryDim,
  },
  {
    icon: 'car' as const,
    color: C.driver,
    title: 'Хүргэлтээ хянахад амар',
    desc: 'Хот доторх хүргэлт, жолоочийн урсгал, худалдан авагчийн мэдээлэл нэг системд харагдана.',
    bg: `${C.driver}14`,
  },
];

export default function Onboarding() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [idx, setIdx] = useState(0);

  const finish = async () => {
    await AsyncStorage.setItem('onboarded', 'true');
    router.replace('/login');
  };

  const next = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (idx < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (idx + 1) * width, animated: true });
      setIdx((value) => value + 1);
      return;
    }
    await finish();
  };

  const skip = async () => {
    await finish();
  };

  const active = SLIDES[idx];

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top + R.sm, R.lg) }]}>
        <Text style={styles.logo}>
          eseller<Text style={{ color: C.brand }}>.mn</Text>
        </Text>
        {idx < SLIDES.length - 1 ? (
          <TouchableOpacity activeOpacity={0.86} onPress={skip} style={styles.skipButton}>
            <Text style={styles.skipText}>Алгасах</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={styles.slider}
      >
        {SLIDES.map((slide) => (
          <View key={slide.title} style={[styles.slide, { width, backgroundColor: slide.bg }]}>
            <View style={[styles.iconWrap, { backgroundColor: `${slide.color}18`, borderColor: `${slide.color}33` }]}>
              <Ionicons name={slide.icon} size={52} color={slide.color} />
            </View>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.desc}>{slide.desc}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + R.lg, R.xxl) }]}>
        <View style={styles.dots}>
          {SLIDES.map((slide, i) => (
            <View
              key={slide.title}
              style={[
                styles.dot,
                {
                  width: i === idx ? 26 : 8,
                  backgroundColor: i === idx ? active.color : C.border2,
                },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          activeOpacity={0.86}
          onPress={next}
          style={[styles.primaryButton, { backgroundColor: active.color }]}
        >
          <Text style={styles.primaryText}>
            {idx === SLIDES.length - 1 ? 'Эхлэх' : 'Үргэлжлүүлэх'}
          </Text>
          <Ionicons name="arrow-forward" size={18} color={C.bgCard} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  topBar: {
    minHeight: UI.headerMinHeight - 28,
    paddingHorizontal: UI.screenPad,
    paddingBottom: R.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  logo: { fontSize: 24, fontWeight: '900', color: C.text, letterSpacing: 0 },
  skipButton: {
    minHeight: 38,
    paddingHorizontal: R.md,
    borderRadius: UI.controlRadius,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bgSection,
  },
  skipText: { ...F.small, color: C.textSub, fontWeight: '900' },
  slider: { flex: 1 },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: R.xxl,
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: R.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: R.xxxl,
    borderWidth: 2,
  },
  title: { ...F.h1, color: C.text, textAlign: 'center', lineHeight: 34, marginBottom: R.md },
  desc: { ...F.body, color: C.textSub, textAlign: 'center', lineHeight: 24, maxWidth: 360 },
  footer: {
    paddingHorizontal: UI.screenPad,
    paddingTop: R.lg,
    gap: R.lg,
    backgroundColor: C.bgCard,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: R.sm },
  dot: { height: 8, borderRadius: R.full },
  primaryButton: {
    minHeight: 50,
    borderRadius: UI.controlRadius,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: R.xs,
  },
  primaryText: { ...F.body, color: C.bgCard, fontWeight: '900' },
});
