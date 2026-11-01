export function isDemo() {
  return (
    process.env.DEMO_MODE === "true" &&
    process.env.NODE_ENV !== "production" &&
    !process.env.VERCEL
  );
}
export function simulatorEnabled() {
  return (
    isDemo() ||
    (process.env.ENABLE_SIMULATOR === "true" &&
      process.env.NODE_ENV !== "production")
  );
}
