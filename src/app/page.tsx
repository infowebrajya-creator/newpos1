import { redirect } from 'next/navigation';
import { getServerCurrentUser } from '@/services/auth/serverAuthService';

export default async function RootPage() {
  const user = await getServerCurrentUser();

  if (user) {
    redirect('/pos');
  } else {
    redirect('/login');
  }
}
