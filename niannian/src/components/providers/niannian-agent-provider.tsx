'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AgentHintContext } from '@/lib/agent-hints';

type AgentOverride = Partial<
  Pick<
    AgentHintContext,
    | 'itemCompletion'
    | 'itemLabel'
    | 'completionAvg'
    | 'pendingCount'
    | 'analyzedCount'
    | 'photoCount'
    | 'storyCount'
    | 'movieCount'
  >
>;

interface NianNianAgentContextValue {
  override: AgentOverride;
  setOverride: (next: AgentOverride) => void;
  clearOverride: () => void;
}

const NianNianAgentContext = createContext<NianNianAgentContextValue | null>(null);

function overridesEqual(a: AgentOverride, b: AgentOverride): boolean {
  return (
    a.itemCompletion === b.itemCompletion &&
    a.itemLabel === b.itemLabel &&
    a.completionAvg === b.completionAvg &&
    a.pendingCount === b.pendingCount &&
    a.analyzedCount === b.analyzedCount &&
    a.photoCount === b.photoCount &&
    a.storyCount === b.storyCount &&
    a.movieCount === b.movieCount
  );
}

export function NianNianAgentProvider({ children }: { children: ReactNode }) {
  const [override, setOverrideState] = useState<AgentOverride>({});

  const setOverride = useCallback((next: AgentOverride) => {
    setOverrideState((prev) => (overridesEqual(prev, next) ? prev : next));
  }, []);

  const clearOverride = useCallback(() => {
    setOverrideState((prev) => (Object.keys(prev).length === 0 ? prev : {}));
  }, []);

  const value = useMemo(
    () => ({
      override,
      setOverride,
      clearOverride,
    }),
    [override, setOverride, clearOverride]
  );

  return (
    <NianNianAgentContext.Provider value={value}>{children}</NianNianAgentContext.Provider>
  );
}

export function useNianNianAgentOverride(next: AgentOverride) {
  const ctx = useContext(NianNianAgentContext);
  const setOverride = ctx?.setOverride;
  const clearOverride = ctx?.clearOverride;

  useEffect(() => {
    if (!setOverride || !clearOverride) return;
    setOverride(next);
    return () => clearOverride();
  }, [
    setOverride,
    clearOverride,
    next.itemCompletion,
    next.itemLabel,
    next.completionAvg,
    next.pendingCount,
    next.analyzedCount,
    next.photoCount,
    next.storyCount,
    next.movieCount,
  ]);
}

export function useNianNianAgentContext() {
  return useContext(NianNianAgentContext);
}
