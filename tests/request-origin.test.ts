import { test } from "node:test";
import assert from "node:assert/strict";
import { requestOrigin } from "../lib/server/request-origin";

const production = { NODE_ENV: "production" } as const;

test("auth links use the forwarded public origin instead of internal localhost", () => {
  const request = new Request("http://localhost:3000/api/auth/register", {
    headers: {
      host: "localhost:3000",
      "x-forwarded-host": "classroom.example.edu",
      "x-forwarded-proto": "https",
    },
  });
  for (const path of [
    "/auth/confirm?flow=signup",
    "/auth/confirm?flow=recovery",
    "/dashboard",
    "/login?auth=expired",
    "/reset-password?auth=expired",
  ])
    assert.equal(
      new URL(path, requestOrigin(request, production)).toString(),
      `https://classroom.example.edu${path}`,
    );
});

test("public Host is used when a proxy rewrites the request URL", () => {
  const request = new Request("http://127.0.0.1:3000/auth/confirm", {
    headers: { host: "classroom.example.edu" },
  });
  assert.equal(
    requestOrigin(request, production),
    "https://classroom.example.edu",
  );
});

test("direct production and local development requests retain their origins", () => {
  assert.equal(
    requestOrigin(
      new Request("https://classroom.example.edu/auth/confirm"),
      production,
    ),
    "https://classroom.example.edu",
  );
  assert.equal(
    requestOrigin(new Request("http://127.0.0.1:3001/auth/confirm"), {
      NODE_ENV: "development",
    }),
    "http://127.0.0.1:3001",
  );
});

test("production and hosted previews never issue localhost auth links", () => {
  for (const host of [
    "localhost",
    "test.localhost",
    "127.0.0.1",
    "127.1",
    "0.0.0.0",
    "[::1]",
    "[::]",
  ])
    for (const env of [
      production,
      { NODE_ENV: "development", VERCEL: "1" } as const,
    ])
      assert.throws(
        () =>
          requestOrigin(new Request(`http://${host}:3000/auth/confirm`), env),
        /public HTTPS origin/,
      );
});

test("malformed forwarded origins and insecure production links are rejected", () => {
  const cases: Record<string, string>[] = [
    { "x-forwarded-host": "school.example, evil.example" },
    { "x-forwarded-host": "school.example@evil.example" },
    { "x-forwarded-host": "school.example/path" },
    { "x-forwarded-proto": "javascript" },
    { "x-forwarded-proto": "http" },
  ];
  for (const headers of cases)
    assert.throws(() =>
      requestOrigin(
        new Request("https://school.example/auth/confirm", { headers }),
        production,
      ),
    );
});
