'use client';

import { Suspense } from 'react';
import GlobalNianNianAgent from '@/components/GlobalNianNianAgent';
import { AppDialogProvider } from '@/components/providers/app-dialog-provider';
import { AppreciateModeProvider } from '@/components/providers/appreciate-mode-provider';
import { AuthProvider } from '@/components/providers/auth-provider';
import { NianNianAgentProvider } from '@/components/providers/niannian-agent-provider';

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppDialogProvider>
        <Suspense fallback={null}>
          <AppreciateModeProvider>
            <NianNianAgentProvider>
              {children}
              <GlobalNianNianAgent />
            </NianNianAgentProvider>
          </AppreciateModeProvider>
        </Suspense>
      </AppDialogProvider>
    </AuthProvider>
  );
}
