'use client';

import { createContext, useContext } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const AppreciateContext = createContext(false);

export function AppreciateModeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const appreciate =
    pathname.startsWith('/appreciate') || searchParams.get('appreciate') === '1';

  return (
    <AppreciateContext.Provider value={appreciate}>{children}</AppreciateContext.Provider>
  );
}

export function useAppreciateMode() {
  return useContext(AppreciateContext);
}
