import test from "node:test";
import assert from "node:assert/strict";
import { createApi } from "../server/api.mjs";
import { createMemoryStore, update } from "../server/store.mjs";
import { validateSearch, runSearch } from "../server/search.mjs";
import { TOOLS } from "../server/catalog.mjs";

const env = {
  OWNER_ACCESS_CODE: "test-owner-code",
  SLIT_ACCESS_CODE: "test-slit-code",
};
const goodSources = [
  {
    name: "Test public source",
    status: "found",
    duration: 10,
    results: [
      {
        source: "Test public source",
        title: "Test profile",
        url: "https://example.com",
        fields: [],
        description: "Fixture, not a production source",
      },
    ],
  },
];
function fixture(search = async () => structuredClone(goodSources)) {
  const store = createMemoryStore();
  const handle = createApi({ store, env, search });
  let sequence = 0;
  const request = async (path, data, cookie, extraHeaders = {}) => {
    const response = await handle(
      new Request(`https://witchsearch.example/api${path}`, {
        method: data === undefined ? "GET" : "POST",
        headers: {
          ...(data === undefined ? {} : { "Content-Type": "application/json" }),
          ...(cookie ? { cookie } : {}),
          ...extraHeaders,
        },
        ...(data === undefined ? {} : { body: JSON.stringify(data) }),
      }),
      { ip: "test-ip" },
    );
    return {
      status: response.status,
      data: await response.json(),
      cookie: response.headers.get("set-cookie")?.split(";")[0],
    };
  };
  const signup = async (name = `member_${sequence++}`) => {
    const r = await request("/auth/signup", {
      username: name,
      password: "sufficiently-long-password",
    });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    return r;
  };
  return { store, request, signup };
}

