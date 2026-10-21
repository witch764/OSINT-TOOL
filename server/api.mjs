import {
  randomBytes,
  randomUUID,
  scrypt as rawScrypt,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
import { update } from "./store.mjs";
import { runSearch, validateSearch } from "./search.mjs";
import { TOOL_GROUPS, TOOLS, toolAvailable } from "./catalog.mjs";
import { validateRobloxScan } from "./roblox-scan.mjs";

const scrypt = promisify(rawScrypt);
export const PACKAGES = [
  { id: "starter", name: "Starter", credits: 50, price: 5 },
  { id: "investigator", name: "Investigator", credits: 200, price: 15 },
  { id: "professional", name: "Professional", credits: 600, price: 35 },
];
const hash = (value) => createHash("sha256").update(value).digest("hex");
const fail = (status, message) => {
  const error = new Error(message);
  error.status = status;
  throw error;
};
const equal = (a, b) =>
  timingSafeEqual(Buffer.from(hash(a)), Buffer.from(hash(b)));
const limitHistory = (user) => {
  let ordinary = 0;
  user.history = user.history.filter(
    (h) => h.saved || h.status === "pending" || ordinary++ < 50,
  );
  return user;
};
const publicUser = (user) => ({
  username: user.username,
  unlimited: user.unlimited,
  credits: user.unlimited ? null : user.credits,
  role: user.role,
  createdAt: user.createdAt,
});
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
const cookie = (token, secure, clear = false) =>
  `witchsearch_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${clear ? 0 : 604800}${secure ? "; Secure" : ""}`;

async function body(request) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    fail(415, "Send JSON data.");
  const reader = request.body?.getReader();
  if (!reader) fail(400, "Missing request body.");
  const parts = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > 8192) fail(413, "Request is too large.");
      parts.push(Buffer.from(part.value));
    }
  } finally {
    await reader.cancel();
  }
  try {
    const value = JSON.parse(Buffer.concat(parts).toString());
    if (!value || Array.isArray(value) || typeof value !== "object")
      fail(400, "Invalid request.");
    return value;
  } catch {
    fail(400, "Invalid JSON request.");
  }
}
async function rate(store, key, max, windowMs) {
  const now = Date.now();
  await update(store, `rate/${hash(key)}`, (current) => {
    const value =
      current && current.reset > now
        ? current
        : { count: 0, reset: now + windowMs };
    if (value.count >= max)
      fail(429, "Too many attempts. Please try again later.");
    value.count++;
    return value;
  });
}
async function passwordHash(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64);
  return `${salt}:${derived.toString("hex")}`;
}
async function passwordMatches(password, stored) {
  // Always perform scrypt, including for unknown accounts.
  const [salt, target] = (
    stored || `${"0".repeat(32)}:${"0".repeat(128)}`
  ).split(":");
  const actual = await scrypt(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(target, "hex"));
}
function username(value) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_]{3,24}$/.test(value))
    fail(400, "Use 3–24 letters, numbers, or underscores for your username.");
  return value.toLowerCase();
}
function checkPassword(value) {
  if (typeof value !== "string" || value.length < 8 || value.length > 128)
    fail(400, "Use a password between 8 and 128 characters.");
  return value;
}
function newUser(name, password = null, role = "member") {
  return {
    username: name,
    password,
    role,
    unlimited: role !== "member",
    credits: role === "member" ? 5 : 0,
    createdAt: new Date().toISOString(),
    history: [],
    grants: [],
  };
}

