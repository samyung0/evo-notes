/**
 * Feature flags — a single switchboard for work that isn't ready to ship.
 * Flip a flag to `true` to re-enable its nav entry and routes everywhere.
 *
 * Optionally overridable at build time via Vite env, e.g.
 * `VITE_FEATURE_EXPLORE=true`.
 */
const env = import.meta.env as Record<string, string | undefined>;

const flag = (key: string, fallback: boolean): boolean => {
  const v = env[key];
  if (v === 'true') return true;
  if (v === 'false') return false;
  return fallback;
};

export const features = {
  /** Community explore page. */
  explore: flag('VITE_FEATURE_EXPLORE', false),
  /** Thinking space (canvas) pages. */
  thinking: flag('VITE_FEATURE_THINKING', false),
} as const;

export type FeatureName = keyof typeof features;

export const isFeatureEnabled = (name: FeatureName): boolean => features[name];
