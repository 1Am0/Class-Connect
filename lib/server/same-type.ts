// `true satisfies Same<A, B>` fails to compile unless A and B are identical,
// which keeps server schemas in step with the client-safe types they validate.
export type Same<A, B> = [A] extends [B]
  ? [B] extends [A]
    ? true
    : false
  : false;
