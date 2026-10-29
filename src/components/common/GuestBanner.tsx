import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface GuestBannerProps {
  /** Custom message text (the part after 👋) */
  message?: string;
  /** Extra classes on the wrapper div, e.g. "mb-6" */
  className?: string;
}

/**
 * A top-of-page banner shown to guest users.
 * The Log In / Sign Up buttons navigate to the auth page.
 */
export function GuestBanner({ message, className = '' }: GuestBannerProps) {
  const navigate = useNavigate();
  const text = message ?? "Sign up to save your progress across devices.";

  return (
    <div className={`rounded-lg bg-primary/10 border border-primary/20 px-4 py-3 flex items-center justify-between gap-3 flex-wrap ${className}`}>
      <p className="text-sm text-primary font-medium">👋 {text}</p>
      <div className="flex gap-2 shrink-0">
        <Button size="sm" variant="outline" onClick={() => navigate('/auth', { state: { mode: 'login' } })}>
          Log in
        </Button>
        <Button size="sm" onClick={() => navigate('/auth', { state: { mode: 'signup' } })}>
          Sign up
        </Button>
      </div>
    </div>
  );
}
