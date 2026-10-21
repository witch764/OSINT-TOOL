# WitchSearch

A Netlify application for public-source research. React + TypeScript frontend, Node serverless API, and persistent Netlify Blobs storage. The dark, purple dashboard follows the navigation shown in the supplied Indicia screenshots; it is an independent implementation, not a copy of Indicia’s private software, databases, or integrations.

## Run locally

Requires Node 24 and npm. No database installation is needed.

```bash
npm ci
cp .env.example .env
# Set the two private access codes in .env if you want privileged accounts.
npm run dev
```

Open **http://localhost:3000**. Local development stores accounts, password hashes, credits, sessions, and reports in the ignored `.local-data/` directory. Keep this directory private. It is separate from production data. Restart the server after changing `.env` or backend files. Vite updates frontend files automatically.

`npm run preview` serves only the built frontend; use `npm run dev` for the complete local application.

## Deploy to Netlify

**Use a Git-connected Netlify project or Netlify CLI. Dragging the `dist` folder into Netlify Drop does not deploy the backend and will not support accounts.**

1. Put this project in your Git repository, then choose **Add new project → Import an existing project** in Netlify. Select that repository and its WitchSearch branch.
2. Netlify reads `netlify.toml`: build `npm run build`, publish directory `dist`, functions directory `netlify/functions`, Node 24. Leave the base directory empty if these files are at the repository root.
3. In **Project configuration → Environment variables**, set these variables with the **Functions** scope (or all scopes):

   | Variable               | Purpose                                                                                                            |
   | ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
   | `OWNER_ACCESS_CODE`    | Set this to the requested private creator code. Opens `creator`, with unlimited credits and payment review access. |
   | `SLIT_ACCESS_CODE`     | Set this to the requested second private code. Opens `slit`, with unlimited credits and no payment review access.  |
   | `BRAVE_SEARCH_API_KEY` | Optional. Prefers Brave Search; public web search works without this key.                                            |

   Optional VirusTotal reports require `VIRUSTOTAL_API_KEY`. Intelligence search also requires a paid subscription and `VIRUSTOTAL_INTELLIGENCE_ENABLED=true`. These variables must also have Functions scope.

   The requested codes are configured in the current sandbox’s private `.env`. They are deliberately excluded from source archives and the browser bundle. Enter the same codes in Netlify. Do not prefix these variables with `VITE_`; they belong exclusively on the server. If both codes match, creator takes precedence, so use distinct values.

4. Deploy. Netlify Blobs is accessed through the function’s built-in site context; no database URL or manually copied Netlify token is required. The site needs a Netlify plan with Functions and Blobs available. Accounts persist across deploys of the same site, including deploy previews; use a separate site for isolated test data.
5. On the deployed site, create a normal account, log out, log back in, and run a search. Check the `creator` account and the **Payment requests** page. Confirm these checks before accepting real purchases. Accounts, sessions, saved reports, and credit changes were verified on the connected WitchSearch Netlify site.

Alternatively, after linking a site with the Netlify CLI, use `netlify deploy --build --prod` from the project root. Configure the variables above in the site before deploying. No Netlify account or live payment account is connected by this repository alone.

## Accounts and credits

- Registration needs only a unique username and password; no email, phone, or confirmation code.
- Usernames: 3–24 letters, numbers, or underscores; case insensitive. Passwords: 8–128 characters.
- Each normal account starts with **5 credits**. The names `creator` and `slit` are reserved and cannot be registered normally.
- On the login screen, choose **Have an account access code?** to access the private accounts. This option appears when at least one code is configured.
- Passwords are salted with scrypt. Sessions use random server-stored tokens in HttpOnly, SameSite cookies, expire after seven days, and are revoked on logout. HTTPS adds the Secure flag.
- Credits are reserved with conditional storage writes before querying providers. Concurrent searches cannot overspend. Total provider failure refunds the credit; a successful lookup with no matches still costs one credit.
- Interrupted searches are refunded on the next authenticated request after two minutes. Reopen or refresh the page to recover the displayed balance.
- Latest 50 unsaved reports and up to 100 saved cases are retained. Reports can be exported as JSON.
- There is no email recovery. Keep passwords and access codes safe. Anyone holding a privileged access code can enter its account; rotate a code in Netlify if it is shared.
- Signups and login attempts are rate limited per IP; searches are limited per account. Username-only signup cannot establish a real-world identity or prevent every person from creating multiple accounts.

