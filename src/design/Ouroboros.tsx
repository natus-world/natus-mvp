import { useEffect, useState } from 'react';

const DELAY_MS = 300;

export function Ouroboros({ size = 96, delay = DELAY_MS }: { size?: number; delay?: number }) {
  const [shown, setShown] = useState(delay <= 0);

  useEffect(() => {
    if (delay <= 0) return;
    const timer = setTimeout(() => setShown(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <span aria-hidden="true" className="inline-flex shrink-0" style={{ width: size, height: size }}>
      {shown && (
        <img
          src={`${import.meta.env.BASE_URL}ouroboros.svg`}
          alt=""
          width={size}
          height={size}
          className="ouroboros size-full select-none"
          draggable={false}
        />
      )}
    </span>
  );
}
