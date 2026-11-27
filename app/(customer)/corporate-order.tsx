import { Redirect } from 'expo-router';

// Байгууллагын захиалгын API вэб дээр байхгүй тул нүүр хуудас руу шилжүүлнэ.
export default function CorporateOrderScreen() {
  return <Redirect href="/" />;
}
