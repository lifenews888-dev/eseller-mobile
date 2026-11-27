import React from 'react'
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { C, R, UI } from '../../src/shared/design'
import { AppHeader, AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI'

type IconName = keyof typeof Ionicons.glyphMap

type NotificationItem = {
  id: string
  icon: IconName
  color: string
  title: string
  body: string
  time: string
}

const MOCK_NOTIFS: NotificationItem[] = [
  {
    id: '1',
    icon: 'checkmark-circle',
    color: C.success,
    title: 'Захиалга баталгаажлаа',
    body: '#ORD-1234 захиалга хүлээн авагдлаа',
    time: '5 мин өмнө',
  },
  {
    id: '2',
    icon: 'car',
    color: C.primary,
    title: 'Хүргэлт эхэллээ',
    body: 'Таны захиалга замдаа байна',
    time: '1 цаг өмнө',
  },
  {
    id: '3',
    icon: 'pricetag',
    color: C.brand,
    title: 'Хямдрал эхэллээ!',
    body: '50% хүртэл хямдрал авах боломжтой',
    time: '2 цаг өмнө',
  },
]

export default function NotificationsScreen() {
  const layout = useAppLayoutMetrics()

  return (
    <View style={styles.container}>
      <FlatList
        data={MOCK_NOTIFS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingTop: layout.screenTop, paddingBottom: layout.screenBottom }]}
        ListHeaderComponent={
          <>
            <AppTopBar eyebrow="Профайл" title="Мэдэгдэл" showBack={false} />
            <AppHeader
              title="Мэдэгдэл"
              subtitle="Захиалга, хүргэлт, урамшууллын шинэчлэл"
              icon="notifications-outline"
              accent={C.primary}
            />
          </>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.84}
            accessibilityRole="button"
            accessibilityLabel={`${item.title}. ${item.body}. ${item.time}`}
            style={styles.item}
          >
            <View style={[styles.icon, { backgroundColor: item.color + '18' }]}>
              <Ionicons name={item.icon} size={22} color={item.color} />
            </View>
            <View style={styles.content}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemBody}>{item.body}</Text>
              <Text style={styles.itemTime}>{item.time}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  listContent: { padding: R.lg, gap: R.sm },
  item: {
    flexDirection: 'row',
    backgroundColor: C.bgCard,
    padding: 14,
    borderRadius: R.lg,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: C.border,
    minHeight: 74,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: R.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: '800', color: C.text },
  itemBody: { fontSize: 13, color: C.textSub, marginTop: 2 },
  itemTime: { fontSize: 11, color: C.textMuted, marginTop: 4, fontWeight: '700' },
})