export function createApi({ store, search = runSearch, env = process.env }) {
  async function session(request) {
    const token = request.headers
      .get("cookie")
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("witchsearch_session="))
      ?.slice(20);
    if (!token || !/^[a-f0-9]{64}$/.test(token))
      fail(401, "Log in to continue.");
    const key = `session/${hash(token)}`;
    const record = (await store.read(key))?.data;
    if (!record || record.expires < Date.now() || record.revoked)
      fail(401, "Your session has expired. Please log in again.");
    const account = (await store.read(`user/${record.username}`))?.data;
    if (!account) fail(401, "Account not found.");
    return { account, key };
  }
  async function loginResponse(account, secure) {
    const token = randomBytes(32).toString("hex");
    await update(store, `session/${hash(token)}`, () => ({
      username: account.username,
      expires: Date.now() + 604800000,
    }));
    return json({ user: publicUser(account) }, 200, {
      "Set-Cookie": cookie(token, secure),
    });
  }
  return async function handle(request, context = {}) {
    try {
      const url = new URL(request.url);
      const path = url.pathname
        .replace(/^\/\.netlify\/functions\/api/, "/api")
        .replace(/\/$/, "");
      const method = request.method;
      const secure = url.protocol === "https:";
      if (!["GET", "POST"].includes(method)) fail(405, "Method not allowed.");
      if (method === "POST") {
        const origin = request.headers.get("origin");
        if (origin && origin !== url.origin)
          fail(403, "This request must come from WitchSearch.");
        if (request.headers.get("sec-fetch-site") === "cross-site")
          fail(403, "Cross-site request blocked.");
      }
      const ip = context.ip || "local";
      if (path === "/api/config" && method === "GET")
        return json({
          toolGroups: TOOL_GROUPS.map((g) => ({
            ...g,
            tools: g.tools.map((t) => ({
              ...t,
              available: toolAvailable(t, env),
            })),
          })),
          packages: PACKAGES,
          cashapp: "$imhollowvf",
          webSearch: true,
          accessCodes: Boolean(env.OWNER_ACCESS_CODE || env.SLIT_ACCESS_CODE),
        });
      if (
        ["/api/auth/signup", "/api/auth/login", "/api/auth/code"].includes(
          path,
        ) &&
        method === "POST"
      ) {
        await rate(store, `auth:${ip}`, 30, 900000);
        const input = await body(request);
        if (path.endsWith("/code")) {
          if (typeof input.code !== "string" || input.code.length > 128)
            fail(400, "Enter your access code.");
          let name;
          if (env.OWNER_ACCESS_CODE && equal(input.code, env.OWNER_ACCESS_CODE))
            name = "creator";
          else if (
            env.SLIT_ACCESS_CODE &&
            equal(input.code, env.SLIT_ACCESS_CODE)
          )
            name = "slit";
          else fail(401, "Invalid access code.");
          const account = await update(
            store,
            `user/${name}`,
            (existing) =>
              existing ||
              newUser(name, null, name === "creator" ? "owner" : "special"),
          );
          return loginResponse(account, secure);
        }
        const name = username(input.username);
        const password = checkPassword(input.password);
        if (path.endsWith("/signup")) {
          if (["creator", "slit"].includes(name))
            fail(409, "That username is reserved.");
          await rate(store, `signup:${ip}`, 5, 86400000);
          const encoded = await passwordHash(password);
          const account = await update(store, `user/${name}`, (existing) => {
            if (existing) fail(409, "That username is taken.");
            return newUser(name, encoded);
          });
          return loginResponse(account, secure);
        }
        const account = (await store.read(`user/${name}`))?.data;
        const valid = await passwordMatches(password, account?.password);
        if (!valid || !account?.password)
          fail(401, "Incorrect username or password.");
        return loginResponse(account, secure);
      }
      const auth = await session(request);
      let account = auth.account;
      const sessionKey = auth.key;
      const userKey = `user/${account.username}`;
      if (
        account.history.some(
          (h) =>
            h.status === "pending" &&
            Date.parse(h.createdAt) < Date.now() - 120000,
        )
      ) {
        account = await update(store, userKey, (user) => {
          for (const item of user.history) {
            if (
              item.status === "pending" &&
              Date.parse(item.createdAt) < Date.now() - 120000
            ) {
              item.status = "failed";
              item.error = "Search interrupted. Credit refunded.";
              if (!user.unlimited) user.credits++;
            }
          }
          return user;
        });
      }
      if (path === "/api/auth/me" && method === "GET")
        return json({ user: publicUser(account) });
      if (path === "/api/auth/logout" && method === "POST") {
        await update(store, sessionKey, (current) => ({
          ...current,
          revoked: true,
        }));
        return json({ ok: true }, 200, {
          "Set-Cookie": cookie("", secure, true),
        });
      }
      if (path === "/api/history" && method === "GET")
        return json({ history: account.history });
      if (path === "/api/history/save" && method === "POST") {
        const input = await body(request);
        if (typeof input.saved !== "boolean") fail(400, "Invalid save action.");
        const updated = await update(store, userKey, (user) => {
          const item = user.history.find((h) => h.id === input.id);
          if (!item) fail(404, "Search not found.");
          if (
            input.saved &&
            !item.saved &&
            user.history.filter((h) => h.saved).length >= 100
          )
            fail(
              400,
              "You can save up to 100 searches. Export or unsave an older search first.",
            );
          item.saved = input.saved;
          return limitHistory(user);
        });
        return json({ history: updated.history });
      }
      if (path === "/api/search" && method === "POST") {
        const input = await body(request);
        const tool = input.toolId
          ? TOOLS.find((t) => t.id === input.toolId)
          : null;
        if (input.toolId && (!tool || !toolAvailable(tool, env)))
          fail(503, "This tool needs a provider connection before it can run.");
        if (tool && tool.mode !== input.mode)
          fail(400, "Search type does not match this tool.");
        let query;
        let options;
        if (input.mode === 'roblox-batch' && tool?.id !== 'roblox-scraper') fail(400, 'Choose the Roblox Profile Scraper to run a batch scan.');
        try {
          query = validateSearch(input.mode, input.query);
          if (input.mode === 'roblox-batch') options = validateRobloxScan(query, input.options);
        } catch (error) {
          fail(400, error.message);
        }
        if (['virustotal', 'vt-content'].includes(input.mode) && !env.VIRUSTOTAL_API_KEY)
          fail(503, 'Add VIRUSTOTAL_API_KEY in Netlify to connect this provider.');
        if (input.mode === 'vt-content' && env.VIRUSTOTAL_INTELLIGENCE_ENABLED !== 'true')
          fail(503, 'VirusTotal Intelligence requires a subscription and VIRUSTOTAL_INTELLIGENCE_ENABLED=true.');
        if (input.mode === 'address') await rate(store, 'provider:nominatim', 1, 1000);
        await rate(store, `search:${account.username}`, 20, 60000);
        const id = randomUUID();
        const timestamp = new Date().toISOString();
        // Reserve the credit atomically before making any provider requests. Keep a recoverable
        // reservation so a terminated serverless invocation cannot permanently consume credits.
        await update(store, userKey, (user) => {
          const cutoff = Date.now() - 120000;
          for (const item of user.history) {
            if (
              item.status === "pending" &&
              Date.parse(item.createdAt) < cutoff
            ) {
              item.status = "failed";
              item.error = "Search interrupted. Credit refunded.";
              if (!user.unlimited) user.credits++;
            }
          }
          if (!user.unlimited && user.credits < 1)
            fail(402, "You’re out of credits. Add credits to keep searching.");
          if (!user.unlimited) user.credits--;
          if (user.history.filter((h) => h.status === "pending").length >= 3)
            fail(429, "Wait for your current searches to finish.");
          user.history.unshift({
            id,
            mode: input.mode,
            toolId: tool?.id,
            query,
            ...(options ? { options } : {}),
            createdAt: timestamp,
            status: "pending",
            saved: false,
            sources: [],
          });
          // Retain pending and saved records. Cap saved records separately in the save endpoint.
          return limitHistory(user);
        });
        let sources = [];
        let failed = false;
        try {
          sources = await search(input.mode, query, env, tool, options);
          failed =
            !sources.length || sources.every((s) => s.status === "unavailable");
        } catch {
          failed = true;
        }
        const updated = await update(store, userKey, (user) => {
          const item = user.history.find((h) => h.id === id);
          if (!item || item.status !== "pending") return user;
          item.status = failed ? "failed" : "complete";
          item.sources = sources;
          if (failed) {
            item.error =
              "All sources were unavailable. Your credit was refunded.";
            if (!user.unlimited) user.credits++;
          }
          return limitHistory(user);
        });
        return json({
          search: updated.history.find((h) => h.id === id),
          user: publicUser(updated),
        });
      }
      if (path === "/api/payments" && method === "GET") {
        const keys = await store.keys("payment/");
        const records = (await Promise.all(keys.map((k) => store.read(k))))
          .map((r) => r?.data)
          .filter(Boolean);
        return json({
          payments: records
            .filter(
              (p) =>
                account.role === "owner" || p.username === account.username,
            )
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, 200),
        });
      }
      if (path === "/api/payments" && method === "POST") {
        if (account.unlimited)
          fail(400, "This account already has unlimited credits.");
        const input = await body(request);
        const pack = PACKAGES.find((p) => p.id === input.packageId);
        if (!pack) fail(400, "Choose a credit package.");
        if (
          typeof input.reference !== "string" ||
          !/^[a-zA-Z0-9-]{6,80}$/.test(input.reference)
        )
          fail(
            400,
            "Enter the Cash App transaction ID (6–80 letters, numbers, or dashes).",
          );
        await rate(store, `payments:${account.username}`, 5, 86400000);
        const id = hash(input.reference.toLowerCase());
        const payment = {
          id,
          username: account.username,
          packageId: pack.id,
          credits: pack.credits,
          price: pack.price,
          reference: input.reference,
          createdAt: new Date().toISOString(),
          status: "pending",
        };
        await update(store, `payment/${id}`, (existing) => {
          if (existing)
            fail(409, "That transaction ID has already been submitted.");
          return payment;
        });
        return json({ payment }, 201);
      }
      if (path === "/api/payments/review" && method === "POST") {
        if (account.role !== "owner")
          fail(403, "Only the creator can review payments.");
        const input = await body(request);
        if (
          typeof input.id !== "string" ||
          !/^[0-9a-f]{64}$/.test(input.id) ||
          !["approved", "rejected"].includes(input.decision)
        )
          fail(400, "Invalid payment review.");
        // Persist the decision first. An approved decision can be retried to recover from a
        // process interruption; the account's grant ledger makes credit delivery idempotent.
        const payment = await update(store, `payment/${input.id}`, (p) => {
          if (!p) fail(404, "Payment not found.");
          if (p.status !== "pending" && p.status !== input.decision)
            fail(409, "This payment was already reviewed.");
          return {
            ...p,
            status: input.decision,
            reviewedAt: p.reviewedAt || new Date().toISOString(),
          };
        });
        if (payment.status === "approved") {
          await update(store, `user/${payment.username}`, (user) => {
            if (!user) fail(404, "Account not found.");
            if (!user.grants.includes(payment.id)) {
              user.credits += payment.credits;
              user.grants.push(payment.id);
            }
            return user;
          });
          await update(store, `payment/${input.id}`, (p) => ({
            ...p,
            delivered: true,
          }));
        }
        return json({ ok: true });
      }
      fail(404, "Endpoint not found.");
    } catch (error) {
      if (!error.status) console.error("WitchSearch API error:", error.name);
      return json(
        {
          error: error.status
            ? error.message
            : "Something went wrong. Please try again.",
        },
        error.status || 500,
      );
    }
  };
}
