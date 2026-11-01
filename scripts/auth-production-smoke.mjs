// Run after pnpm build. Uses only a local Supabase stub and disposable sessions.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { createServerClient } from "@supabase/ssr";

const teacherId = "11111111-1111-4111-8111-111111111111";
const emailRedirects = new Map();
const supabase = createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");
  if (req.url.startsWith("/auth/v1/user")) {
    res.end(JSON.stringify({ id: teacherId, email: "teacher@example.edu" }));
  } else if (/^\/auth\/v1\/(signup|recover)/.test(req.url)) {
    const url = new URL(req.url, "http://stub");
    emailRedirects.set(url.pathname, url.searchParams.get("redirect_to"));
    res.end(JSON.stringify({ id: teacherId, email: "teacher@example.edu" }));
  } else {
    res.statusCode = 503;
    res.end(JSON.stringify({ message: "Simulated database outage" }));
  }
});
supabase.listen(0, "127.0.0.1");
await once(supabase, "listening");
const supabaseUrl = `http://127.0.0.1:${supabase.address().port}`;
const appPort = 3197;
const base = `http://127.0.0.1:${appPort}`;
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    String(appPort),
  ],
  {
    env: {
      ...process.env,
      NODE_ENV: "production",
      DEMO_MODE: "true",
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
      SUPABASE_URL: supabaseUrl,
      SUPABASE_PUBLISHABLE_KEY: "test-public-key",
      SUPABASE_SECRET_KEY: "test-admin-key",
      SUPABASE_SERVICE_ROLE_KEY: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let logs = "";
server.stdout.on("data", (chunk) => {
  logs += chunk;
});
server.stderr.on("data", (chunk) => {
  logs += chunk;
});

try {
  for (let attempt = 0; ; attempt++) {
    try {
      await fetch(`${base}/login`);
      break;
    } catch {
      if (attempt === 99 || server.exitCode !== null) throw new Error(logs);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  const login = await (await fetch(`${base}/login`)).text();
  assert.doesNotMatch(login, /Open demo classroom/);
  const anonymous = await fetch(`${base}/dashboard`, { redirect: "manual" });
  assert.equal(anonymous.status, 307);
  assert.equal(
    new URL(anonymous.headers.get("location"), base).pathname,
    "/login",
  );

  const cookies = [];
  const client = createServerClient(supabaseUrl, "test-public-key", {
    cookies: { getAll: () => [], setAll: (items) => cookies.push(...items) },
  });
  const encode = (value) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: teacherId, exp: Math.floor(Date.now() / 1000) + 3600 })}.test`;
  const session = await client.auth.setSession({
    access_token: token,
    refresh_token: "test-refresh-token",
  });
  assert.equal(session.error, null);
  const failedLoad = await fetch(`${base}/dashboard`, {
    headers: {
      cookie: cookies.map(({ name, value }) => `${name}=${value}`).join("; "),
    },
  });
  const html = await failedLoad.text();
  assert.match(html, /Your classroom is temporarily unavailable/);
  assert.match(html, /Try again/);
  assert.doesNotMatch(
    html,
    /connect your classroom|Configure Supabase|DEMO_MODE|Simulated database outage/,
  );
  assert.match(logs, /Simulated database outage/);

  for (const [flow, target] of [
    ["signup", "/login"],
    ["recovery", "/reset-password"],
  ]) {
    const response = await fetch(`${base}/auth/confirm?flow=${flow}`, {
      redirect: "manual",
      headers: {
        "x-forwarded-host": "classroom.example.edu",
        "x-forwarded-proto": "https",
      },
    });
    assert.equal(response.status, 307);
    assert.equal(
      response.headers.get("location"),
      `https://classroom.example.edu${target}?auth=expired`,
    );
  }
  for (const [route, upstream, flow, body] of [
    [
      "register",
      "signup",
      "signup",
      {
        username: "Test Teacher",
        email: "teacher@example.edu",
        password: "SchoolDay7",
      },
    ],
    ["recovery", "recover", "recovery", { email: "teacher@example.edu" }],
  ]) {
    const response = await fetch(`${base}/api/auth/${route}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-host": "classroom.example.edu",
        "x-forwarded-proto": "https",
      },
      body: JSON.stringify(body),
    });
    assert.equal(response.status, 200, await response.text());
    assert.equal(
      emailRedirects.get(`/auth/v1/${upstream}`),
      `https://classroom.example.edu/auth/confirm?flow=${flow}`,
    );
  }
  const manifest = JSON.parse(
    await readFile(".next/prerender-manifest.json", "utf8"),
  );
  assert.equal(manifest.routes["/dashboard"], undefined);
  assert.equal(manifest.routes["/[view]"], undefined);
  console.log(
    "Production auth smoke passed: no demo, anonymous redirect, recoverable database failure, public callback/email origins, and no prerendered dashboard.",
  );
} finally {
  server.kill("SIGTERM");
  await once(server, "exit");
  supabase.closeAllConnections();
  await new Promise((resolve) => supabase.close(resolve));
}
