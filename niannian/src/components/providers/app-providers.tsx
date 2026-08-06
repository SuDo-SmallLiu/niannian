'use client';

import { AppDialogProvider } from '@/components/providers/app-dialog-provider';

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return <AppDialogProvider>{children}</AppDialogProvider>;
}
