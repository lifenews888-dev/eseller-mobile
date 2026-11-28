import { useEffect } from 'react';
import { router } from 'expo-router';
import { OnboardingLanding, OnboardingConfig } from '../../src/components/OnboardingLanding';
import { useMalchnaasEnabled } from '../../src/config/remoteFlags';
import { C } from '../../src/shared/design';

const CONFIG: OnboardingConfig = {
  title:     'Малчин болох',
  subtitle:  'Малчнаас шууд — зуучлагчгүй зарна, 40-60% илүү орлого',
  color:     C.herder,
  icon:      'leaf-outline',
  steps: [
    { icon: 'phone-portrait-outline', title: 'Бүртгүүлэх',    desc: 'Утас + иргэний үнэмлэх — 2 минут' },
    { icon: 'document-text-outline',   title: 'А данс',         desc: 'МЭАЖГ-н бүртгэл baталгаажуулна' },
    { icon: 'camera-outline',          title: 'Бараа нэмэх',    desc: 'Зураг, тайлбар, үнэ оруулна' },
    { icon: 'card-outline',            title: 'Орлого авах',    desc: 'Худалдан авагч хүлээн авсны дараа (72 цагт) хэтэвчид орно' },
  ],
  stats: [
    { label: 'Комисс',   value: '10%' },
    { label: 'Орлого',   value: '+40%' },
    { label: 'Аймаг',    value: '21' },
  ],
  cta:      'Малчин болох',
  ctaRoute: '/register-herder',
};

export default function BecomeHerder() {
  const enabled = useMalchnaasEnabled();
  useEffect(() => {
    if (!enabled) router.replace('/become-seller' as never);
  }, [enabled]);
  if (!enabled) return null;
  return <OnboardingLanding config={CONFIG} />;
}
