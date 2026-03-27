'use client';

import { useState, useEffect } from 'react';
import { getRandomLoadingMessage } from '@/data/copy';

export default function AppLoader() {
  const [message] = useState(() => getRandomLoadingMessage());
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent" />
      <p className="text-sm text-text-secondary font-mono">
        {message}{dots}
      </p>
    </div>
  );
}
