'use client';

import { useEffect, useState } from 'react';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  delay?: number;
  onComplete?: () => void;
  className?: string;
}

export default function TypewriterText({
  text,
  speed = 36,
  delay = 0,
  onComplete,
  className = '',
}: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    let index = 0;
    let interval: ReturnType<typeof setInterval> | undefined;

    const startTimer = setTimeout(() => {
      interval = setInterval(() => {
        index += 1;
        setDisplayed(text.slice(0, index));
        if (index >= text.length) {
          if (interval) clearInterval(interval);
          setDone(true);
          onComplete?.();
        }
      }, speed);
    }, delay);

    return () => {
      clearTimeout(startTimer);
      if (interval) clearInterval(interval);
    };
  }, [text, speed, delay, onComplete]);

  return (
    <span className={className}>
      {displayed}
      {!done && <span className="inline-block w-0.5 h-[1em] bg-[#D98A45] ml-0.5 align-middle animate-pulse" />}
    </span>
  );
}