## Search coverage

Results always come from the listed APIs. No demo results are used in production. Profile matches are leads, not proof that accounts belong to one person. The tool directory labels each entry’s actual connection status.

| Tool | Actual coverage |
| --- | --- |
| Unified username search | GitHub, GitLab, Hacker News, Roblox, Reddit, Chess.com, Lichess, DEV Community, and indexed public web mentions |
| Web Databases / Live Intelligence / Person Search | DuckDuckGo public index; optional Brave Search with public-index fallback. Person Search finds indexed mentions, not private background reports. |
| LinkedIn / TikTok / Instagram / Xbox / PlayStation / Epic Games | Public web results restricted to the platform domain. These are indexed-page searches, not native platform APIs; unindexed accounts may not appear. |
| Gmail / Email Search | Domain DNS/RDAP and exact public web mentions. Does not verify a mailbox or its owner. |
| Phone Search | International numbering plan, country, number type, and public web mentions. No subscriber records or live tracking. |
| Address Search | OpenStreetMap/Nominatim place lookup, coordinates, and map links. No resident records. Site-wide one-request-per-second limit and bounded in-process cache. © OpenStreetMap contributors, ODbL. |
| Court Records | CourtListener public US court opinions, with filing dates, court, docket, and source links. Does not cover every court or record type. |
| Whois / DNS Recon | Authoritative RDAP and public A, AAAA, MX, NS, TXT records |
| IP Info / Shodan | Public IPv4 allocation, reverse DNS, approximate IPinfo location, and Shodan InternetDB observations. No active scans or exact person location. |
| Certificate Lookup | SSLMate Cert Spotter plus crt.sh certificate transparency records |
| Wayback / URLScan | Nearest archived snapshot / existing public domain scan observations |
| CVE / KEV | CVE Program records plus CISA Known Exploited Vulnerabilities membership and remediation details |
| Ransomware Groups | Ransomware.live public group summaries plus independent Malpedia family-catalog matches; no stolen files or malware samples |
| Crypto Address Analyzer / App Store Search | Bitcoin balances/activity via Blockstream / published iOS app listings |
| Forums Search | Hacker News story and comment search through Algolia |
| Roblox | Public profile, joined date, description, friend/follower/following counts; individual fields may be restricted |
| Roblox Profile Scraper | Scan 1–200 consecutive numeric IDs; case-insensitive literal keyword, prefix, suffix, and exact username-length filters; ID/status display controls; optional unavailable-ID rows; saved/exported reports include the filters. Uses the public Roblox directory API, without cookies. Missing IDs do not confirm deletion; unavailable rows are not counted as discovered profiles. |
| Telegram | Public profile/channel preview by exact handle and indexed public mentions; no private messages or members |
| Steam | Public Steam Community profile by vanity name or SteamID64 |
| Discord | Public server invite preview and approximate member counts, not private user lookup |
| Link Resolver | HTTP redirect chain, with private/reserved IP rejection, per-hop DNS checks, and pinned connections. No scripts or login redirects. |
| Image Geolocation | Free, on-device EXIF/GPS extraction and map link. The image is not uploaded. Cannot infer location from scenery; metadata can be absent or altered. |
| VirusTotal | Existing domain/IP/file-hash reports with `VIRUSTOTAL_API_KEY`. Intelligence queries also require an appropriate subscription and `VIRUSTOTAL_INTELLIGENCE_ENABLED=true`. No files are uploaded or downloaded. |

