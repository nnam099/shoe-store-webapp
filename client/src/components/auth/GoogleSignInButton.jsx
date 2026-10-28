import { useEffect, useRef } from 'react';

export default function GoogleSignInButton({ onCredential, disabled = false, text = 'continue_with' }) {
  const containerRef = useRef(null);
  const callbackRef = useRef(onCredential);

  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    let cancelled = false;
    let timer;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return undefined;
    const initialize = () => {
      if (cancelled) return;
      if (!window.google?.accounts?.id) {
        timer = window.setTimeout(initialize, 100);
        return;
      }
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => callbackRef.current?.(response.credential),
      });
      if (containerRef.current) {
        containerRef.current.replaceChildren();
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard', theme: 'outline', size: 'large', width: 320, text,
        });
      }
    };
    initialize();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [text]);

  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
    return <p className="text-xs text-[#737373]">Google Login chưa được cấu hình.</p>;
  }
  return <div className={`max-w-full overflow-hidden ${disabled ? 'pointer-events-none opacity-60' : ''}`} ref={containerRef} aria-disabled={disabled} />;
}
