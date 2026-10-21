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
| Ransomware Groups | Ransomware.live public group summaries; no stolen files |
| Crypto Address Analyzer / App Store Search | Bitcoin balances/activity via Blockstream / published iOS app listings |
| Forums Search | Hacker News story and comment search through Algolia |
| Roblox / Roblox Profile Scraper | Public profile, joined date, description, friend/follower/following counts; individual fields may be restricted |
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
