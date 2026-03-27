'use client';

import { useState, useEffect } from 'react';
import { useOSStore } from '@/store/osStore';
import Desktop from '@/components/os/Desktop';
import WindowManager from '@/components/os/WindowManager';
import DesktopIcons from '@/components/os/DesktopIcons';
import BootSequence from '@/components/os/BootSequence';
import NotificationCenter from '@/components/os/NotificationCenter';
import { DesktopWidgets } from '@/components/widgets/DesktopWidgets';

export default function Home() {
  const isBooted = useOSStore(state => state.isBooted);
  const setBooted = useOSStore(state => state.setBooted);
  // Track whether we've mounted (to avoid SSR/client mismatch)
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // If already booted this session, skip the sequence
    if (sessionStorage.getItem('devos-booted') === '1') {
      setBooted();
    }
  }, [setBooted]);

  // On boot completion, persist to sessionStorage
  useEffect(() => {
    if (isBooted) {
      sessionStorage.setItem('devos-booted', '1');
    }
  }, [isBooted]);

  // Before mounting, render nothing (avoids hydration flash)
  if (!mounted) return null;

  return (
    <>
      {!isBooted && <BootSequence />}

      {isBooted && (
        <Desktop>
          <WindowManager />
          <DesktopIcons />
          <NotificationCenter />
          <DesktopWidgets />
        </Desktop>
      )}
    </>
  );
}
