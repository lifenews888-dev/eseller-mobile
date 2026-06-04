import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, F, R, UI } from '../shared/design';

const VALUE_CARDS = [
  {
    icon: 'storefront-outline' as const,
    title: 'Дэлгүүр эзэн',
    text: 'Бараагаа байршуулж зах зээлд хүргэнэ.',
    metric: '70-85%',
    color: C.store,
  },
  {
    icon: 'megaphone-outline' as const,
    title: 'Борлуулагч',
    text: 'Сүлжээгээрээ зарж комисс авна.',
    metric: '10-20%',
    color: C.seller,
  },
  {
    icon: 'cart-outline' as const,
    title: 'Худалдан авагч',
    text: 'Сайн бараа, найдвартай хүргэлт.',
    metric: '2-4 цаг',
    color: C.primary,
  },
  {
    icon: 'car-outline' as const,
    title: 'Жолооч',
    text: 'Цагаа тохируулж орлого олно.',
    metric: 'Хүргэлт бүрт',
    color: C.driver,
  },
];

export function AuthValueIntro() {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Борлуулалт хамтдаа л байдаг.</Text>
      <Text style={styles.subtitle}>
        Барааны эзэн, борлуулагч, худалдан авагч, хүргэлтийн баг нэг платформ дээр холбогдоно.
      </Text>

      <View style={styles.grid}>
        {VALUE_CARDS.map((card) => (
          <View key={card.title} style={styles.valueCard}>
            <View style={styles.valueHead}>
              <View style={[styles.iconBox, { backgroundColor: `${card.color}18` }]}>
                <Ionicons name={card.icon} size={15} color={card.color} />
              </View>
              <Text numberOfLines={1} style={styles.valueTitle}>
                {card.title}
              </Text>
            </View>
            <Text style={styles.valueText} numberOfLines={2}>
              {card.text}
            </Text>
            <Text style={[styles.metric, { color: card.color }]} numberOfLines={1}>
              {card.metric}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.bgCard,
    borderRadius: UI.cardRadius,
    padding: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: R.lg,
  },
  title: { ...F.h3, color: C.text },
  subtitle: { ...F.small, color: C.textSub, lineHeight: 20, marginTop: R.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: R.sm, marginTop: R.md },
  valueCard: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 140,
    backgroundColor: C.bgSection,
    borderRadius: UI.controlRadius,
    padding: R.md,
    borderWidth: 1,
    borderColor: C.border,
  },
  valueHead: { flexDirection: 'row', alignItems: 'center', gap: R.xs },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: R.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueTitle: { ...F.tiny, color: C.text, fontWeight: '900', flex: 1 },
  valueText: { ...F.tiny, color: C.textMuted, lineHeight: 15, marginTop: R.xs },
  metric: { ...F.tiny, fontWeight: '900', marginTop: R.xs },
});
