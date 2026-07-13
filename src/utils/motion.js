import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// First reduced-motion consumer in the app — wraps the standard React
// Native API (react-native-web shims this via the `prefers-reduced-motion`
// media query on web) so any game can adopt the same hook later unchanged.
// Callers should SHORTEN animation durations when this is true, not skip
// them outright — the one exception is perpetual/looping ambient
// decoration (e.g. AmbientClouds), where "shorten" doesn't map cleanly and
// rendering statically is the better fit.
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduced(value);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, []);

  return reduced;
}