35 catalog tools have implementations usable without provider keys, including the on-device image tool. Availability means an adapter exists, not that an upstream source guarantees a match or uptime. Public indexes can rate limit or show challenges; these responses are reported as unavailable, never fabricated results. Total source failure refunds the credit; a healthy no-match search costs one credit. Adding a Brave key can improve public search reliability. All results link to their source and should be verified there. Reports also offer free external research links and clearly labeled unverified profile candidates so research can continue when an index blocks server requests.

Reverse Face Search, Hudson Rock, Horus, Cell Tower, AI Infra/Witch AI, Wi-Fi/BSSID, VirusTotal Downloader, and IntelX Downloader still lack backend implementations. They are labeled **Not connected** and charge no credits. Their providers need separate access, supported APIs, and backend work; entering an arbitrary key cannot activate them. Double Counter Bypass is not implemented. Sherlock, Maigret, Amass, theHarvester, SpiderFoot, and recon-ng are external command-line projects, not drop-in Netlify APIs. OSINT Framework and similar directories are resource lists.

The optional VirusTotal adapter has fixture-based parsing and credential-gate tests; a real account/key is required for live verification. The pinned emulator catalog has no matching VirusTotal or search-index service. No emulator is substituted for live providers in production.

## Credit purchases and Cash App

All supported purchases are direct Cash App payments to **$imhollowvf**:

| Package      | Credits | USD |
| ------------ | ------: | --: |
| Starter      |      50 |  $5 |
| Investigator |     200 | $15 |
| Professional |     600 | $35 |

1. A member chooses a package, follows the Cash App link, and pays the recipient. The app does not send or initiate payments by itself.
2. They submit the Cash App transaction ID with the package. Submission does not grant credits.
3. Log into `creator` and open **Payment requests**. Independently verify the recipient, transaction ID, amount, and username note in Cash App before clicking **Confirm received**. Reject requests with no matching payment.
4. Approval grants credits once. Duplicate transaction IDs are rejected across accounts. Retrying an approved but undelivered request recovers delivery without adding credits twice. `slit` has no approval access.

A Cash App payment link provides no ordinary merchant webhook to prove receipt. **Credit delivery is manual.** Cards, Apple Pay, PayPal, cryptocurrency payments, and automatic forwarding from payment processors to Cash App are not implemented. Supporting those requires a merchant processor account, an approved settlement destination, and verified webhooks. A recipient handle alone cannot set that up.

## Checks

```bash
npm run check
npm test
npm run build
npm audit
```

Tests cover authentication, reserved account roles, session revocation, rate limiting, search validation, private reports, concurrent credit reservations, refunds, and payment delivery idempotency. API tests use an isolated memory store and synthetic source fixtures; production code never substitutes those fixtures for real data.

Local JSON storage supports a single development process. Production uses strongly consistent Netlify Blobs reads and conditional writes. Back up production Blobs through Netlify before deleting the site or store. No deployment or live financial transaction is performed by the tests.

## Screenshot control coverage

The Roblox Profile Scraper has its own ID-range form: starting ID, amount, comma-separated keywords (match any), starts/ends with, exact username length, unavailable-ID inclusion, user ID display, status display, scan, save to Cases, and JSON export. Filters combine; name filters match usernames rather than display names. Literal filters do not run arbitrary regular expressions. A scan costs one credit regardless of returned profile count; total source failure refunds it. The 200-ID cap matches the provider's bulk request limit; this deployment does not promise a million-ID job. Private, deleted, or terminated account contents cannot be recovered.

Other connected tools show the input appropriate to their implemented public adapter (domain, CVE, Bitcoin address, Steam ID, Discord invite, and so on). Social web tools search indexed public pages; they are not native private-account lookups.

The supplied IntelX screenshots show storage IDs, provider-specific buckets, and stealer-log archives. Those require an authorized IntelX service integration and are not available through the current public-source implementation. No fake buckets or successful downloads are shown. Stolen-credential archives and Discord verification bypass are not implemented. Locked tools do not charge credits.

## Optional Indicia connection

