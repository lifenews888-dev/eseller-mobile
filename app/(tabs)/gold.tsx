import { Redirect } from 'expo-router';

// Хэрэгжээгүй боломжуудыг (Gold гишүүнчлэл, дундын данс г.м.) амласан хуудсыг вэбтэй адил хаасан.
export default function ClosedPage() {
  return <Redirect href="/" />;
}
