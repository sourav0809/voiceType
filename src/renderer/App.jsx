import React, { useEffect, useState } from 'react';
import Onboarding from './pages/Onboarding';
import Settings from './pages/Settings';
import RecordingOverlay from './components/RecordingOverlay';

const isOverlay = window.location.hash === '#overlay';

export default function App() {
  const [ready, setReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (isOverlay) { setReady(true); return; }
    window.voiceType.getSettings().then((s) => {
      setShowOnboarding(!s.onboardingComplete);
      setReady(true);
    });
  }, []);

  if (!ready) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-950">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isOverlay) return <RecordingOverlay />;
  if (showOnboarding) return <Onboarding onComplete={() => setShowOnboarding(false)} />;
  return <Settings />;
}
