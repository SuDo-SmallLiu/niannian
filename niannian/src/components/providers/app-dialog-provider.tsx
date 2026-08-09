'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ConfirmOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

interface AlertOptions {
  title: string;
  description: string;
  confirmText?: string;
}

interface AppDialogContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: AlertOptions) => Promise<void>;
  showLoading: (title: string, description?: string) => void;
  hideLoading: () => void;
}

const AppDialogContext = createContext<AppDialogContextValue | null>(null);

export function AppDialogProvider({ children }: { children: React.ReactNode }) {
  const [confirmState, setConfirmState] = useState<
    (ConfirmOptions & { resolve: (v: boolean) => void }) | null
  >(null);
  const [alertState, setAlertState] = useState<
    (AlertOptions & { resolve: () => void }) | null
  >(null);
  const [loadingState, setLoadingState] = useState<{ title: string; description?: string } | null>(
    null
  );

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ ...options, resolve });
    });
  }, []);

  const alert = useCallback((options: AlertOptions) => {
    return new Promise<void>((resolve) => {
      setAlertState({ ...options, resolve });
    });
  }, []);

  const showLoading = useCallback((title: string, description?: string) => {
    setLoadingState({ title, description });
  }, []);

  const hideLoading = useCallback(() => {
    setLoadingState(null);
  }, []);

  return (
    <AppDialogContext.Provider value={{ confirm, alert, showLoading, hideLoading }}>
      {children}

      <AlertDialog
        open={!!confirmState}
        onOpenChange={(open) => {
          if (!open && confirmState) {
            confirmState.resolve(false);
            setConfirmState(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmState?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmState?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={(event) => {
                event.preventDefault();
                confirmState?.resolve(false);
                setConfirmState(null);
              }}
            >
              {confirmState?.cancelText || '取消'}
            </AlertDialogCancel>
            <AlertDialogAction
              className={confirmState?.destructive ? 'bg-destructive hover:bg-[#A03030]' : undefined}
              onClick={(event) => {
                event.preventDefault();
                confirmState?.resolve(true);
                setConfirmState(null);
              }}
            >
              {confirmState?.confirmText || '确定'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!alertState}
        onOpenChange={(open) => {
          if (!open && alertState) {
            alertState.resolve();
            setAlertState(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertState?.title}</AlertDialogTitle>
            <AlertDialogDescription>{alertState?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => {
                alertState?.resolve();
                setAlertState(null);
              }}
            >
              {alertState?.confirmText || '知道了'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!loadingState} onOpenChange={() => {}}>
        <DialogContent className="[&>button]:hidden" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader className="items-center text-center">
            <div className="w-12 h-12 border-3 border-[#E8DCC8] border-t-primary rounded-full animate-spin mb-2" />
            <DialogTitle>{loadingState?.title}</DialogTitle>
            {loadingState?.description && (
              <DialogDescription>{loadingState.description}</DialogDescription>
            )}
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </AppDialogContext.Provider>
  );
}

export function useAppDialog() {
  const ctx = useContext(AppDialogContext);
  if (!ctx) {
    throw new Error('useAppDialog must be used within AppDialogProvider');
  }
  return ctx;
}