The creator can open **Account settings → Indicia connection** to save or replace a key. It is verified server-side and stored in private Netlify Blobs (or the private local development store); responses never include it. Disconnecting removes the stored credential and disables the optional connection. `INDICIA_API_KEY` is an optional server-only environment fallback; an explicit disconnect overrides it. Never use a `VITE_` key or commit a real key.

Connected tools offer an explicit **Use Indicia public data** checkbox: TikTok, Epic Games, PlayStation, Xbox, Steam, IP Info, Whois, Certificate Lookup, URLScan, CVE/KEV, Wayback snapshot listings, and Bitcoin wallet analysis. Public adapters remain the default. Indicia requests use fixed allowlisted endpoints, bounded responses, and no redirects. Provider calls have a 20-second deadline (the existing public adapters retain their 8-second default). Each request checks authenticated provider pricing and proceeds only when that endpoint is quoted at zero credits; changed or missing prices fail closed. The app still charges one WitchSearch credit for a healthy search and refunds total failure. Provider selection persists with saved reports and JSON exports.

The integration is limited to public-data endpoints; it does not connect paid searches, breach/stealer credentials, verification bypass, or file downloads. Wayback never requests paid snapshot content. Real upstream availability varies independently of account permissions. Local unlimited WitchSearch credits do not fund an external provider's paid balance.

## OathNet profiles and account exposure

The **OATHNET** tool-directory group extends the existing site, login, credit reservation/refund, Cases, and JSON report export. Existing public and Indicia tools retain their current adapters. OathNet tools are optional and show a provider setup panel until configured. Configuration means credentials are present, not that upstream access has been verified.

### Server configuration

