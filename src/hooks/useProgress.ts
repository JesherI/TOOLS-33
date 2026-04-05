import { useState, useEffect, useCallback } from "react";

interface UseProgressOptions {
  incrementMin?: number;
  incrementMax?: number;
  interval?: number;
  autoStart?: boolean;
  maxValue?: number;
}

interface UseProgressReturn {
  progress: number;
  isComplete: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
  setProgress: (value: number) => void;
}

export function useProgress(options: UseProgressOptions = {}): UseProgressReturn {
  const {
    incrementMin = 0.5,
    incrementMax = 2,
    interval = 50,
    autoStart = true,
    maxValue = 100,
  } = options;

  const [progress, setProgressState] = useState(0);
  const [isRunning, setIsRunning] = useState(autoStart);

  useEffect(() => {
    if (!isRunning || progress >= maxValue) return;

    const timer = setInterval(() => {
      setProgressState((prev) => {
        const increment = Math.random() * (incrementMax - incrementMin) + incrementMin;
        const newValue = prev + increment;
        return newValue >= maxValue ? maxValue : newValue;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isRunning, progress, interval, incrementMin, incrementMax, maxValue]);

  const start = useCallback(() => setIsRunning(true), []);
  const stop = useCallback(() => setIsRunning(false), []);
  const reset = useCallback(() => {
    setProgressState(0);
    setIsRunning(autoStart);
  }, [autoStart]);
  const setProgress = useCallback((value: number) => {
    setProgressState(Math.min(Math.max(value, 0), maxValue));
  }, [maxValue]);

  return {
    progress,
    isComplete: progress >= maxValue,
    start,
    stop,
    reset,
    setProgress,
  };
}
