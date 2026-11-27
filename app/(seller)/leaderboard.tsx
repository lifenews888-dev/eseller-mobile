import { Redirect } from 'expo-router';

// Топ жагсаалтын API вэб дээр байхгүй тул орлогын хуудас руу шилжүүлнэ.
export default function SellerLeaderboardScreen() {
  return <Redirect href={'/seller/earnings' as never} />;
}