1. Obtain a key from [OathNet Dashboard → Account](https://oathnet.org/dashboard?tab=account). Confirm your subscription permits each intended endpoint and has sufficient quota. WitchSearch credits do not pay for OathNet quota.
2. In **Netlify → Project configuration → Environment variables**, add **`OATHNET_API_KEY`**, mark it as secret, and give it **Functions** scope. For local development, put it in the ignored `.env`. Never use a `VITE_` prefix, paste it into the app, or commit it.
3. Exposure checks additionally require **`EXPOSURE_APPROVED_EMAILS`** (or legacy `OATHNET_APPROVED_EMAILS` if the shared variable is unset) with **Functions** scope. Its value is JSON mapping an **existing WitchSearch login** to email addresses the operator has independently verified that account owns or is authorized to investigate. Example using synthetic addresses:

   ```json
   {"researcher":["owned@example.com"],"security_team":["authorized@example.org"]}
   ```

   Verify the existing login and the email owner's control or written investigation permission **before** granting access. Username/password signup does not verify email ownership. There is no browser self-approval or owner-role override. Do not approve an unregistered username that someone else could subsequently register. To revoke access, remove the address from this JSON and redeploy. Invalid JSON, a non-array value, invalid addresses, or more than 20 addresses for a login deny that login's exposure checks. Only that login can retrieve its approved address list. This integration does not send verification emails.
4. **Infostealer Exposure Intelligence** also requires **`OATHNET_INFOSTEALER_ENABLED=true`**, with **Functions** scope. Set it only after confirming authorized access to OathNet's V2 stealer-search endpoint. The module is disabled by default and explains that API access is required. This switch does not bypass upstream permissions, quotas, or billing.
5. Deploy again after changing server environment variables; restart `npm run dev` locally. Open the OATHNET group in the tool directory. Select an approved email for either exposure module. Public profile tools take a platform identifier instead.

### Implemented API contracts

Contracts were read from the [official documentation index](https://docs.oathnet.org/llms.txt) and [OpenAPI specification](https://docs.oathnet.org/openapi.yaml) on 2026-10-21. Older `/api-reference/endpoints/...` documentation links are superseded by the current documentation paths.

| Feature | OathNet endpoint | Request and returned data |
| --- | --- | --- |
| Search session | `POST /api/service/search/init` | A fixed query/type payload; the returned `data.session.id` is passed as `search_id` to the lookup. |
| Discord public profile | `GET /api/service/discord-userinfo` | `discord_id` (14–19 digits); ID, username, display name, creation date. |
| Roblox public profile | `GET /api/service/roblox-userinfo` | Exact `username` or numeric `user_id`; ID, username, display name, join date. |
| Steam public profile | `GET /api/service/steam` | `steam_id` (vanity name or SteamID64); ID, username, visibility when supplied. |
| Xbox public profile | `GET /api/service/xbox` | `xbl_id` (gamertag/XUID); ID, gamertag, gamerscore, account tier when supplied. |
| Account Exposure Check | `POST /api/service/v2/breach/search` | Server-approved exact email equality filter; `fields[]=email,dbname` as repeated parameters. Shows status, counts and source names. |
| Infostealer Exposure Intelligence | `POST /api/service/v2/stealer/search` | Same approval and exact filter; projects `email`, `domain`, `pwned_at`, `indexed_at`. Shows status, affected domains, earliest/latest exposure timestamps, latest index timestamp and remediation advice. |

The POST search contracts document the field projection; the simple GET breach route does not document `fields[]`, so exposure checks use POST. Requests go only to fixed `https://oathnet.org/api` paths with the lowercase `x-api-key` header. Caller-supplied provider paths, filters, headers, and result-field choices are never forwarded. Redirects fail, both session and lookup share an 18-second deadline, responses are capped at 1 MB, and there are no automatic retries.

Exposure checks fetch one page of at most 100 records, verify every returned row belongs to the approved email, then construct a new summary from an explicit field allowlist. Infostealer rows containing more than one email are rejected rather than disclosing linked identities. Passwords, hashes, session cookies, tokens, raw URLs, logs, IPs, personal addresses, and unknown fields are neither returned nor stored in reports. Unexpected shapes or identity mismatches are **Unavailable**, never **No match**. Missing timestamps/domains are labeled unpublished. Summaries show provider totals, the number of rows checked, a partial-coverage notice when more pages exist, and a real check timestamp. No matches does not prove safety or absence of compromise. Saved reports and JSON exports contain the same sanitized summary.

Provider failures show safe messages for invalid keys (401), access/plan/quota denial (403), missing resources (404), rate limits (429), timeouts, or invalid responses. They refund WitchSearch credits. A healthy check with no matches costs one WitchSearch credit. Persistent store-backed OathNet limits apply across all six tools: 5 attempts/minute/account, 10/minute/IP, and 60/minute/site, in addition to the existing search limit and concurrent credit reservations. In Netlify, the existing function supplies the client IP; local development uses the socket address.

### Verification and deployment

Run the repository's checks before publishing:

```bash
npm ci
npm run check
npm test
npm run build
npm audit
```

OathNet tests use **synthetic fixtures**, including credential-bearing provider payloads to verify secret removal, per-login authorization, disabled access, exact outbound requests, malformed responses, provider errors, refunds and rate limits. These tests do not establish successful live OathNet access. The current implementation has **not been verified with a real authorized OathNet key**. A site operator must perform that final check using an approved account and confirm actual provider quota and endpoint access; do not interpret an unavailable response as a clean exposure result. No fixture fallback exists in the deployed application.

After committing the local changes and pushing the task branch to origin, deploy this implementation through the existing Git-connected Netlify site by selecting the branch containing these changes (`coderabbit/integrate-oathnet-search-apis/f90a50c3` for this task), or deploy from the checkout using the already documented Netlify CLI workflow. Keep the existing site, Blobs store, `netlify.toml`, `npm run build`, `dist`, and `netlify/functions` configuration. A frontend-only `dist` upload cannot deploy this integration. After deployment, check login, an existing public tool, OathNet profile lookup, an approved exposure check, and an unapproved check that must be rejected without spending credits. Existing accounts and reports remain in the same store. This task does not automatically publish to the live Netlify site.

## Unified exposure and additional intelligence providers

The unified search page now includes an **Exposure** tab. It checks each configured provider independently and shows provider attribution, per-source check times, clear unavailable states, and remediation advice. The **Unified Account Exposure** directory tool opens the same flow. Partial provider failure preserves successful results; only total provider failure refunds the WitchSearch credit. Existing username/public-profile, IP, domain, DNS and RDAP tools remain available.

### Additional server variables and required access

Set these with Netlify **Functions** scope (or in ignored local `.env`), then redeploy/restart. None may have a `VITE_` prefix.

| Variable | Required access and behavior |
| --- | --- |
| `EXPOSURE_APPROVED_EMAILS` | Recommended shared approval mapping, using the same JSON/login verification rules above. Applies to both unified and individual OathNet exposure checks. Takes precedence over legacy `OATHNET_APPROVED_EMAILS`; an explicit `{}` revokes all approvals. If unset/empty, the legacy variable is used. Example: `{"researcher":["owned@example.com"]}`. |
| `HIBP_API_KEY` | [Have I Been Pwned API subscription/key](https://haveibeenpwned.com/API/Key) permitting **email address search**. `GET /api/v3/breachedAccount/{email}?truncateResponse=false` uses `hibp-api-key` and the required WitchSearch User-Agent. HTTP 404 means no breach matches; 401/403/429 mean unavailable/access/quota errors. Only breach names, domains, counts and dates are shown, with no raw descriptions or records. Some sensitive/retired breaches are excluded by the provider; results are not exhaustive. A production key/subscription is required for real email checks. |
| `ABUSEIPDB_API_KEY` | [Registered AbuseIPDB account API key](https://www.abuseipdb.com/account/api). Free plans provide limited daily checks; higher limits require an appropriate plan. Adds a dedicated **AbuseIPDB Reputation** tool and enriches unified IP search when configured. Calls only `GET https://api.abuseipdb.com/api/v2/check` with `Key`, `ipAddress`, `maxAgeInDays=90`. No report submission, verbose raw reports or bypass of provider quotas. |
| `IPINFO_TOKEN` | Optional [IPinfo token](https://ipinfo.io/dashboard). Selects the documented `https://api.ipinfo.io/lite/{ip}` endpoint using `Authorization: Bearer …`; Lite returns country/ASN information and does not add city-level geolocation. Free Lite access requires an account/token; paid enrichment endpoints are not implemented. Without a token, the existing limited public IPinfo JSON lookup remains available. |
| `URLSCAN_API_KEY` | Optional [URLScan API key](https://urlscan.io/user/profile/) sent in the documented `api-key` header for existing public scan searches. Anonymous public search remains available with lower limits. The app searches existing scans; it does not submit URLs for scanning or retrieve private scans. Subscription quotas still apply. |

Official contracts were read from [HIBP API v3](https://haveibeenpwned.com/API/v3), [AbuseIPDB](https://docs.abuseipdb.com/), [URLScan](https://urlscan.io/docs/api/), and [IPinfo](https://ipinfo.io/developers). The pinned CodeRabbit emulator catalog does not provide these APIs or OathNet. Synthetic test fixtures are used only by the test runner; they never replace a production API response.

OathNet infostealer metadata remains opt-in through `OATHNET_INFOSTEALER_ENABLED=true`, requires provider permission, and uses the same server-approved account emails. Unified exposure does not silently enable that endpoint when only a breach key is configured. The shared exposure rate limits apply to both the unified and individual OathNet tools. All other search modes retain the existing account search rate limit.

### Observed verification for this change

All 58 automated tests passed, along with TypeScript checking and the production build. The dependency audit reported zero vulnerabilities. Live public checks returned IPinfo, Shodan, DNS/RDAP and URLScan results; HIBP returned a valid summary using its documented synthetic integration-test account and public test key. No production account credentials were used. OathNet and AbuseIPDB requests were verified with synthetic contract/error fixtures and still require real authorized keys and endpoint permissions for successful live verification. Optional authenticated IPinfo Lite and URLScan calls were fixture-tested; their anonymous public paths were tested live.