test("username-only registration starts at five credits; passwords are hashed; session logout revokes access", async () => {
  const f = fixture();
  const r = await f.signup("researcher");
  assert.deepEqual(
    { credits: r.data.user.credits, name: r.data.user.username },
    { credits: 5, name: "researcher" },
  );
  assert.ok(!JSON.stringify(r.data).includes("password"));
  const account = (await f.store.read("user/researcher")).data;
  assert.ok(account.password.includes(":"));
  assert.ok(!account.password.includes("sufficiently-long-password"));
  assert.equal((await f.request("/auth/me", undefined, r.cookie)).status, 200);
  assert.equal(
    (
      await f.request("/auth/login", {
        username: "RESEARCHER",
        password: "sufficiently-long-password",
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await f.request("/auth/login", {
        username: "researcher",
        password: "wrong-password",
      })
    ).status,
    401,
  );
  assert.equal((await f.request("/auth/logout", {}, r.cookie)).status, 200);
  assert.equal((await f.request("/auth/me", undefined, r.cookie)).status, 401);
});

test("reserved names and duplicate usernames cannot claim privileged accounts", async () => {
  const f = fixture();
  assert.equal(
    (
      await f.request("/auth/signup", {
        username: "creator",
        password: "password123",
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await f.request("/auth/signup", {
        username: "slit",
        password: "password123",
      })
    ).status,
    409,
  );
  const attempts = await Promise.all([
    f.request("/auth/signup", {
      username: "unique_user",
      password: "password123",
    }),
    f.request("/auth/signup", {
      username: "unique_user",
      password: "password123",
    }),
  ]);
  assert.deepEqual(attempts.map((r) => r.status).sort(), [200, 409]);
  assert.equal(
    (await f.request("/auth/code", { code: "invalid" })).status,
    401,
  );
});

test("both access codes open the correct unlimited account; only creator is an owner", async () => {
  const f = fixture();
  const creator = await f.request("/auth/code", {
    code: env.OWNER_ACCESS_CODE,
  });
  const slit = await f.request("/auth/code", { code: env.SLIT_ACCESS_CODE });
  assert.equal(creator.data.user.username, "creator");
  assert.equal(creator.data.user.role, "owner");
  assert.equal(slit.data.user.username, "slit");
  assert.equal(slit.data.user.role, "special");
  for (const r of [creator, slit]) {
    assert.equal(r.data.user.unlimited, true);
    assert.equal(r.data.user.credits, null);
  }
  assert.equal(
    (
      await f.request(
        "/payments/review",
        { id: "a".repeat(64), decision: "approved" },
        slit.cookie,
      )
    ).status,
    403,
  );
  const r = await f.request(
    "/search",
    { mode: "username", query: "octocat" },
    slit.cookie,
  );
  assert.equal(r.status, 200);
  assert.equal(r.data.user.credits, null);
});

test("five searches consume five credits; unauthenticated, invalid, and locked searches do not run", async () => {
  const f = fixture();
  const user = await f.signup();
  assert.equal(
    (await f.request("/search", { mode: "username", query: "octocat" })).status,
    401,
  );
  assert.equal(
    (
      await f.request(
        "/search",
        { mode: "ip", query: "127.0.0.1" },
        user.cookie,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await f.request(
        "/search",
        { mode: "username", query: "octocat", toolId: "face" },
        user.cookie,
      )
    ).status,
    503,
  );
  for (let i = 0; i < 5; i++) {
    const r = await f.request(
      "/search",
      { mode: "username", query: "octocat" },
      user.cookie,
    );
    assert.equal(r.status, 200);
    assert.equal(r.data.user.credits, 4 - i);
  }
  assert.equal(
    (
      await f.request(
        "/search",
        { mode: "username", query: "octocat" },
        user.cookie,
      )
    ).status,
    402,
  );
});

test("concurrent searches cannot overspend a single remaining credit", async () => {
  const f = fixture();
  const user = await f.signup();
  await update(f.store, `user/${user.data.user.username}`, (u) => ({
    ...u,
    credits: 1,
  }));
  const responses = await Promise.all(
    Array.from({ length: 5 }, () =>
      f.request("/search", { mode: "username", query: "octocat" }, user.cookie),
    ),
  );
  assert.equal(responses.filter((r) => r.status === 200).length, 1);
  assert.equal(responses.filter((r) => r.status === 402).length, 4);
  assert.equal(
    (await f.request("/auth/me", undefined, user.cookie)).data.user.credits,
    0,
  );
});

test("total source failures and thrown provider errors refund credits; no-match searches still cost one", async () => {
  for (const search of [
    async () => [{ name: "Down", status: "unavailable", results: [] }],
    async () => {
      throw new Error("Offline");
    },
  ]) {
    const f = fixture(search);
    const user = await f.signup();
    const r = await f.request(
      "/search",
      { mode: "username", query: "nobody" },
      user.cookie,
    );
    assert.equal(r.data.user.credits, 5);
    assert.equal(r.data.search.status, "failed");
  }
  const f = fixture(async () => [
    { name: "Healthy", status: "no_match", results: [] },
  ]);
  const user = await f.signup();
  const r = await f.request(
    "/search",
    { mode: "username", query: "nobody" },
    user.cookie,
  );
  assert.equal(r.data.user.credits, 4);
  assert.equal(r.data.search.status, "complete");
});

test("interrupted reservations recover exactly once on the next authenticated read", async () => {
  const f = fixture();
  const u = await f.signup();
  await update(f.store, `user/${u.data.user.username}`, (user) => ({
    ...user,
    credits: 4,
    history: [
      {
        id: "interrupted",
        status: "pending",
        createdAt: new Date(Date.now() - 180000).toISOString(),
        sources: [],
      },
    ],
  }));
  assert.equal(
    (await f.request("/auth/me", undefined, u.cookie)).data.user.credits,
    5,
  );
  assert.equal(
    (await f.request("/auth/me", undefined, u.cookie)).data.user.credits,
    5,
  );
});

test("history is private, saves are validated, and completed reports can be saved", async () => {
  const f = fixture();
  const a = await f.signup("alpha");
  const b = await f.signup("bravo");
  const result = await f.request(
    "/search",
    { mode: "username", query: "octocat" },
    a.cookie,
  );
  const id = result.data.search.id;
  assert.equal(
    (await f.request("/history", undefined, b.cookie)).data.history.length,
    0,
  );
  assert.equal(
    (await f.request("/history/save", { id, saved: true }, b.cookie)).status,
    404,
  );
  assert.equal(
    (await f.request("/history/save", { id, saved: "true" }, a.cookie)).status,
    400,
  );
  assert.equal(
    (await f.request("/history/save", { id, saved: true }, a.cookie)).data
      .history[0].saved,
    true,
  );
});

test("cashapp submission grants nothing; creator approval is idempotent under concurrency", async () => {
  const f = fixture();
  const user = await f.signup("buyer");
  const other = await f.signup("other");
  const owner = await f.request("/auth/code", { code: env.OWNER_ACCESS_CODE });
  const payment = await f.request(
    "/payments",
    { packageId: "starter", reference: "CASH-12345678" },
    user.cookie,
  );
  assert.equal(payment.status, 201);
  assert.equal(
    (await f.request("/auth/me", undefined, user.cookie)).data.user.credits,
    5,
  );
  assert.equal(
    (await f.request("/payments", undefined, other.cookie)).data.payments
      .length,
    0,
  );
  assert.equal(
    (
      await f.request(
        "/payments",
        { packageId: "starter", reference: "cash-12345678" },
        other.cookie,
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await f.request(
        "/payments/review",
        { id: payment.data.payment.id, decision: "approved" },
        user.cookie,
      )
    ).status,
    403,
  );
  const approvals = await Promise.all(
    Array.from({ length: 4 }, () =>
      f.request(
        "/payments/review",
        { id: payment.data.payment.id, decision: "approved" },
        owner.cookie,
      ),
    ),
  );
  assert.ok(approvals.every((r) => r.status === 200));
  assert.equal(
    (await f.request("/auth/me", undefined, user.cookie)).data.user.credits,
    55,
  );
  assert.equal(
    (
      await f.request(
        "/payments/review",
        { id: payment.data.payment.id, decision: "rejected" },
        owner.cookie,
      )
    ).status,
    409,
  );
});

test("concurrent approval and rejection agree on one final payment decision", async () => {
  const f = fixture();
  const user = await f.signup();
  const owner = await f.request("/auth/code", { code: env.OWNER_ACCESS_CODE });
  const { data } = await f.request(
    "/payments",
    { packageId: "starter", reference: "CASH-87654321" },
    user.cookie,
  );
  const results = await Promise.all(
    ["approved", "rejected"].map((decision) =>
      f.request(
        "/payments/review",
        { id: data.payment.id, decision },
        owner.cookie,
      ),
    ),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  const p = (await f.request("/payments", undefined, owner.cookie)).data
    .payments[0];
  assert.equal(
    (await f.request("/auth/me", undefined, user.cookie)).data.user.credits,
    p.status === "approved" ? 55 : 5,
  );
});

test("cross-origin writes and oversized bodies are rejected", async () => {
  const f = fixture();
  assert.equal(
    (
      await f.request(
        "/auth/signup",
        { username: "tester", password: "password123" },
        undefined,
        { Origin: "https://evil.example" },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await f.request("/auth/login", {
        username: "tester",
        password: "x".repeat(9000),
      })
    ).status,
    413,
  );
});

test("auth rate limits bound repeated code guesses", async () => {
  const f = fixture();
  for (let i = 0; i < 30; i++)
    assert.equal(
      (await f.request("/auth/code", { code: "incorrect" })).status,
      401,
    );
  assert.equal(
    (await f.request("/auth/code", { code: "incorrect" })).status,
    429,
  );
});

test("source implementation filters avoid calling unrelated providers", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return new Response(
      JSON.stringify({ login: "octocat", public_repos: 10 }),
      { status: 200 },
    );
  };
  try {
    const result = await runSearch(
      "username",
      "octocat",
      {},
      TOOLS.find((t) => t.id === "github"),
    );
    assert.equal(calls.length, 1);
    assert.equal(result[0].name, "GitHub");
    assert.equal(result[0].status, "found");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("search validation rejects URL injection, invalid IPv4, and private ranges", () => {
  for (const value of [
    "http://localhost",
    "example.com/path",
    "example.com?url=127.0.0.1",
    "localhost",
    "-bad.com",
  ])
    assert.throws(() => validateSearch("domain", value));
  for (const value of [
    "127.0.0.1",
    "10.0.0.1",
    "192.168.1.2",
    "172.16.0.1",
    "169.254.169.254",
    "::1",
    "224.0.0.1",
    "100.64.0.1",
  ])
    assert.throws(() => validateSearch("ip", value));
  assert.equal(validateSearch("domain", "GitHub.COM"), "github.com");
  assert.equal(validateSearch("ip", "8.8.8.8"), "8.8.8.8");
  assert.equal(validateSearch("cve", "cve-2024-3094"), "CVE-2024-3094");
  assert.throws(() => validateSearch("crypto", "not-a-bitcoin-address"));
});

test("RDAP uses IANA registry endpoints and blocks redirects outside the registry directory", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).includes("data.iana.org"))
      return new Response(
        JSON.stringify({
          services: [[["com"], ["https://rdap.example-registry.com/"]]],
        }),
      );
    return new Response(
      JSON.stringify({
        ldhName: "EXAMPLE.COM",
        handle: "registration-123",
        status: ["active"],
      }),
    );
  };
  try {
    const results = await runSearch(
      "domain",
      "example.com",
      {},
      { sources: ["RDAP"] },
    );
    assert.equal(results[0].status, "found");
    assert.ok(
      calls.includes("https://rdap.example-registry.com/domain/example.com"),
    );
    calls.length = 0;
    globalThis.fetch = async (url) => {
      calls.push(String(url));
      return new Response(null, {
        status: 302,
        headers: { location: "http://169.254.169.254/metadata" },
      });
    };
    const redirected = await runSearch(
      "domain",
      "example.com",
      {},
      { sources: ["RDAP"] },
    );
    assert.equal(redirected[0].status, "unavailable");
    assert.equal(calls.length, 1);
    assert.ok(!calls[0].includes("169.254.169.254"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("report retention keeps 50 unsaved reports and preserves saved cases", async () => {
  const f = fixture();
  const owner = await f.request("/auth/code", { code: env.OWNER_ACCESS_CODE });
  await update(f.store, "user/creator", (user) => ({
    ...user,
    history: [
      {
        id: "saved-case",
        saved: true,
        status: "complete",
        createdAt: new Date().toISOString(),
        sources: [],
      },
      ...Array.from({ length: 50 }, (_, i) => ({
        id: `old-${i}`,
        saved: false,
        status: "complete",
        createdAt: new Date().toISOString(),
        sources: [],
      })),
    ],
  }));
  await f.request(
    "/search",
    { mode: "username", query: "octocat" },
    owner.cookie,
  );
  const history = (await f.request("/history", undefined, owner.cookie)).data
    .history;
  assert.equal(history.filter((h) => !h.saved).length, 50);
  assert.ok(history.some((h) => h.id === "saved-case"));
  assert.ok(!history.some((h) => h.id === "old-49"));
});

test('web and new tools run without a Brave key; missing VT credentials and malformed inputs do not charge', async () => {
  const f = fixture();
  const user = await f.signup();
  const config = (await f.request('/config')).data;
  assert.equal(config.webSearch, true);
  const tools = config.toolGroups.flatMap(g => g.tools);
  assert.equal(tools.find(t => t.id === 'web').available, true);
  assert.equal(tools.find(t => t.id === 'virustotal').available, false);
  for (const [mode, query, toolId, status] of [
    ['virustotal', 'example.com', 'virustotal', 503],
    ['phone', 'not a number', 'phone', 400],
    ['link', 'http://169.254.169.254/', 'link', 400],
    ['web', 'example', 'github', 400],
    ['local-image', 'example', 'image-geo', 400],
  ]) assert.equal((await f.request('/search', { mode, query, toolId }, user.cookie)).status, status);
  assert.equal((await f.request('/auth/me', undefined, user.cookie)).data.user.credits, 5);
  const r = await f.request('/search', { mode: 'web', query: 'public research', toolId: 'web' }, user.cookie);
  assert.equal(r.status, 200);
  assert.equal(r.data.user.credits, 4);
});
