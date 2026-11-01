// Winner and landing offset are sampled independently, so animation cannot bias the pick.
export function wheelStop(count: number, random = Math.random) {
  if (!Number.isInteger(count) || count < 1)
    throw new Error("Wheel needs students.");
  const index = Math.floor(random() * count);
  const segment = 360 / count;
  const fraction = 0.18 + random() * 0.64;
  return {
    index,
    target: (360 - (index + fraction) * segment) % 360,
    revolutions: 4 + Math.floor(random() * 3),
    duration: 3100 + Math.floor(random() * 1200),
  };
}
