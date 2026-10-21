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
   | `BRAVE_SEARCH_API_KEY` | Optional. Enables Web Databases, Live Intelligence, and web enrichment.                                            |

   The requested codes are configured in the current sandbox’s private `.env`. They are deliberately excluded from source archives and the browser bundle. Enter the same codes in Netlify. Do not prefix these variables with `VITE_`; they belong exclusively on the server. If both codes match, creator takes precedence, so use distinct values.

4. Deploy. Netlify Blobs is accessed through the function’s built-in site context; no database URL or manually copied Netlify token is required. The site needs a Netlify plan with Functions and Blobs available. Accounts persist across deploys of the same site, including deploy previews; use a separate site for isolated test data.
5. On the deployed site, create a normal account, log out, log back in, and run a search. Check the `creator` account and the **Payment requests** page. Confirm these checks before accepting real purchases. Production-hosted Blobs has not been exercised from this local sandbox.

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

| Tool                                                              | Implementation                                                                                                                                                                                   |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unified username search                                           | GitHub, GitLab, Hacker News, Roblox, and Reddit public profiles                                                                                                                                  |
| GitHub / Forums Search / Roblox / Roblox Profile Scraper / Reddit | Source-specific profile queries; JSON export. Forums Search currently covers Hacker News. Roblox scraper currently exports public profile identifiers, not a complete inventory or friend graph. |
| Email Search / Gmail Lookup                                       | DNS and registration data for the email’s domain, plus public web mentions if Brave is configured. Does not verify mailbox existence, reveal a mailbox owner, or access messages.                |
| Whois / DNS Recon                                                 | IANA-discovered RDAP registry data; public A, AAAA, MX, NS, TXT records via Google DNS                                                                                                           |
| IP Info                                                           | Public IPv4 registration and reverse DNS. No precise person/device location. IPv6 is not supported yet.                                                                                          |
| Certificate Lookup                                                | crt.sh certificate transparency records, up to 30 returned records                                                                                                                               |
| Wayback Machine                                                   | Nearest public archived snapshot                                                                                                                                                                 |
| URLScan                                                           | Up to 15 existing public observations; does not submit scans                                                                                                                                     |
| CVE / KEV                                                         | Published CVE Program records. KEV enrichment is not connected.                                                                                                                                  |
| Crypto Address Analyzer                                           | Bitcoin mainnet confirmed balance and transaction counts through Blockstream. Other chains and identity attribution are not supported.                                                           |
| App Store Search                                                  | Up to 12 public iOS application listings                                                                                                                                                         |
| Web Databases / Live Intelligence                                 | Brave Search, when `BRAVE_SEARCH_API_KEY` is set                                                                                                                                                 |

The remaining screenshot entries—face search, image geolocation, Hudson Rock, Horus, phone/address/person/court search, cell towers, Shodan, AI assistants, Wi-Fi/BSSID, VirusTotal tools, ransomware groups, Telegram, link resolution, LinkedIn, Discord, TikTok, Instagram, Xbox, PlayStation, Epic Games, Steam, and IntelX—are **catalog entries awaiting real provider implementations and authorization**, not working integrations that become enabled by supplying an arbitrary key. Their screens explain the missing provider and charge no credits. Double Counter Bypass is not implemented.

Public APIs may block cloud traffic, rate limit requests, return no matches, or go down. The app reports each source separately and refunds searches when all sources fail. In sandbox verification, GitHub, Roblox, Hacker News, DNS, RDAP, Wayback, URLScan, CVE, App Store, and Blockstream returned records. Reddit blocked cloud requests; crt.sh returned a gateway error. These providers are not under the application’s control.

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
