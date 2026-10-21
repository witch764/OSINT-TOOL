import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  AtSign,
  Bell,
  Bitcoin,
  Bookmark,
  BookOpen,
  Bot,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Code2,
  Coins,
  Copy,
  Database,
  FileSearch,
  Folder,
  Gamepad2,
  Github,
  Globe2,
  Grid2X2,
  HelpCircle,
  History,
  Infinity as InfinityIcon,
  KeyRound,
  Layers,
  Link2,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mail,
  Menu,
  MessagesSquare,
  Network,
  Plus,
  Radar,
  Radio,
  Search as SearchIcon,
  Settings2,
  Shield,
  ShieldCheck,
  Sparkles,
  User as UserIcon,
  Users,
  Wallet,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import { api, errorText, exportSearch, safeUrl } from "./api";
import type { Config, Payment, Search, Tool, User } from "./types";
import "./styles.css";
import { ImageGeo } from "./ImageGeo";
import { researchLinks } from "./research";

const icons: Record<string, typeof SearchIcon> = {
  database: Database,
  scan: FileSearch,
  locate: Radar,
  mail: Mail,
  shield: Shield,
  phone: Radio,
  home: Building2,
  user: UserIcon,
  scale: Layers,
  radio: Radio,
  server: Network,
  building: Building2,
  radar: Radar,
  sparkles: Sparkles,
  file: FileSearch,
  history: History,
  wifi: Wifi,
  globe: Globe2,
  bug: Code2,
  download: ArrowDownToLine,
  bitcoin: Bitcoin,
  grid: Grid2X2,
  send: ArrowUpRight,
  messages: MessagesSquare,
  link: Link2,
  github: Github,
  game: Gamepad2,
  video: Activity,
  camera: FileSearch,
  bot: Bot,
  folders: Folder,
};
const modes = [
  {
    id: "username",
    name: "Username",
    icon: AtSign,
    placeholder: "Enter a username to follow the trail…",
    example: "octocat",
  },
  {
    id: "email",
    name: "Email",
    icon: Mail,
    placeholder: "Enter an email to inspect its domain…",
    example: "hello@example.com",
  },
  {
    id: "domain",
    name: "Domain",
    icon: Globe2,
    placeholder: "Enter a domain to investigate…",
    example: "github.com",
  },
  {
    id: "ip",
    name: "IP address",
    icon: Network,
    placeholder: "Enter a public IPv4 address…",
    example: "8.8.8.8",
  },
  {
    id: "web",
    name: "Web search",
    icon: SearchIcon,
    placeholder: "Search public web information…",
    example: "open source intelligence",
  },
];
const extraExamples: Record<string, string> = {
  certificate: "example.com",
  wayback: "example.com",
  urlscan: "example.com",
  cve: "CVE-2024-3094",
  appstore: "Signal",
  crypto: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
};
function Logo({ small = false }: { small?: boolean }) {
  return (
    <div className={`brand ${small ? "small" : ""}`}>
      <span className="brand-mark">
        <span>W</span>
        <i />
      </span>
      <span>
        witch<span className="brand-light">search</span>
        <span className="brand-dot">.</span>
      </span>
    </div>
  );
}
function Spinner() {
  return <LoaderCircle className="spin" size={17} />;
}
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function Auth({
  onLogin,
  config,
}: {
  onLogin: (user: User) => void;
  config: Config;
}) {
  const [tab, setTab] = useState<"signup" | "login" | "code">("signup");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const change = (next: typeof tab) => {
    setTab(next);
    setError("");
  };
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api<{ user: User }>(
        `/auth/${tab}`,
        tab === "code" ? { code } : { username, password },
      );
      onLogin(result.user);
    } catch (error) {
      setError(errorText(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <header>
        <Logo />
        <span className="auth-caption">OPEN-SOURCE INTELLIGENCE</span>
      </header>
      <main className="auth-layout">
        <section className="auth-story">
          <span className="eyebrow">
            <span className="live-dot" /> A CLEARER PICTURE STARTS HERE
          </span>
          <h1>
            Every trace.
            <br />A new <em>discovery.</em>
          </h1>
          <p>
            Connect the dots across the public web.
            <br />
            One workspace. A world of intelligence.
          </p>
          <div className="auth-orbit">
            <div className="orbit o1" />
            <div className="orbit o2" />
            <div className="orbit o3" />
            <div className="orbit-center">
              <Radar size={45} />
            </div>
            <span className="orbit-node node1">
              <Github size={25} />
            </span>
            <span className="orbit-node node2">
              <Globe2 size={25} />
            </span>
            <span className="orbit-node node3">
              <Network size={25} />
            </span>
            <span className="orbit-node node4">
              <AtSign size={25} />
            </span>
            <div className="orbit-label">
              <span className="live-dot" /> Follow the public trail
            </div>
          </div>
          <div className="auth-points">
            <span>
              <ShieldCheck size={16} /> Private workspace
            </span>
            <span>
              <Link2 size={16} /> Source-linked results
            </span>
          </div>
        </section>
        <section className="auth-card">
          <div className="auth-icon">
            <SearchIcon size={25} />
          </div>
          <h2>
            {tab === "signup"
              ? "Your next discovery awaits."
              : tab === "login"
                ? "Welcome back."
                : "Access your workspace."}
          </h2>
          <p>
            {tab === "signup"
              ? "Create an account. Start with 5 free credits."
              : tab === "login"
                ? "Log in to pick up where you left off."
                : "Enter your private account access code."}
          </p>
          <div className="auth-tabs">
            <button
              className={tab === "signup" ? "selected" : ""}
              onClick={() => change("signup")}
            >
              Create account
            </button>
            <button
              className={tab === "login" ? "selected" : ""}
              onClick={() => change("login")}
            >
              Log in
            </button>
          </div>
          <form onSubmit={submit}>
            {tab === "code" ? (
              <label>
                Access code
                <input
                  autoFocus
                  type="password"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  autoComplete="off"
                  maxLength={128}
                  placeholder="Your private code"
                />
              </label>
            ) : (
              <>
                <label>
                  Username
                  <input
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    pattern="[A-Za-z0-9_]{3,24}"
                    minLength={3}
                    maxLength={24}
                    required
                    placeholder="Choose your username"
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={
                      tab === "signup" ? "new-password" : "current-password"
                    }
                    minLength={8}
                    maxLength={128}
                    required
                    placeholder="At least 8 characters"
                  />
                </label>
              </>
            )}
            {error && (
              <div className="error-box" role="alert">
                {error}
              </div>
            )}
            <button className="primary full" disabled={busy}>
              {busy ? <Spinner /> : null}
              {tab === "signup"
                ? "Create account"
                : tab === "login"
                  ? "Log in"
                  : "Unlock account"}
              <ArrowRight size={17} />
            </button>
          </form>
          {config.accessCodes && (
            <button
              className="code-button"
              onClick={() => change(tab === "code" ? "login" : "code")}
            >
              <KeyRound size={14} />
              {tab === "code"
                ? "Back to normal login"
                : "Have an account access code?"}
            </button>
          )}
          <div className="auth-note">
            <LockKeyhole size={14} />
            <span>
              No email. No verification. Just a username and password.
            </span>
          </div>
          {tab === "signup" && (
            <small>
              Keep your password safe. There is no email-based recovery.
            </small>
          )}
        </section>
      </main>
      <footer>
        © {new Date().getFullYear()} WitchSearch
        <span>Public information. Meaningful connections.</span>
      </footer>
    </div>
  );
}
function App() {
  const [config, setConfig] = useState<Config | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [startupError, setStartupError] = useState("");
  useEffect(() => {
    Promise.all([
      api<Config>("/config").then(setConfig),
      api<{ user: User }>("/auth/me")
        .then((r) => setUser(r.user))
        .catch((e) => {
          if (e.status !== 401) throw e;
        }),
    ])
      .catch((e) => setStartupError(errorText(e)))
      .finally(() => setReady(true));
  }, []);
  if (!ready)
    return (
      <div className="loading-screen">
        <Logo />
        <Spinner />
      </div>
    );
  if (!config || startupError)
    return (
      <div className="loading-screen">
        <Logo />
        <p>{startupError || "Unable to load the app."}</p>
        <button className="primary" onClick={() => location.reload()}>
          Try again
        </button>
      </div>
    );
  if (!user) return <Auth config={config} onLogin={setUser} />;
  return <Workspace user={user} setUser={setUser} config={config} />;
}
function Workspace({
  user,
  setUser,
  config,
}: {
  user: User;
  setUser: (user: User | null) => void;
  config: Config;
}) {
  const [page, setPage] = useState("dashboard");
  const [tool, setTool] = useState<Tool | null>(null);
  const [mode, setMode] = useState("username");
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<Search[]>([]);
  const [active, setActive] = useState<Search | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [mobile, setMobile] = useState(false);
  const [compactScreen, setCompactScreen] = useState(
    () => matchMedia("(max-width: 800px)").matches,
  );
  const [modal, setModal] = useState<
    "credits" | "help" | "account" | "updates" | null
  >(null);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [directoryFilter, setDirectoryFilter] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const refresh = async () => {
    try {
      const [h, u] = await Promise.all([
        api<{ history: Search[] }>("/history"),
        api<{ user: User }>("/auth/me"),
      ]);
      setHistory(h.history);
      setUser(u.user);
    } catch (e) {
      if ((e as { status?: number }).status === 401) setUser(null);
      else setError(errorText(e));
    }
  };
  useEffect(() => {
    void refresh();
  }, []);
  useEffect(() => {
    const media = matchMedia("(max-width: 800px)");
    const change = () => setCompactScreen(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [page, tool?.id]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(id);
  }, [toast]);
  function navigate(next: string) {
    setPage(next);
    setTool(null);
    setActive(null);
    setError("");
    setMobile(false);
  }
  function openTool(t: Tool) {
    setTool(t);
    setPage("search");
    setMode(t.mode || "username");
    setActive(null);
    setError("");
    setQuery("");
    setMobile(false);
  }
  function openReport(h: Search) {
    setActive(h);
    setPage("search");
    setTool(
      config.toolGroups
        .flatMap((g) => g.tools)
        .find((t) => t.id === h.toolId) || null,
    );
    setMode(h.mode);
    setQuery(h.query);
    setSourceFilter("all");
    setError("");
    setMobile(false);
  }
  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setActive(null);
    setSourceFilter("all");
    try {
      const r = await api<{ search: Search; user: User }>("/search", {
        mode,
        query,
        ...(tool ? { toolId: tool.id } : {}),
      });
      setActive(r.search);
      setUser(r.user);
      setHistory((h) => [r.search, ...h.filter((x) => x.id !== r.search.id)]);
      if (r.search.error) setError(r.search.error);
    } catch (e) {
      setError(errorText(e));
      if ((e as { status?: number }).status === 401) setUser(null);
    } finally {
      setBusy(false);
    }
  }
  async function save(item: Search) {
    try {
      const r = await api<{ history: Search[] }>("/history/save", {
        id: item.id,
        saved: !item.saved,
      });
      setHistory(r.history);
      if (active?.id === item.id)
        setActive(r.history.find((h) => h.id === item.id) || null);
      setToast(
        item.saved
          ? "Removed from saved searches"
          : "Search saved to your cases",
      );
    } catch (e) {
      setError(errorText(e));
    }
  }
  async function logout() {
    try {
      await api("/auth/logout", {});
      setUser(null);
    } catch (e) {
      setError(errorText(e));
    }
  }
  const allTools = config.toolGroups.flatMap((g) => g.tools);
  const availableCount = allTools.filter((t) => t.available).length;
  const currentMode = modes.find((m) => m.id === mode);
  const example = tool?.example || currentMode?.example || extraExamples[mode] || "";
  const completed = history.filter((h) => h.status === "complete");
  const found = completed.reduce(
    (sum, h) => sum + h.sources.reduce((n, s) => n + s.results.length, 0),
    0,
  );
  const selectedHistory =
    page === "cases" ? history.filter((h) => h.saved) : history;
  const title =
    page === "dashboard"
      ? "Overview"
      : page === "activity"
        ? "Activity"
        : page === "cases"
          ? "Saved cases"
          : page === "directory"
            ? "Tool directory"
            : page === "payments"
              ? "Payment requests"
              : tool?.name || "Unified search";
  const renderedResults =
    active?.sources
      .flatMap((s) => s.results)
      .filter((r) => sourceFilter === "all" || r.source === sourceFilter) || [];
  const searchPanel = (
    <section className={`search-panel ${busy ? "is-searching" : ""}`}>
      <div className="search-panel-top">
        <div>
          <span className="section-kicker">
            <Radar size={14} />{" "}
            {tool ? tool.name.toUpperCase() : "UNIFIED SEARCH"}
          </span>
          <h2>
            {tool
              ? "Start with what you know."
              : "One search. Connect the dots."}
          </h2>
        </div>
        <span className="cost-chip">
          <Coins size={13} /> 1 credit / search
        </span>
      </div>
      {tool ? (
        <p className="tool-description">
          {tool.description || `Search with ${tool.name}.`}
        </p>
      ) : (
        <div className="search-tabs" role="tablist" aria-label="Search type">
          {modes.map((m) => (
            <button
              role="tab"
              aria-selected={mode === m.id}
              key={m.id}
              className={mode === m.id ? "active" : ""}
              onClick={() => {
                setMode(m.id);
                setQuery("");
                setError("");
              }}
            >
              <m.icon size={15} />
              {m.name}
              {m.id === "web" && !config.webSearch && <LockKeyhole size={11} />}
            </button>
          ))}
        </div>
      )}
      <form onSubmit={search} className="search-form">
        <SearchIcon size={21} />
        <input
          ref={input}
          aria-label="Search query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            tool?.placeholder || currentMode?.placeholder ||
            `Enter ${mode === "cve" ? "a CVE identifier" : mode === "crypto" ? "a Bitcoin address" : mode === "appstore" ? "an app or developer name" : "a domain"}…`
          }
          required
          minLength={2}
          maxLength={160}
          disabled={busy}
        />
        <button
          className="primary"
          disabled={busy || (!tool && mode === "web" && !config.webSearch)}
        >
          {busy ? <Spinner /> : <SearchIcon size={16} />}
          <span>{busy ? "Searching" : "Search"}</span>
          <span className="keyboard-hint">↵</span>
        </button>
      </form>
      <div className="search-bottom">
        <span>
          Try an example:{" "}
          <button
            disabled={busy}
            onClick={() => {
              setQuery(example);
              input.current?.focus();
            }}
          >
            {example}
            <ArrowUpRight size={11} />
          </button>
        </span>
        <span>
          <ShieldCheck size={12} /> Public sources only
        </span>
      </div>
      {mode === "email" && (
        <p className="inline-note">
          Email searches inspect the domain and public mentions. They don’t
          confirm mailbox ownership or expose private messages.
        </p>
      )}
      {mode === "web" && !config.webSearch && (
        <p className="inline-note">
          Connect a Brave Search API key in Netlify to enable web search.
        </p>
      )}
    </section>
  );
  return (
    <div className="app-shell">
      {mobile && (
        <button
          aria-label="Close navigation"
          className="mobile-shade"
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        className={`sidebar ${mobile ? "open" : ""}`}
        inert={compactScreen && !mobile}
      >
        <div className="sidebar-brand">
          <Logo small />
          <span className="beta">BETA</span>
        </div>
        <div className="workspace-label">
          <span className="workspace-avatar">W</span>
          <div>
            Personal workspace<small>Intelligence, organized.</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          <div className="primary-nav">
            {[
              { id: "dashboard", label: "Dashboard", icon: Grid2X2 },
              { id: "search", label: "Unified Search", icon: SearchIcon },
              { id: "cases", label: "Cases", icon: Folder },
              { id: "activity", label: "Activity", icon: History },
              { id: "directory", label: "All tools", icon: Layers },
            ].map((n) => (
              <button
                key={n.id}
                className={
                  page === n.id && !tool ? "nav-item active" : "nav-item"
                }
                onClick={() => navigate(n.id)}
              >
                <n.icon size={17} />
                <span>{n.label}</span>
                {n.id === "directory" && (
                  <span className="nav-count">{allTools.length}</span>
                )}
              </button>
            ))}
            <button className="nav-item" onClick={() => setModal("updates")}>
              <Bell size={17} />
              <span>Updates</span>
            </button>
            <button
              className="nav-item"
              onClick={() =>
                openTool({
                  id: "witch-ai",
                  name: "Witch AI",
                  icon: "sparkles",
                  provider: "AI inference provider",
                  available: false,
                  description:
                    "An AI assistant requires a connected inference provider. No model is connected yet.",
                })
              }
            >
              <Sparkles size={17} />
              <span>Witch AI</span>
              <LockKeyhole size={11} />
            </button>
          </div>
          {config.toolGroups.map((g) => (
            <div className="nav-group" key={g.label}>
              <span className="nav-label">{g.label}</span>
              {g.tools.map((t) => {
                const Icon = icons[t.icon] || SearchIcon;
                return (
                  <button
                    title={
                      t.available ? t.description : `Requires ${t.provider}`
                    }
                    key={t.id}
                    className={`nav-item ${tool?.id === t.id ? "active" : ""}`}
                    onClick={() => openTool(t)}
                  >
                    <Icon size={17} />
                    <span>{t.name}</span>
                    {!t.available && (
                      <LockKeyhole className="nav-lock" size={11} />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
          {user.role === "owner" && (
            <div className="nav-group">
              <span className="nav-label">CREATOR</span>
              <button
                className={`nav-item ${page === "payments" ? "active" : ""}`}
                onClick={() => navigate("payments")}
              >
                <Wallet size={17} />
                Payment requests
              </button>
            </div>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="credit-label">
            <span>
              <Coins size={13} /> Credits
            </span>
            <button onClick={() => setModal("credits")}>
              <Plus size={13} /> Add
            </button>
          </div>
          <div className="credit-track">
            <span
              style={{
                width: `${user.unlimited ? 100 : Math.min(100, ((user.credits || 0) / 5) * 100)}%`,
              }}
            />
          </div>
          <div className="credit-amount">
            {user.unlimited ? (
              <>
                <InfinityIcon size={14} /> Unlimited credits
              </>
            ) : (
              <>
                <strong>{user.credits}</strong> credits remaining
              </>
            )}
          </div>
          <div className="account-row">
            <button
              className="account-open"
              onClick={() => setModal("account")}
            >
              <span className="avatar">{user.username[0].toUpperCase()}</span>
              <span>
                {user.username}
                <small>
                  {user.role === "owner"
                    ? "Creator account"
                    : user.unlimited
                      ? "Unlimited account"
                      : "Personal account"}
                </small>
              </span>
            </button>
            <button
              aria-label="Log out"
              className="icon-button"
              onClick={logout}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <span className="breadcrumb">
              Workspace <ChevronRight size={12} />
            </span>
            <span>{title}</span>
          </div>
          <div className="topbar-right">
            <span className="live-status">
              <span className="live-dot" /> Public-source intelligence
            </span>
            <button
              className="icon-button"
              aria-label="Product updates"
              onClick={() => setModal("updates")}
            >
              <Bell size={18} />
              <i className="notification-dot" />
            </button>
            <span className="topbar-divider" />
            <button
              className="icon-button"
              aria-label="Help"
              onClick={() => setModal("help")}
            >
              <HelpCircle size={19} />
            </button>
            <button
              className="mini-avatar"
              onClick={() => setModal("account")}
              aria-label="Account settings"
            >
              {user.username[0].toUpperCase()}
            </button>
          </div>
        </header>
        <main className="main-content">
          {page === "dashboard" && !active && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">YOUR INTELLIGENCE WORKSPACE</span>
                  <h1>
                    Welcome back, {user.username}
                    <span className="greeting-dot">.</span>
                  </h1>
                  <p>
                    Follow the trail. Find the connection. See the bigger
                    picture.
                  </p>
                </div>
                <span className="date-label">
                  <Clock3 size={14} />
                  {new Date().toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="stats-grid">
                <Stat
                  icon={SearchIcon}
                  name="Searches made"
                  value={String(completed.length)}
                  note="In your recent activity"
                />
                <Stat
                  icon={Database}
                  name="Records discovered"
                  value={String(found)}
                  note="From public sources"
                />
                <Stat
                  icon={Layers}
                  name="Available tools"
                  value={String(availableCount)}
                  note="Ready to investigate"
                />
                <Stat
                  icon={Coins}
                  name="Available credits"
                  value={user.unlimited ? "∞" : String(user.credits)}
                  note={
                    user.unlimited
                      ? "Unlimited access"
                      : "Make every search count"
                  }
                  accent
                />
              </div>
            </>
          )}
          {(page === "dashboard" || page === "search") && (
            <>
              {page === "search" && (
                <div className="page-heading compact">
                  <div>
                    <span className="eyebrow">
                      {tool ? "INVESTIGATION TOOL" : "FOLLOW THE PUBLIC TRAIL"}
                    </span>
                    <h1>
                      {tool?.name || "Unified search"}
                      <span className="greeting-dot">.</span>
                    </h1>
                    <p>
                      {tool && !tool.available
                        ? "This integration is not connected yet."
                        : "Real sources. Useful context. All in one place."}
                    </p>
                  </div>
                </div>
              )}
              {tool?.mode === 'local-image' ? <ImageGeo /> : tool && !tool.available ? (
                <section className="connection-panel">
                  <span className="connection-icon">
                    <LockKeyhole size={27} />
                  </span>
                  <span className="pill muted">{tool.mode ? "PROVIDER SETUP" : "NOT CONNECTED"}</span>
                  <h2>{tool.name}</h2>
                  <p>
                    {tool.description ||
                      `This tool requires an authorized ${tool.provider} integration. No data provider is connected yet.`}
                  </p>
                  <div className="connection-detail">
                    <span>Required integration</span>
                    <strong>{tool.provider}</strong>
                    <span>Status</span>
                    <strong>{tool.mode ? 'Provider credentials required' : 'Backend integration not implemented'}</strong>
                    {tool.requiredEnv && <><span>Netlify environment variable</span><strong>{tool.requiredEnv}</strong></>}
                    <span>Search cost</span>
                    <strong>No credits charged</strong>
                  </div>
                  {tool.setupUrl && <a className="secondary" href={safeUrl(tool.setupUrl)} target="_blank" rel="noopener noreferrer">Open provider setup <ArrowUpRight size={15} /></a>}
                  <button
                    className="secondary"
                    onClick={() => navigate("directory")}
                  >
                    Explore available tools
                    <ArrowRight size={15} />
                  </button>
                </section>
              ) : (
                <>
                  {searchPanel}
                  {error && (
                    <div className="error-box search-error" role="alert">
                      {error}
                    </div>
                  )}
                  {busy && (
                    <div className="searching-state">
                      <span className="radar-animation">
                        <Radar size={36} />
                      </span>
                      <h3>Following the public trail…</h3>
                      <p>Querying live sources and collecting evidence.</p>
                    </div>
                  )}
                  {active && !busy && (
                    <section className="results-section">
                      <div className="section-heading">
                        <div>
                          <span className="eyebrow">SEARCH REPORT</span>
                          <h2>
                            Results for{" "}
                            <span className="purple">{active.query}</span>
                          </h2>
                          <p>
                            {active.sources.reduce(
                              (n, s) => n + s.results.length,
                              0,
                            )}{" "}
                            records · {active.sources.length} sources checked ·{" "}
                            {new Date(active.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="button-row">
                          <button
                            className={`secondary ${active.saved ? "saved" : ""}`}
                            onClick={() => save(active)}
                          >
                            <Bookmark size={14} />
                            {active.saved ? "Saved" : "Save"}
                          </button>
                          <button
                            className="secondary"
                            onClick={() => exportSearch(active)}
                          >
                            <ArrowDownToLine size={14} />
                            Export
                          </button>
                        </div>
                      </div>
                      <div className="source-statuses">
                        {active.sources.map((s) => (
                          <span
                            key={s.name}
                            className={`source-status ${s.status}`}
                          >
                            <span />
                            {s.name}
                            <small>
                              {s.status === "found"
                                ? `${s.results.length} found`
                                : s.status === "no_match"
                                  ? "No match"
                                  : "Unavailable"}
                            </small>
                          </span>
                        ))}
                      </div>
                      {active.sources.length > 1 && (
                        <div className="filter-row">
                          <button
                            className={sourceFilter === "all" ? "active" : ""}
                            onClick={() => setSourceFilter("all")}
                          >
                            All results
                          </button>
                          {active.sources
                            .filter((s) => s.results.length)
                            .map((s) => (
                              <button
                                key={s.name}
                                className={
                                  sourceFilter === s.name ? "active" : ""
                                }
                                onClick={() => setSourceFilter(s.name)}
                              >
                                {s.name}
                              </button>
                            ))}
                        </div>
                      )}
                      <div className="results-grid">
                        {renderedResults.map((r, i) => (
                          <article className="result-card" key={i}>
                            <div className="result-top">
                              <span className="source-icon">
                                <Database size={18} />
                              </span>
                              <span>
                                {r.source}
                                <small>Public record</small>
                              </span>
                              <a
                                href={safeUrl(r.url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="icon-button"
                                aria-label={`Open ${r.source} source`}
                              >
                                <ArrowUpRight size={17} />
                              </a>
                            </div>
                            <h3>{r.title}</h3>
                            <p>{r.description}</p>
                            <dl>
                              {r.fields.map((f, j) => (
                                <div key={j}>
                                  <dt>{f.label}</dt>
                                  <dd>{f.value}</dd>
                                </div>
                              ))}
                            </dl>
                            <a
                              className="source-link"
                              href={safeUrl(r.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View original source
                              <ArrowUpRight size={13} />
                            </a>
                          </article>
                        ))}
                      </div>
                      {!renderedResults.length && (
                        <Empty
                          icon={SearchIcon}
                          title={
                            active.status === "failed"
                              ? "Sources couldn’t be reached"
                              : "No public matches found"
                          }
                          text={
                            active.status === "failed"
                              ? "Your credit was refunded. Try again later."
                              : "No matching records were returned by the available sources. Try another identifier."
                          }
                        />
                      )}
                      <div className="research-links">
                        <h3>Continue in the public sources</h3>
                        <p>These links open external searches or profile candidates. They are not verified matches and cost no extra credits.</p>
                        <div className="button-row">{researchLinks(active.mode, active.query, allTools.find(t => t.id === active.toolId)).map(link => <a key={link.name} className="secondary" href={link.url} target="_blank" rel="noopener noreferrer">{link.name}<ArrowUpRight size={14} /></a>)}</div>
                      </div>
                      <p className="report-note">
                        <ShieldCheck size={13} /> A matching username is a lead,
                        not proof that accounts belong to the same person.
                      </p>
                    </section>
                  )}
                </>
              )}
              {page === "dashboard" && !active && !busy && (
                <>
                  <div className="dashboard-columns">
                    <section className="panel recent-panel">
                      <div className="panel-heading">
                        <h2>
                          <History size={17} />
                          Recent activity
                        </h2>
                        <button onClick={() => navigate("activity")}>
                          View all
                          <ArrowRight size={13} />
                        </button>
                      </div>
                      {history.length ? (
                        <div className="recent-list">
                          {history.slice(0, 4).map((h) => (
                            <button key={h.id} onClick={() => openReport(h)}>
                              <span className="recent-icon">
                                {h.mode === "username" ? (
                                  <AtSign size={16} />
                                ) : (
                                  <Globe2 size={16} />
                                )}
                              </span>
                              <span className="recent-query">
                                {h.query}
                                <small>
                                  {allTools.find((t) => t.id === h.toolId)
                                    ?.name || h.mode}{" "}
                                  search
                                </small>
                              </span>
                              <span className={`small-status ${h.status}`}>
                                {h.status === "complete"
                                  ? `${h.sources.reduce((n, s) => n + s.results.length, 0)} records`
                                  : h.status}
                              </span>
                              <ChevronRight size={14} />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="recent-empty">
                          <span>
                            <History size={25} />
                          </span>
                          <h3>Your trail starts here</h3>
                          <p>
                            Your searches will appear here.
                            <br />
                            Run your first search above.
                          </p>
                        </div>
                      )}
                    </section>
                    <section className="discovery-card">
                      <span className="discovery-orbit" />
                      <span className="pill">
                        <Sparkles size={11} /> DISCOVER MORE
                      </span>
                      <h2>
                        A small detail.
                        <br />A bigger picture.
                      </h2>
                      <p>
                        Explore your toolkit and turn public information into
                        useful insights.
                      </p>
                      <button
                        className="secondary"
                        onClick={() => navigate("directory")}
                      >
                        Explore all tools
                        <ArrowUpRight size={15} />
                      </button>
                      <Radar className="discovery-radar" size={116} />
                    </section>
                  </div>
                  <section className="quick-tools">
                    <div className="section-heading">
                      <div>
                        <h2>Your investigation toolkit</h2>
                        <p>A good starting point for your next discovery.</p>
                      </div>
                      <button
                        className="text-button"
                        onClick={() => navigate("directory")}
                      >
                        All tools
                        <ArrowRight size={14} />
                      </button>
                    </div>
                    <div className="tool-grid">
                      {["github", "dns", "ip", "wayback"].map((id) => {
                        const t = allTools.find((t) => t.id === id)!;
                        const Icon = icons[t.icon] || SearchIcon;
                        return (
                          <button
                            className="tool-card"
                            key={id}
                            onClick={() => openTool(t)}
                          >
                            <span className="tool-icon">
                              <Icon size={21} />
                            </span>
                            <ArrowUpRight size={15} />
                            <h3>{t.name}</h3>
                            <p>
                              {id === "github"
                                ? "Follow a public profile."
                                : id === "dns"
                                  ? "Map the domain’s footprint."
                                  : id === "ip"
                                    ? "See the network behind an IP."
                                    : "Explore a domain’s past."}
                            </p>
                            <span className="tool-category">
                              {id === "github" ? "SOCIAL" : "INFRASTRUCTURE"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                </>
              )}
            </>
          )}
          {(page === "activity" || page === "cases") && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">YOUR WORKSPACE</span>
                  <h1>
                    {page === "cases" ? "Saved cases" : "Search activity"}
                    <span className="greeting-dot">.</span>
                  </h1>
                  <p>
                    {page === "cases"
                      ? "Keep useful findings close. Open a saved report to continue."
                      : "Every search, source, and discovery in one place."}
                  </p>
                </div>
                <button className="secondary" onClick={() => void refresh()}>
                  <History size={14} />
                  Refresh
                </button>
              </div>
              {error && <div className="error-box">{error}</div>}
              <section className="panel history-panel">
                {selectedHistory.length ? (
                  selectedHistory.map((h) => (
                    <div className="history-row" key={h.id}>
                      <span className="recent-icon">
                        <SearchIcon size={18} />
                      </span>
                      <button
                        className="history-open"
                        onClick={() => openReport(h)}
                      >
                        <strong>{h.query}</strong>
                        <small>
                          {h.mode} · {new Date(h.createdAt).toLocaleString()}
                        </small>
                      </button>
                      <span className={`small-status ${h.status}`}>
                        {h.status}
                      </span>
                      <button
                        className="icon-button"
                        aria-label={h.saved ? "Unsave search" : "Save search"}
                        onClick={() => save(h)}
                      >
                        <Bookmark
                          size={16}
                          fill={h.saved ? "currentColor" : "none"}
                        />
                      </button>
                      <button
                        className="icon-button"
                        aria-label="Export search"
                        onClick={() => exportSearch(h)}
                      >
                        <ArrowDownToLine size={16} />
                      </button>
                    </div>
                  ))
                ) : (
                  <Empty
                    icon={page === "cases" ? Folder : History}
                    title={
                      page === "cases"
                        ? "Room for your next discovery"
                        : "No searches yet"
                    }
                    text={
                      page === "cases"
                        ? "Save a search report to add it to your cases."
                        : "Run a search and your activity will appear here."
                    }
                  />
                )}
              </section>
            </>
          )}
          {page === "directory" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">BUILT FOR CURIOUS MINDS</span>
                  <h1>
                    Your intelligence toolkit
                    <span className="greeting-dot">.</span>
                  </h1>
                  <p>
                    {availableCount} tools ready to use. Provider integrations
                    are labeled below.
                  </p>
                </div>
              </div>
              <div className="directory-search">
                <SearchIcon size={18} />
                <input
                  aria-label="Find a tool"
                  value={directoryFilter}
                  onChange={(e) => setDirectoryFilter(e.target.value)}
                  placeholder="Find a tool…"
                />
              </div>
              {config.toolGroups.map((g) => {
                const tools = g.tools.filter((t) =>
                  t.name.toLowerCase().includes(directoryFilter.toLowerCase()),
                );
                return tools.length ? (
                  <section className="directory-group" key={g.label}>
                    <h2>{g.label}</h2>
                    <div className="tool-grid">
                      {tools.map((t) => {
                        const Icon = icons[t.icon] || SearchIcon;
                        return (
                          <button
                            key={t.id}
                            className={`tool-card ${!t.available ? "needs-provider" : ""}`}
                            onClick={() => openTool(t)}
                          >
                            <span className="tool-icon">
                              <Icon size={21} />
                            </span>
                            {t.available ? (
                              <ArrowUpRight size={15} />
                            ) : (
                              <LockKeyhole size={14} />
                            )}
                            <h3>{t.name}</h3>
                            <p>
                              {t.description ||
                                `Requires a ${t.provider} connection.`}
                            </p>
                            <span
                              className={`availability ${t.available ? "available" : ""}`}
                            >
                              <span />
                              {t.available ? "Available" : t.mode ? "Provider setup" : "Not connected"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ) : null;
              })}
            </>
          )}
          {page === "payments" && user.role === "owner" && (
            <Payments owner onToast={setToast} />
          )}
          <footer className="workspace-footer">
            <span>
              <span className="brand-tiny">W</span> WitchSearch
              <span className="footer-dot">·</span> Follow the public trail.
            </span>
            <button onClick={() => setModal("help")}>
              <BookOpen size={13} /> Quick guide
              <ArrowUpRight size={11} />
            </button>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={17} />
          {toast}
        </div>
      )}
      {modal === "credits" && (
        <Modal
          title="Add credits"
          onClose={() => {
            setModal(null);
            void refresh();
          }}
        >
          <Credits user={user} config={config} onToast={setToast} />
        </Modal>
      )}
      {modal === "account" && (
        <Modal title="Your account" onClose={() => setModal(null)}>
          <div className="modal-body">
            <div className="profile-summary">
              <span className="avatar large">
                {user.username[0].toUpperCase()}
              </span>
              <div>
                <h3>{user.username}</h3>
                <p>
                  {user.role === "owner"
                    ? "Creator"
                    : user.unlimited
                      ? "Unlimited"
                      : "Personal"}{" "}
                  account
                </p>
              </div>
            </div>
            <div className="connection-detail">
              <span>Credits</span>
              <strong>{user.unlimited ? "Unlimited" : user.credits}</strong>
              <span>Created</span>
              <strong>{new Date(user.createdAt).toLocaleDateString()}</strong>
              <span>Sign-in method</span>
              <strong>
                {user.unlimited ? "Access code" : "Username & password"}
              </strong>
            </div>
            <p className="inline-note">
              Accounts don’t use an email address. Keep your password or access
              code safe; email recovery is unavailable.
            </p>
            <button className="secondary full" onClick={logout}>
              <LogOut size={16} />
              Log out
            </button>
          </div>
        </Modal>
      )}
      {modal === "help" && (
        <Modal
          title="A quick guide to WitchSearch"
          onClose={() => setModal(null)}
        >
          <div className="modal-body help-content">
            <h3>1. Start with an identifier</h3>
            <p>
              Search a username, email domain, domain, or public IPv4 address.
              Tools in the directory offer more specific lookups.
            </p>
            <h3>2. Review the evidence</h3>
            <p>
              Every record links to its original source. A shared username does
              not establish a person’s identity. “Unavailable” means a source
              could not be reached.
            </p>
            <h3>3. Keep useful findings</h3>
            <p>
              Save reports to Cases or export a JSON report. The latest 50
              unsaved reports and up to 100 saved reports are kept.
            </p>
            <h3>Credits and payments</h3>
            <p>
              A search costs 1 credit, including searches with no matches. If
              every source fails, your credit is refunded. Cash App purchases
              require creator verification before credits arrive.
            </p>
            <h3>Provider integrations</h3>
            <p>
              Web search works without a key using a public search index. An optional Brave key adds another provider. Social tools search indexed pages; they cannot access private accounts. VirusTotal requires a provider key. Other locked tools still need backend integrations.
            </p>
          </div>
        </Modal>
      )}
      {modal === "updates" && (
        <Modal title="What’s new" onClose={() => setModal(null)}>
          <div className="modal-body">
            <span className="pill">WITCHSEARCH 1.0</span>
            <h3>Your investigation starts here.</h3>
            <p>
              Public profile lookups, domain intelligence, archive searches, CVE
              records, source-linked reports, and a private workspace.
            </p>
            <p>
              Check the tool directory for availability. Connected tools use
              real public APIs.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
function Stat({
  icon: Icon,
  name,
  value,
  note,
  accent = false,
}: {
  icon: typeof SearchIcon;
  name: string;
  value: string;
  note: string;
  accent?: boolean;
}) {
  return (
    <div className={`stat-card ${accent ? "accent" : ""}`}>
      <div>
        <span>{name}</span>
        <Icon size={16} />
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}
function Empty({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof SearchIcon;
  title: string;
  text: string;
}) {
  return (
    <div className="empty-state">
      <span>
        <Icon size={27} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
function Credits({
  user,
  config,
  onToast,
}: {
  user: User;
  config: Config;
  onToast: (s: string) => void;
}) {
  const [selected, setSelected] = useState("investigator");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const pack = config.packages.find((p) => p.id === selected)!;
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/payments", { packageId: selected, reference });
      setSubmitted(true);
      onToast("Payment submitted for creator verification");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-body">
      {user.unlimited ? (
        <Empty
          icon={InfinityIcon}
          title="You have unlimited credits"
          text="This account can search without purchasing credits."
        />
      ) : (
        <>
          <p>
            Choose a package. Send payment to{" "}
            <strong className="purple">{config.cashapp}</strong>, then submit
            your transaction ID for verification.
          </p>
          <div className="packages">
            {config.packages.map((p) => (
              <button
                key={p.id}
                className={selected === p.id ? "selected" : ""}
                onClick={() => {
                  setSelected(p.id);
                  setSubmitted(false);
                }}
              >
                <span>{p.name}</span>
                <strong>{p.credits}</strong>
                <small>credits</small>
                <b>${p.price}</b>
              </button>
            ))}
          </div>
          {submitted ? (
            <div className="success-box">
              <CheckCircle2 size={20} />
              <div>
                <strong>Payment request submitted</strong>
                <p>
                  The creator will confirm the payment in Cash App. Credits
                  arrive only after approval.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={submit}>
              <div className="payment-instructions">
                <span className="step-number">1</span>
                <div>
                  <strong>
                    Send ${pack.price} to {config.cashapp}
                  </strong>
                  <p>
                    Add “{user.username} · {pack.credits} credits” to the
                    payment note.
                  </p>
                  <a
                    className="secondary"
                    href={`https://cash.app/$imhollowvf/${pack.price}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open Cash App
                    <ArrowUpRight size={14} />
                  </a>
                </div>
              </div>
              <div className="payment-instructions">
                <span className="step-number">2</span>
                <div>
                  <strong>Submit your payment for review</strong>
                  <label>
                    Cash App transaction ID
                    <input
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="Transaction ID from your receipt"
                      pattern="[a-zA-Z0-9-]{6,80}"
                      minLength={6}
                      maxLength={80}
                      required
                    />
                  </label>
                </div>
              </div>
              {error && (
                <div className="error-box" role="alert">
                  {error}
                </div>
              )}
              <button className="primary full" disabled={busy}>
                {busy ? <Spinner /> : <ShieldCheck size={16} />}Submit payment
                for verification
              </button>
              <p className="inline-note">
                Sending a request doesn’t prove payment. Cash App payments are
                reviewed manually; cards and other payment methods are not
                connected.
              </p>
            </form>
          )}
          <Payments onToast={onToast} />
        </>
      )}
    </div>
  );
}
function Payments({
  owner = false,
  onToast,
}: {
  owner?: boolean;
  onToast: (s: string) => void;
}) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  async function load() {
    try {
      setPayments((await api<{ payments: Payment[] }>("/payments")).payments);
      setError("");
    } catch (e) {
      setError(errorText(e));
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function review(p: Payment, decision: string) {
    setBusy(p.id);
    setError("");
    try {
      await api("/payments/review", { id: p.id, decision });
      onToast(
        decision === "approved"
          ? "Credits delivered to account"
          : "Payment request rejected",
      );
      await load();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  }
  return (
    <section className="payments">
      <div className="section-heading">
        <div>
          <h2>{owner ? "Verify credit purchases" : "Your payment requests"}</h2>
          {owner && (
            <p>
              Confirm the recipient, transaction ID, amount, and account note in
              Cash App before approving.
            </p>
          )}
        </div>
        <button className="text-button" onClick={() => void load()}>
          Refresh
        </button>
      </div>
      {error && <div className="error-box">{error}</div>}
      {!payments.length ? (
        <p className="muted-text">No payment requests yet.</p>
      ) : (
        payments.map((p) => (
          <div className="payment-row" key={p.id}>
            <div>
              <strong>
                {owner ? `${p.username} · ` : ""}
                {p.credits} credits · ${p.price}
              </strong>
              <small>
                {p.reference} · {new Date(p.createdAt).toLocaleDateString()}
              </small>
              <span className={`payment-status ${p.status}`}>
                {p.status === "approved" && !p.delivered
                  ? "Approved · delivery pending"
                  : p.status}
              </span>
            </div>
            {owner &&
              (p.status === "pending" ||
                (p.status === "approved" && !p.delivered)) && (
                <div className="button-row">
                  <button
                    className="secondary"
                    disabled={busy === p.id}
                    onClick={() => review(p, "approved")}
                  >
                    {busy === p.id ? <Spinner /> : <Check size={14} />}Confirm
                    received
                  </button>
                  {p.status === "pending" && (
                    <button
                      className="icon-button"
                      aria-label="Reject payment"
                      disabled={busy === p.id}
                      onClick={() => review(p, "rejected")}
                    >
                      <X size={17} />
                    </button>
                  )}
                </div>
              )}
          </div>
        ))
      )}
    </section>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
