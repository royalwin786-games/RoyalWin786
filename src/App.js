import { useEffect, useState } from "react";
import { isSupabaseConfigured } from "./lib/supabase";
import {
  getCurrentIdentity,
  registerPlayer,
  requestPasswordReset,
  resendRegistrationOtp,
  signInAdmin,
  signInPlayer,
  signOut,
  subscribeToAuthChanges,
  updateRecoveredPassword,
  verifyRegistrationOtp,
} from "./services/authService";
import {
  adjustPlayerPoints,
  cancelLotteryDraw,
  createLotteryDraw,
  getAdminLotteryData,
  getFeaturedLotteryDraw,
  getLotteryDraws,
  getPlayerTickets,
  getPlayerWallet,
  getResponsiblePlaySettings,
  getWalletLedger,
  openLotteryDraw,
  playDemoRoulette,
  publishLotteryResult,
  purchaseLotteryTicket,
  updateResponsiblePlaySettings,
  verifyLotteryTicket,
} from "./services/gameService";

const lotteryNumbers = Array.from({ length: 36 }, (_, index) => index + 1);
const rouletteNumbers = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27];
const redRouletteNumbers = new Set([32, 19, 21, 25, 34, 27]);
const initialPlayerTickets = [
  { id: "RW786-DEMO01", numbers: [4, 7, 12, 18, 24, 31], matchedNumbers: [], matchCount: 0, prizePoints: 0, pointsSpent: 100, draw: "RoyalWin Super 7", drawCode: "RW-S7-042", status: "confirmed", createdAt: new Date().toISOString() },
  { id: "RW786-WIN041", numbers: [4, 7, 12, 18, 25, 33], matchedNumbers: [4, 7, 12, 18], matchCount: 4, prizePoints: 2500, pointsSpent: 100, draw: "RoyalWin Super 7", drawCode: "RW-S7-041", drawAt: new Date(Date.now() - 7 * 86400000).toISOString(), resultNumbers: [4, 7, 12, 18, 24, 31], status: "winner", createdAt: new Date(Date.now() - 8 * 86400000).toISOString() },
];

const demoDraw = {
  id: "demo-draw",
  code: "RW-S7-042",
  name: "RoyalWin Super 7",
  status: "open",
  draw_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  closes_at: new Date(Date.now() + 6 * 86400000 + 23 * 3600000).toISOString(),
  max_number: 36,
  picks_required: 6,
  entry_points: 100,
  prize_label: "2,50,000 reward points",
  result_numbers: null,
  draw_prize_tiers: [
    { matches_required: 6, prize_points: 250000, label: "Jackpot" },
    { matches_required: 5, prize_points: 25000, label: "5 numbers" },
    { matches_required: 4, prize_points: 2500, label: "4 numbers" },
    { matches_required: 3, prize_points: 250, label: "3 numbers" },
  ],
};

const demoPublishedDraw = {
  ...demoDraw,
  id: "demo-result-draw",
  code: "RW-S7-041",
  status: "published",
  draw_at: new Date(Date.now() - 7 * 86400000).toISOString(),
  closes_at: new Date(Date.now() - 7 * 86400000 - 3600000).toISOString(),
  result_numbers: [4, 7, 12, 18, 24, 31],
  published_at: new Date(Date.now() - 7 * 86400000).toISOString(),
};

const formatDateTime = (value) => value
  ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
  : "Not scheduled";

const formatPoints = (value) => Number(value || 0).toLocaleString("en-IN");

const ticketStatusLabel = (status) => ({
  confirmed: "Upcoming",
  winner: "Winner",
  non_winner: "Result declared",
  cancelled: "Cancelled",
}[status] || status || "Upcoming");

const isPreviewMode = process.env.NODE_ENV === "development"
  && new URLSearchParams(window.location.search).has("screen");
const liveBackendActive = isSupabaseConfigured && !isPreviewMode;
const recoveryModeRequested = new URLSearchParams(window.location.search).get("recovery") === "1";

const getAuthRedirectUrl = (recovery = false) => {
  const url = new URL(`${process.env.PUBLIC_URL || ""}/`, window.location.origin);
  if (recovery) url.searchParams.set("recovery", "1");
  return url.toString();
};

function Icon({ name, size = 24, strokeWidth = 1.8 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  const paths = {
    clock: <><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></>,
    logout: <><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="m10 8 4 4-4 4M14 12H3"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M7 14h2M11 14h2M15 14h2M7 17h2M11 17h2M15 17h2"/></>,
    chart: <><path d="M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16"/><path d="M8 17v-3M12 17V9M16 17v-5M7 7h10"/></>,
    money: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h3M14 12h3M7 16h10M12 10v4"/></>,
    clipboard: <><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M8 9h8M8 13h5M8 17h3"/><circle cx="17" cy="17" r="3"/><path d="m16 17 1 1 2-2"/></>,
    cart: <><path d="M3 4h2l2 11h10l2-7H7M9 19h.01M17 19h.01"/></>,
    purchase: <><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M8 9h2M8 13h2M8 17h2M13 9h3M13 13h3M13 17h3"/></>,
    document: <><path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7"/><path d="m9 8 1 1 2-2"/></>,
    arrange: <><rect x="3" y="4" width="5" height="5" rx="1"/><rect x="16" y="4" width="5" height="5" rx="1"/><rect x="3" y="15" width="5" height="5" rx="1"/><rect x="16" y="15" width="5" height="5" rx="1"/><path d="M8 6h8M18 9v6M16 18H8M6 15V9"/></>,
    trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0zM12 13v4M8 21h8M9 17h6M8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4"/></>,
    cube: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9"/></>,
    ticket: <><path d="M4 7a2 2 0 0 0 0 4v6h16v-6a2 2 0 0 0 0-4V5H4zM9 8v1M9 12v1M9 16v1"/></>,
    eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.5"/></>,
    back: <><path d="m15 5-7 7 7 7"/></>,
    reset: <><path d="M4 4v6h6M5.5 15a7 7 0 1 0 1-7"/></>,
    delete: <><path d="m8 8-3 4 3 4h11V8zM12 10l4 4M16 10l-4 4"/></>,
    qr: <><path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h2v2h-2zM19 15h2v6h-2zM15 19h2v2h-2z"/></>,
    copy: <><rect x="8" y="7" width="10" height="13" rx="2"/><path d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2"/></>,
    home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></>,
    shield: <><path d="M12 3 4 6v5c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10V6z"/><path d="m9 12 2 2 4-5"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></>,
    game: <><path d="M8 9h8a5 5 0 0 1 4.8 6.4l-1 3.1a2 2 0 0 1-3.3.8L14 17h-4l-2.5 2.3a2 2 0 0 1-3.3-.8l-1-3.1A5 5 0 0 1 8 9z"/><path d="M8 13v4M6 15h4M16 14h.01M18 16h.01"/></>,
    wallet: <><path d="M4 6h14a2 2 0 0 1 2 2v11H4a2 2 0 0 1-2-2V6a3 3 0 0 1 3-3h12"/><path d="M15 11h6v5h-6a2.5 2.5 0 0 1 0-5z"/></>,
    sparkle: <><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2zM5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8zM18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z"/></>,
  };

  return <svg {...common}>{paths[name] || paths.ticket}</svg>;
}

function BrandMark({ compact = false }) {
  return (
    <div className={`brand-mark ${compact ? "brand-mark--compact" : ""}`} aria-label="RoyalWin786 logo">
      <img src={`${process.env.PUBLIC_URL}/royalwin786-logo.png`} alt="" />
    </div>
  );
}

function AppFrame({ children, className = "" }) {
  return (
    <main className={`app-frame ${className}`}>
      <div className="blob blob--blue"/><div className="blob blob--yellow"/>
      <div className="screen-body">{children}</div>
    </main>
  );
}

function Brand({ showVersion = false }) {
  return (
    <section className="brand-block">
      <span className="brand-kicker">India's premium draw experience</span>
      <BrandMark />
      <h1>RoyalWin<span>786</span></h1>
      <p>Play the weekly lottery, follow live results and enjoy bonus games.</p>
      <div className="brand-benefits" aria-label="Platform benefits">
        <span><Icon name="shield" size={18}/>Secure player access</span>
        <span><Icon name="trophy" size={18}/>Weekly lottery</span>
        <span><Icon name="game" size={18}/>Bonus games</span>
      </div>
      {showVersion && <small>RoyalWin Web &amp; App • v2.0</small>}
    </section>
  );
}

function AuthField({ label, prefix, ...inputProps }) {
  return (
    <label className="auth-field">
      <span className="auth-field-label">{label}</span>
      <span className="auth-field-control"><b>{prefix}</b><input {...inputProps}/></span>
    </label>
  );
}

function PlayerLogin({ identifier, setIdentifier, onLogin, onRegister, onForgot, onAdmin, backendEnabled, notice }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const valid = identifier.trim().length >= 8 && password.length >= 8;
  const submit = async (event) => {
    event.preventDefault();
    if (!valid || loading) return;
    setLoading(true);
    setError("");
    try { await onLogin({ identifier, password }); } catch (requestError) { setError(requestError.message || "Unable to sign in."); }
    finally { setLoading(false); }
  };
  return (
    <AppFrame className="auth-frame player-auth-frame">
      <div className="otp-screen player-login-screen">
        <button type="button" className="admin-access-link" onClick={onAdmin}><Icon name="lock" size={16}/>Admin Login</button>
        <Brand />
        <form className="auth-card otp-card player-password-card" onSubmit={submit}>
          <span className={`backend-mode-badge ${backendEnabled ? "live" : "demo"}`}>{backendEnabled ? "Live secure login" : "Frontend demo mode"}</span>
          <div className="auth-card-heading"><span>Players &amp; users</span><h2>Welcome back</h2><p>Log in with your registered email address or mobile number.</p></div>
          {notice && <p className="auth-success">{notice}</p>}
          <AuthField label="Email or mobile number" prefix="@" value={identifier} autoComplete="username" placeholder="name@email.com or +91 mobile" onChange={(event) => setIdentifier(event.target.value)}/>
          <AuthField label="Password" prefix={<Icon name="lock" size={18}/>} type="password" value={password} autoComplete="current-password" placeholder="Enter your password" onChange={(event) => setPassword(event.target.value)}/>
          <button type="button" className="forgot-password-link" onClick={onForgot}>Forgot password?</button>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="primary-button" disabled={!valid || loading}>{loading ? "Signing in…" : "Login to Player Lobby"}</button>
          <div className="auth-divider"><span>New to RoyalWin786?</span></div>
          <button type="button" className="secondary-auth-button" onClick={onRegister}>Create player account</button>
          <p className="secure-note"><Icon name="shield" size={16}/>Passwords are securely handled by Supabase Auth.</p>
        </form>
      </div>
    </AppFrame>
  );
}

function PlayerRegistration({ initial, onBack, onRegister, backendEnabled }) {
  const [form, setForm] = useState({ name: initial.name || "", email: initial.email || "", phone: initial.phone || "", age: initial.age || "", password: "", confirmPassword: "", accepted: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const valid = form.name.trim().length >= 2
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    && form.phone.replace(/\D/g, "").length >= 10
    && Number(form.age) >= 18
    && form.password.length >= 8
    && form.password === form.confirmPassword
    && form.accepted;
  const submit = async (event) => {
    event.preventDefault();
    if (!valid || loading) return;
    setLoading(true);
    setError("");
    try { await onRegister(form); } catch (registrationError) { setError(registrationError.message || "Unable to create your account."); }
    finally { setLoading(false); }
  };
  return (
    <AppFrame className="auth-frame registration-auth-frame">
      <div className="otp-screen registration-screen">
        <Brand />
        <form className="auth-card registration-card" onSubmit={submit}>
          <button type="button" className="auth-back-link" onClick={onBack}>← Back to login</button>
          <span className={`backend-mode-badge ${backendEnabled ? "live" : "demo"}`}>{backendEnabled ? "Secure registration" : "Frontend demo mode"}</span>
          <div className="auth-card-heading"><span>New player</span><h2>Create your RoyalWin786 account</h2><p>Register once, verify your email OTP, then log in using your email or mobile number.</p></div>
          <div className="registration-grid">
            <AuthField label="Full name" prefix={<Icon name="user" size={18}/>} value={form.name} autoComplete="name" placeholder="Your full name" onChange={(event) => update("name", event.target.value)}/>
            <AuthField label="Email address" prefix="@" type="email" value={form.email} autoComplete="email" placeholder="name@email.com" onChange={(event) => update("email", event.target.value)}/>
            <AuthField label="Mobile number" prefix="+91" type="tel" value={form.phone} autoComplete="tel" inputMode="tel" placeholder="98765 43210" onChange={(event) => update("phone", event.target.value)}/>
            <AuthField label="Age" prefix="18+" type="number" min="18" max="100" value={form.age} inputMode="numeric" placeholder="Your age" onChange={(event) => update("age", event.target.value)}/>
            <AuthField label="Password" prefix={<Icon name="lock" size={18}/>} type="password" value={form.password} autoComplete="new-password" placeholder="8+ characters" onChange={(event) => update("password", event.target.value)}/>
            <AuthField label="Confirm password" prefix={<Icon name="lock" size={18}/>} type="password" value={form.confirmPassword} autoComplete="new-password" placeholder="Repeat password" onChange={(event) => update("confirmPassword", event.target.value)}/>
          </div>
          {form.confirmPassword && form.password !== form.confirmPassword && <p className="auth-error">Passwords do not match.</p>}
          <label className="age-consent"><input type="checkbox" checked={form.accepted} onChange={(event) => update("accepted", event.target.checked)}/><span>I confirm that I am at least 18 years old and accept the platform terms.</span></label>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="primary-button" disabled={!valid || loading}>{loading ? "Creating account…" : "Create account & send OTP"}</button>
          <p className="secure-note"><Icon name="shield" size={16}/>Your password is never stored in the RoyalWin786 public database.</p>
        </form>
      </div>
    </AppFrame>
  );
}

function RegistrationOtp({ email, onBack, onVerify, onResend, backendEnabled }) {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(otp) || loading) return;
    setLoading(true);
    setError("");
    try { await onVerify(otp); } catch (verificationError) { setError(verificationError.message || "The OTP is invalid or expired."); }
    finally { setLoading(false); }
  };
  const resend = async () => {
    if (resending) return;
    setResending(true);
    setError("");
    setNotice("");
    try { await onResend(); setNotice("A new OTP has been sent to your email."); } catch (resendError) { setError(resendError.message || "Unable to resend OTP."); }
    finally { setResending(false); }
  };
  return (
    <AppFrame className="auth-frame">
      <div className="mpin-screen">
        <Brand showVersion />
        <form className="auth-card mpin-card verification-card" onSubmit={submit}>
          <button type="button" className="auth-back-link" onClick={onBack}>← Change registration details</button>
          <span className={`backend-mode-badge ${backendEnabled ? "live" : "demo"}`}>{backendEnabled ? "Email OTP verification" : "Frontend demo mode"}</span>
          <div className="auth-card-heading"><span>Verify your email</span><h2>Enter the 6-digit OTP</h2><p>We sent a verification code to <strong>{email || "your email"}</strong>.</p></div>
          <label className="otp-code-field"><span>One-time password</span><input value={otp} maxLength="6" inputMode="numeric" autoComplete="one-time-code" placeholder="••••••" onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}/></label>
          {notice && <p className="auth-success">{notice}</p>}
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="primary-button" disabled={otp.length !== 6 || loading}>{loading ? "Verifying…" : "Verify & enter Player Lobby"}</button>
          <button type="button" className="text-button" disabled={resending} onClick={resend}>{resending ? "Sending…" : "Didn't receive it? Resend OTP"}</button>
          <p className="secure-note"><Icon name="shield" size={16}/>Never share this verification code with anyone.</p>
        </form>
      </div>
    </AppFrame>
  );
}

function ForgotPassword({ email, setEmail, onBack, onSend, backendEnabled }) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const submit = async (event) => {
    event.preventDefault();
    if (!valid || loading) return;
    setLoading(true);
    setError("");
    try { await onSend(); setSent(true); } catch (sendError) { setError(sendError.message || "Unable to send the password reset email."); }
    finally { setLoading(false); }
  };
  return (
    <AppFrame className="auth-frame">
      <div className="mpin-screen"><Brand showVersion />
        <form className="auth-card mpin-card" onSubmit={submit}>
          <button type="button" className="auth-back-link" onClick={onBack}>← Back to login</button>
          <span className={`backend-mode-badge ${backendEnabled ? "live" : "demo"}`}>{backendEnabled ? "Secure account recovery" : "Frontend demo mode"}</span>
          <div className="auth-card-heading"><span>Forgot password</span><h2>Recover your account</h2><p>Enter your registered email. We will send a secure password reset link.</p></div>
          <AuthField label="Registered email" prefix="@" type="email" value={email} autoComplete="email" placeholder="name@email.com" onChange={(event) => setEmail(event.target.value)}/>
          {sent && <p className="auth-success">Password reset email sent. Open the newest link in your inbox.</p>}
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="primary-button" disabled={!valid || loading}>{loading ? "Sending…" : sent ? "Resend reset link" : "Send password reset link"}</button>
          <p className="secure-note"><Icon name="shield" size={16}/>For privacy, the same confirmation is shown for every valid email format.</p>
        </form>
      </div>
    </AppFrame>
  );
}

function ResetPassword({ onSave }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const valid = password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password) && password === confirmPassword;
  const submit = async (event) => {
    event.preventDefault();
    if (!valid || loading) return;
    setLoading(true);
    setError("");
    try { await onSave(password); } catch (saveError) { setError(saveError.message || "Unable to update your password. Open a fresh reset link and try again."); }
    finally { setLoading(false); }
  };
  return (
    <AppFrame className="auth-frame"><div className="mpin-screen"><Brand showVersion />
      <form className="auth-card mpin-card" onSubmit={submit}>
        <span className="backend-mode-badge live">Secure password update</span>
        <div className="auth-card-heading"><span>Account recovery</span><h2>Create a new password</h2><p>Use at least 8 characters with a letter and number.</p></div>
        <AuthField label="New password" prefix={<Icon name="lock" size={18}/>} type="password" value={password} autoComplete="new-password" placeholder="Enter new password" onChange={(event) => setPassword(event.target.value)}/>
        <AuthField label="Confirm new password" prefix={<Icon name="lock" size={18}/>} type="password" value={confirmPassword} autoComplete="new-password" placeholder="Repeat new password" onChange={(event) => setConfirmPassword(event.target.value)}/>
        {confirmPassword && password !== confirmPassword && <p className="auth-error">Passwords do not match.</p>}
        {error && <p className="auth-error">{error}</p>}
        <button type="submit" className="primary-button" disabled={!valid || loading}>{loading ? "Updating…" : "Update password"}</button>
      </form>
    </div></AppFrame>
  );
}

function AdminLogin({ onBack, onLogin, backendEnabled }) {
  const [credentials, setCredentials] = useState({ userId: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const valid = Boolean(credentials.userId.trim() && credentials.password.trim());
  const update = (field, value) => setCredentials((current) => ({ ...current, [field]: value }));
  const submit = async (event) => {
    event.preventDefault();
    if (!valid || loading) return;
    setLoading(true);
    setError("");
    try { await onLogin(credentials); } catch (loginError) { setError(loginError.message || "Admin login failed."); }
    finally { setLoading(false); }
  };

  return (
    <AppFrame className="auth-frame admin-auth-frame">
      <div className="otp-screen admin-login-screen">
        <Brand />
        <form className="auth-card otp-card admin-login-card" onSubmit={submit}>
          <button type="button" className="auth-back-link" onClick={onBack}>← Back to player login</button>
          <span className={`backend-mode-badge ${backendEnabled ? "live" : "demo"}`}>{backendEnabled ? "Live admin authentication" : "Frontend demo mode"}</span>
          <div className="auth-card-heading"><span>Restricted access</span><h2>Admin Console</h2><p>Use your authorized admin credentials to manage stock, reports and draw operations.</p></div>
          <label className="credential-input"><span><Icon name="user" size={20}/></span><input type="email" value={credentials.userId} autoComplete="username" placeholder="Admin email" onChange={(event) => update("userId", event.target.value)}/></label>
          <label className="credential-input"><span><Icon name="lock" size={20}/></span><input type="password" value={credentials.password} autoComplete="current-password" placeholder="Password" onChange={(event) => update("password", event.target.value)}/></label>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="primary-button admin-login-button" disabled={!valid || loading}>{loading ? "Signing in…" : "Secure Admin Login"}</button>
          <p className="secure-note"><Icon name="shield" size={16}/>Credentials must be validated by your secure backend before production launch.</p>
        </form>
      </div>
    </AppFrame>
  );
}

function PlayerHeader({ active, onNavigate, onLogout }) {
  const items = [
    { label: "Lobby", icon: "home", screen: "player-dashboard" },
    { label: "Lottery", icon: "ticket", screen: "player-lottery" },
    { label: "My Tickets", icon: "document", screen: "player-tickets" },
    { label: "Results", icon: "trophy", screen: "player-results" },
    { label: "Wallet", icon: "wallet", screen: "player-wallet" },
    { label: "Roulette", icon: "game", screen: "player-roulette" },
  ];
  return (
    <header className="app-header player-header">
      <button type="button" className="header-brand header-brand-button" onClick={() => onNavigate("player-dashboard")}><BrandMark compact/><span><strong>RoyalWin786</strong><small>Player Hub</small></span></button>
      <nav className="desktop-nav" aria-label="Player navigation">
        {items.map((item) => <button type="button" key={item.screen} className={active === item.screen ? "active" : ""} onClick={() => onNavigate(item.screen)}><Icon name={item.icon} size={18}/>{item.label}</button>)}
      </nav>
      <button type="button" className="icon-button logout-button" aria-label="Logout" onClick={onLogout}><Icon name="logout" size={24}/><span>Logout</span></button>
    </header>
  );
}

function PlayerBottomMenu({ active, onNavigate }) {
  const items = [
    { label: "Home", icon: "home", screen: "player-dashboard" },
    { label: "Lottery", icon: "ticket", screen: "player-lottery" },
    { label: "Tickets", icon: "document", screen: "player-tickets" },
    { label: "Results", icon: "trophy", screen: "player-results" },
    { label: "Wallet", icon: "wallet", screen: "player-wallet" },
  ];
  return (
    <nav className="bottom-menu player-bottom-menu" aria-label="Player navigation">
      {items.map((item) => <button type="button" key={item.screen} className={active === item.screen ? "active" : ""} onClick={() => onNavigate(item.screen)}><span><Icon name={item.icon} size={25}/></span><small>{item.label}</small></button>)}
    </nav>
  );
}

function PlayerLayout({ active, onNavigate, onLogout, children, className = "" }) {
  return (
    <AppFrame className={`dashboard-frame player-frame ${className}`}>
      <div className="player-screen">
        <PlayerHeader active={active} onNavigate={onNavigate} onLogout={onLogout}/>
        <div className="player-content">{children}</div>
        <PlayerBottomMenu active={active} onNavigate={onNavigate}/>
      </div>
    </AppFrame>
  );
}

function PlayerDashboard({ profile, tickets, walletPoints, draw, latestResult, onNavigate, onLogout }) {
  const latestTicket = tickets[0];
  const activeTickets = tickets.filter((ticket) => ticket.status === "confirmed").length;
  const latestNumbers = latestResult?.result_numbers || [];
  return (
    <PlayerLayout active="player-dashboard" onNavigate={onNavigate} onLogout={onLogout}>
      <div className="player-welcome"><div><span>PLAYER LOBBY</span><h1>Welcome, {profile?.display_name || "RoyalWin player"}</h1><p>Your next RoyalWin chance is ready.</p></div><button type="button" className="player-points" onClick={() => onNavigate("player-wallet")}><Icon name="wallet" size={21}/><span>Points balance<strong>{formatPoints(walletPoints)}</strong></span></button></div>

      <section className="lottery-hero">
        <div className="lottery-hero-copy">
          <span className="game-kicker"><Icon name="trophy" size={18}/>Main game • Weekly lottery</span>
          <h2>{draw?.name || "RoyalWin Super 7"}</h2>
          <p>Choose {draw?.picks_required || 6} lucky numbers and join the next premium weekly draw.</p>
          <div className="jackpot-label">Top reward<strong>{draw?.prize_label || "2,50,000 reward points"}</strong></div>
          <button type="button" disabled={!draw} onClick={() => onNavigate("player-lottery")}>{draw ? "Choose lottery numbers" : "Next draw coming soon"} <span>→</span></button>
        </div>
        <div className="lottery-hero-side">
          <span>Draw closes in</span>
          <Countdown target={draw?.closes_at}/>
          <p>{draw ? formatDateTime(draw.draw_at) : "Schedule will be announced"}</p>
        </div>
      </section>

      <section className="player-stats" aria-label="Player account summary">
        <article><span><Icon name="ticket" size={24}/></span><p>Active tickets<strong>{activeTickets}</strong></p></article>
        <article><span><Icon name="trophy" size={24}/></span><p>Latest result<strong>{latestNumbers.length ? latestNumbers.map((number) => String(number).padStart(2, "0")).join(" • ") : "Awaiting result"}</strong></p></article>
        <article><span><Icon name="sparkle" size={24}/></span><p>Reward points<strong>{formatPoints(walletPoints)}</strong></p></article>
      </section>

      <section className="player-section game-lobby-section">
        <div className="player-section-heading"><div><span>PLAY</span><h2>Choose your game</h2></div><p>Lottery remains the main RoyalWin786 experience.</p></div>
        <div className="game-choice-grid">
          <button type="button" className="game-choice-card game-choice-card--lottery" onClick={() => onNavigate("player-lottery")}>
            <span className="game-badge">PRIMARY</span><Icon name="ticket" size={42}/><h3>Weekly Lottery</h3><p>Pick 6 numbers for the RoyalWin Super 7 draw.</p><strong>Play lottery →</strong>
          </button>
          <button type="button" className="game-choice-card game-choice-card--roulette" onClick={() => onNavigate("player-roulette")}>
            <span className="game-badge">BONUS GAME</span><Icon name="game" size={42}/><h3>Royal Roulette</h3><p>A quick demo-points game between weekly draws.</p><strong>Open roulette →</strong>
          </button>
        </div>
      </section>

      <section className="player-section ticket-preview-section">
        <div className="player-section-heading"><div><span>MY PLAY</span><h2>Latest ticket</h2></div><button type="button" onClick={() => onNavigate("player-tickets")}>View all</button></div>
        {latestTicket ? <article className="player-ticket-card"><div><span className={`status-${latestTicket.status}`}>{ticketStatusLabel(latestTicket.status)}</span><h3>{latestTicket.draw}</h3><p>Ticket #{latestTicket.id}</p></div><div className="ticket-balls">{latestTicket.numbers.map((number) => <strong key={number}>{String(number).padStart(2, "0")}</strong>)}</div></article> : <p className="empty-state">No tickets yet. Choose your lottery numbers to get started.</p>}
      </section>
      <p className="responsible-note"><Icon name="shield" size={16}/>Points-based experience only. No deposits or cash-out. Play responsibly.</p>
    </PlayerLayout>
  );
}

function LotteryGame({ onNavigate, onLogout, onSave, draw }) {
  const [selected, setSelected] = useState([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const pickCount = draw?.picks_required || 6;
  const availableNumbers = Array.from({ length: draw?.max_number || lotteryNumbers.length }, (_, index) => index + 1);
  const toggleNumber = (number) => {
    setSaved(false);
    setError("");
    setSelected((current) => current.includes(number) ? current.filter((item) => item !== number) : current.length < pickCount ? [...current, number].sort((a, b) => a - b) : current);
  };
  const quickPick = () => {
    const picks = [...availableNumbers].sort(() => Math.random() - .5).slice(0, pickCount).sort((a, b) => a - b);
    setSelected(picks);
    setSaved(false);
    setError("");
  };
  const saveTicket = async () => {
    if (selected.length !== pickCount || saving) return;
    setSaving(true);
    setError("");
    try { await onSave(selected); setSaved(true); }
    catch (saveError) { setError(saveError.message || "Unable to save this ticket."); }
    finally { setSaving(false); }
  };
  return (
    <PlayerLayout active="player-lottery" onNavigate={onNavigate} onLogout={onLogout} className="player-game-frame">
      <div className="game-page-heading"><div><span>MAIN GAME</span><h1>{draw?.name || "No open draw"}</h1><p>{draw ? `Select exactly ${pickCount} numbers for the upcoming weekly lottery.` : "The next draw is being prepared by the RoyalWin786 team."}</p></div><div><span>Draw closes</span><strong>{draw ? formatDateTime(draw.closes_at) : "Coming soon"}</strong></div></div>
      <div className="lottery-game-layout">
        <section className="content-card number-picker-card">
          <div className="picker-heading"><div><span>YOUR NUMBERS</span><h2>{selected.length}/{pickCount} selected</h2></div><button type="button" onClick={quickPick}><Icon name="sparkle" size={18}/>Quick Pick</button></div>
          <div className="lottery-number-grid">{availableNumbers.map((number) => <button type="button" key={number} className={selected.includes(number) ? "selected" : ""} aria-pressed={selected.includes(number)} onClick={() => toggleNumber(number)}>{number}</button>)}</div>
        </section>
        <aside className="content-card ticket-builder-card">
          <span className="game-kicker"><Icon name="ticket" size={18}/>Your lottery ticket</span>
          <h2>{draw?.name || "RoyalWin Super 7"}</h2><p>Weekly draw • {draw?.code || "Pending"}</p>
          <div className="ticket-balls ticket-balls--large">{Array.from({ length: pickCount }, (_, index) => <strong key={index} className={!selected[index] ? "empty" : ""}>{selected[index] ? String(selected[index]).padStart(2, "0") : "—"}</strong>)}</div>
          <div className="ticket-meta"><span>Entry<strong>{formatPoints(draw?.entry_points || 100)} points</strong></span><span>Draw<strong>{draw ? formatDateTime(draw.draw_at) : "Not scheduled"}</strong></span></div>
          {draw?.draw_prize_tiers?.length > 0 && <div className="prize-tier-list"><span>Reward tiers</span>{draw.draw_prize_tiers.map((tier) => <p key={tier.matches_required}><strong>{tier.matches_required} matches</strong><b>{formatPoints(tier.prize_points)} pts</b></p>)}</div>}
          {error && <p className="auth-error">{error}</p>}
          <button type="button" className="primary-button" disabled={!draw || selected.length !== pickCount || saving} onClick={saveTicket}>{saving ? "Confirming ticket…" : saved ? "Ticket confirmed" : `Confirm for ${formatPoints(draw?.entry_points || 100)} points`}</button>
          {saved && <button type="button" className="text-button" onClick={() => onNavigate("player-tickets")}>View my tickets →</button>}
        </aside>
      </div>
      <p className="responsible-note"><Icon name="shield" size={16}/>Reward points have no cash value. Daily play limits are enforced by the secure backend.</p>
    </PlayerLayout>
  );
}

function PlayerTickets({ tickets, onVerify, onNavigate, onLogout }) {
  const [verifyCode, setVerifyCode] = useState("");
  const [verification, setVerification] = useState(null);
  const [verifyError, setVerifyError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const verify = async (event) => {
    event.preventDefault();
    if (!verifyCode.trim() || verifying) return;
    setVerifying(true);
    setVerifyError("");
    setVerification(null);
    try {
      const result = await onVerify(verifyCode);
      if (!result) throw new Error("Ticket not found in your account.");
      setVerification(result);
    } catch (error) {
      setVerifyError(error.message || "Ticket could not be verified.");
    } finally {
      setVerifying(false);
    }
  };
  return (
    <PlayerLayout active="player-tickets" onNavigate={onNavigate} onLogout={onLogout} className="player-game-frame">
      <div className="game-page-heading"><div><span>MY PLAY</span><h1>My lottery tickets</h1><p>Track saved numbers and upcoming RoyalWin786 draws.</p></div><button type="button" className="heading-action" onClick={() => onNavigate("player-lottery")}>+ New ticket</button></div>
      <section className="ticket-list">
        {tickets.length === 0 && <p className="empty-state content-card">No tickets yet. Your confirmed lottery entries will appear here.</p>}
        {tickets.map((ticket) => <article className={`player-ticket-card player-ticket-card--full ticket-${ticket.status}`} key={ticket.id}><div><span className={`status-${ticket.status}`}>{ticketStatusLabel(ticket.status)}</span><h3>{ticket.draw}</h3><p>Ticket #{ticket.id} • {formatDateTime(ticket.drawAt)}</p></div><div className="ticket-balls">{ticket.numbers.map((number) => <strong className={ticket.matchedNumbers?.includes(number) ? "matched" : ""} key={number}>{String(number).padStart(2, "0")}</strong>)}</div><div className="ticket-outcome"><span>{ticket.pointsSpent ? `${formatPoints(ticket.pointsSpent)} points entry` : "Confirmed entry"}</span>{ticket.status === "winner" && <strong>+{formatPoints(ticket.prizePoints)} points won</strong>}{ticket.status === "non_winner" && <strong>{ticket.matchCount} matches</strong>}</div></article>)}
      </section>
      <section className="content-card ticket-verifier-card">
        <div><span>VERIFY</span><h2>Check a ticket code</h2><p>Verification only searches tickets owned by your signed-in account.</p></div>
        <form onSubmit={verify}><input value={verifyCode} onChange={(event) => setVerifyCode(event.target.value.toUpperCase())} placeholder="RW786-XXXXXXXXXX"/><button type="submit" disabled={!verifyCode.trim() || verifying}>{verifying ? "Checking…" : "Verify ticket"}</button></form>
        {verifyError && <p className="auth-error">{verifyError}</p>}
        {verification && <div className="verification-result"><Icon name="shield" size={22}/><div><strong>Verified • {ticketStatusLabel(verification.ticket_status)}</strong><span>{verification.draw_name} • {verification.match_count || 0} matches • {formatPoints(verification.prize_points)} prize points</span></div></div>}
      </section>
      <p className="responsible-note"><Icon name="shield" size={16}/>Ticket ownership and results are verified by the RoyalWin786 database.</p>
    </PlayerLayout>
  );
}

function PlayerResults({ draws, tickets, onNavigate, onLogout }) {
  const published = draws.filter((draw) => draw.status === "published");
  return (
    <PlayerLayout active="player-results" onNavigate={onNavigate} onLogout={onLogout} className="player-game-frame">
      <div className="game-page-heading"><div><span>OFFICIAL RESULTS</span><h1>Lottery result history</h1><p>Published RoyalWin786 draw numbers and your settled tickets.</p></div><button type="button" className="heading-action" onClick={() => onNavigate("player-tickets")}>My tickets</button></div>
      <section className="result-list">
        {published.length === 0 && <div className="content-card empty-panel"><Icon name="trophy" size={38}/><h2>No published results yet</h2><p>The first official draw result will appear here after admin publication and automatic settlement.</p></div>}
        {published.map((draw) => {
          const playerDrawTickets = tickets.filter((ticket) => ticket.drawCode === draw.code);
          const wonPoints = playerDrawTickets.reduce((total, ticket) => total + Number(ticket.prizePoints || 0), 0);
          return <article className="content-card result-card" key={draw.id}><div className="result-card-head"><div><span>PUBLISHED • {draw.code}</span><h2>{draw.name}</h2><p>{formatDateTime(draw.draw_at)}</p></div>{playerDrawTickets.length > 0 && <strong>{playerDrawTickets.length} ticket{playerDrawTickets.length > 1 ? "s" : ""}</strong>}</div><div className="ticket-balls ticket-balls--result">{(draw.result_numbers || []).map((number) => <strong key={number}>{String(number).padStart(2, "0")}</strong>)}</div><div className="result-summary"><span>Your settled entries<strong>{playerDrawTickets.length}</strong></span><span>Your reward<strong>{formatPoints(wonPoints)} points</strong></span></div><div className="result-tiers">{draw.draw_prize_tiers?.map((tier) => <span key={tier.matches_required}>{tier.matches_required} matches <strong>{formatPoints(tier.prize_points)} pts</strong></span>)}</div></article>;
        })}
      </section>
    </PlayerLayout>
  );
}

function PlayerWallet({ profile, walletPoints, ledger, settings, onSaveSettings, onNavigate, onLogout }) {
  const [form, setForm] = useState({
    dailyPointLimit: settings?.daily_point_limit || 1000,
    sessionLimitMinutes: settings?.session_limit_minutes || 60,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (settings) setForm({ dailyPointLimit: settings.daily_point_limit, sessionLimitMinutes: settings.session_limit_minutes });
  }, [settings]);
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await onSaveSettings(form);
      setMessage("Play limits updated successfully.");
    } catch (error) {
      setMessage(error.message || "Unable to update play limits.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <PlayerLayout active="player-wallet" onNavigate={onNavigate} onLogout={onLogout} className="player-game-frame">
      <div className="game-page-heading"><div><span>MY ACCOUNT</span><h1>Wallet &amp; play controls</h1><p>{profile?.email || "Player account"}</p></div><div className="wallet-balance-card"><span>Reward points</span><strong>{formatPoints(walletPoints)}</strong></div></div>
      <div className="wallet-action-buttons">
        <button type="button" className="wallet-action-btn wallet-action-btn--deposit" onClick={() => onNavigate("player-deposit")}>
          <span className="wallet-action-icon">💰</span>
          <span className="wallet-action-label">Add Money</span>
        </button>
        <button type="button" className="wallet-action-btn wallet-action-btn--withdraw" onClick={() => onNavigate("player-withdrawal")}>
          <span className="wallet-action-icon">🏦</span>
          <span className="wallet-action-label">Withdraw</span>
        </button>
        <button type="button" className="wallet-action-btn wallet-action-btn--history" onClick={() => onNavigate("player-transactions")}>
          <span className="wallet-action-icon">📋</span>
          <span className="wallet-action-label">History</span>
        </button>
      </div>
      <div className="wallet-page-grid">
        <section className="content-card ledger-card"><div className="panel-heading"><span>ACTIVITY</span><h2>Points history</h2></div><div className="ledger-list">{ledger.length === 0 && <p className="empty-state">No points activity yet.</p>}{ledger.map((entry) => <article key={entry.id}><span className={`ledger-icon ${entry.amount >= 0 ? "credit" : "debit"}`}><Icon name={entry.amount >= 0 ? "sparkle" : "ticket"} size={18}/></span><div><strong>{entry.description || entry.reference_type}</strong><small>{formatDateTime(entry.created_at)}</small></div><p className={entry.amount >= 0 ? "credit" : "debit"}>{entry.amount >= 0 ? "+" : ""}{formatPoints(entry.amount)}<small>Balance {formatPoints(entry.balance_after)}</small></p></article>)}</div></section>
        <form className="content-card limits-card" onSubmit={save}><div className="panel-heading"><span>RESPONSIBLE PLAY</span><h2>Your play limits</h2><p>The database blocks new ticket purchases after your daily point limit is reached.</p></div><label>Daily lottery limit<input type="number" min="0" max="100000" value={form.dailyPointLimit} onChange={(event) => setForm((current) => ({ ...current, dailyPointLimit: event.target.value }))}/><small>points per UTC day</small></label><label>Session reminder<input type="number" min="5" max="1440" value={form.sessionLimitMinutes} onChange={(event) => setForm((current) => ({ ...current, sessionLimitMinutes: event.target.value }))}/><small>minutes</small></label>{message && <p className={message.includes("successfully") ? "success-message" : "auth-error"}>{message}</p>}<button className="primary-button" type="submit" disabled={saving}>{saving ? "Saving…" : "Save play limits"}</button><p className="limits-note"><Icon name="shield" size={16}/>Points have no cash value and cannot be withdrawn.</p></form>
      </div>
    </PlayerLayout>
  );
}

function RouletteGame({ onNavigate, onLogout, onSpin }) {
  const [choice, setChoice] = useState("");
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const spin = () => {
    if (!choice || spinning) return;
    setSpinning(true);
    setResult(null);
    setError("");
    window.setTimeout(async () => {
      try {
        const backendResult = await onSpin(choice);
        if (backendResult) {
          setResult(backendResult);
          return;
        }
        const number = rouletteNumbers[Math.floor(Math.random() * rouletteNumbers.length)];
        const color = number === 0 ? "Green" : redRouletteNumbers.has(number) ? "Red" : "Black";
        const won = choice === color || (choice === "Even" && number !== 0 && number % 2 === 0) || (choice === "Odd" && number % 2 === 1);
        setResult({ number, color, won });
      } catch (spinError) {
        setError(spinError.message || "Unable to complete this demo spin.");
      } finally {
        setSpinning(false);
      }
    }, 1800);
  };
  return (
    <PlayerLayout active="player-roulette" onNavigate={onNavigate} onLogout={onLogout} className="player-game-frame roulette-frame">
      <div className="game-page-heading"><div><span>BONUS GAME</span><h1>Royal Roulette</h1><p>A quick demo-points game. Weekly lottery remains the main RoyalWin786 game.</p></div><div className="demo-balance"><Icon name="wallet" size={20}/><span>Demo balance<strong>500 points</strong></span></div></div>
      <div className="roulette-layout">
        <section className="roulette-stage">
          <div className="roulette-pointer"/>
          <div className={`roulette-wheel ${spinning ? "spinning" : ""}`}>
            {rouletteNumbers.map((number, index) => <span key={number} style={{ "--wheel-index": index }}>{number}</span>)}
            <div className="roulette-center"><BrandMark compact/></div>
          </div>
          {result && <div className={`roulette-result ${result.won ? "won" : "lost"}`}><span>Result</span><strong>{result.number} • {result.color}</strong><p>{result.won ? "You won 100 demo points!" : "Try again on the next spin."}</p></div>}
        </section>
        <aside className="content-card roulette-controls">
          <span className="game-kicker"><Icon name="game" size={18}/>Place a demo choice</span>
          <h2>Choose one option</h2><p>This game uses demo points only—no deposits or cash-out.</p>
          <div className="roulette-choices">{["Red", "Black", "Even", "Odd"].map((item) => <button type="button" key={item} className={`${item.toLowerCase()} ${choice === item ? "selected" : ""}`} onClick={() => { setChoice(item); setResult(null); setError(""); }}>{item}</button>)}</div>
          <div className="demo-stake"><span>Demo stake</span><strong>50 points</strong></div>
          {error && <p className="auth-error">{error}</p>}
          <button type="button" className="primary-button" disabled={!choice || spinning} onClick={spin}>{spinning ? "Spinning…" : "Spin roulette"}</button>
          <button type="button" className="text-button" onClick={() => onNavigate("player-lottery")}>Back to main lottery</button>
        </aside>
      </div>
      <p className="responsible-note"><Icon name="shield" size={16}/>For entertainment/demo only. Production use requires age checks, responsible-play controls and local regulatory approval.</p>
    </PlayerLayout>
  );
}

function AdminConsole({ data, onCreateDraw, onOpenDraw, onCancelDraw, onPublishResult, onAdjustPoints, onUpdatePlayerStatus, onRefresh, onLogout }) {
  const tomorrow = new Date(Date.now() + 86400000);
  const closeTime = new Date(Date.now() + 23 * 3600000);
  const toLocalInput = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const [drawForm, setDrawForm] = useState({
    code: `RW-${new Date().getFullYear()}-${String((data?.draws?.length || 0) + 1).padStart(3, "0")}`,
    name: "RoyalWin Super 7",
    closesAt: toLocalInput(closeTime),
    drawAt: toLocalInput(tomorrow),
    maxNumber: 36,
    picksRequired: 6,
    entryPoints: 100,
    prizeLabel: "2,50,000 reward points",
  });
  const [resultInputs, setResultInputs] = useState({});
  const [cancelReasons, setCancelReasons] = useState({});
  const [pointsForm, setPointsForm] = useState({ email: "", points: 2500, reason: "Promotional reward points" });
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [adminTab, setAdminTab] = useState("draws");
  const summary = data?.summary || {};
  const draws = data?.draws || [];
  const players = data?.players || [];

  const runAction = async (key, action, successMessage) => {
    if (busy) return;
    setBusy(key);
    setNotice("");
    try {
      await action();
      await onRefresh();
      setNotice(successMessage);
    } catch (error) {
      setNotice(error.message || "Admin action failed.");
    } finally {
      setBusy("");
    }
  };

  const createDraw = (event) => {
    event.preventDefault();
    runAction("create", () => onCreateDraw(drawForm), "Draft draw created. Review reward tiers, then open it for players.");
  };

  const publish = (draw) => {
    const numbers = String(resultInputs[draw.id] || "").split(/[\s,]+/).filter(Boolean).map(Number);
    if (numbers.length !== Number(draw.picks_required) || numbers.some((number) => !Number.isInteger(number))) {
      setNotice(`Enter exactly ${draw.picks_required} valid result numbers.`);
      return;
    }
    runAction(`publish-${draw.id}`, () => onPublishResult(draw.id, numbers), "Result published. All tickets were settled and winner points were credited automatically.");
  };

  return (
    <AppFrame className="admin-console-frame">
      <div className="admin-console-screen">
        <header className="app-header admin-console-header"><div className="header-brand"><BrandMark compact/><span><strong>RoyalWin786</strong><small>Lottery Control Centre</small></span></div><button type="button" className="admin-refresh" onClick={onRefresh} disabled={Boolean(busy)}><Icon name="reset" size={18}/>Refresh</button><button type="button" className="icon-button logout-button" onClick={onLogout}><Icon name="logout" size={22}/><span>Logout</span></button></header>
        <div className="admin-console-content">
          <div className="admin-page-heading"><div><span>SECURE ADMIN</span><h1>Lottery operations</h1><p>Create draws, publish verified results, settle prizes and manage player reward points.</p></div><span className="backend-mode-badge live">Live Supabase controls</span></div>
          {notice && <p className={notice.includes("failed") || notice.includes("invalid") || notice.includes("Enter exactly") ? "auth-error admin-notice" : "success-message admin-notice"}>{notice}</p>}

          <section className="admin-stat-grid">
            <article><span><Icon name="user" size={22}/></span><p>Players<strong>{formatPoints(summary.players)}</strong></p></article>
            <article><span><Icon name="trophy" size={22}/></span><p>Open draws<strong>{formatPoints(summary.open_draws)}</strong></p></article>
            <article><span><Icon name="ticket" size={22}/></span><p>Tickets<strong>{formatPoints(summary.tickets)}</strong></p></article>
            <article><span><Icon name="wallet" size={22}/></span><p>Ticket points<strong>{formatPoints(summary.points_sales)}</strong></p></article>
            <article><span><Icon name="sparkle" size={22}/></span><p>Awarded<strong>{formatPoints(summary.winner_points)}</strong></p></article>
          </section>

          <div className="admin-console-tabs">
            {[["draws","🎰 Draws"],["payments","💰 Payments"],["players","👥 Players"]].map(([id,label])=>(
              <button key={id} type="button" className={`admin-console-tab ${adminTab===id?"admin-console-tab--active":""}`} onClick={()=>setAdminTab(id)}>{label}</button>
            ))}
          </div>

          {adminTab === "payments" && <AdminPaymentsTab/>}

          {adminTab === "players" && (
            <div style={{marginTop:18}}>
              <div style={{marginBottom:14,fontWeight:700,fontSize:14,color:"var(--navy)"}}>All Players ({players.length})</div>
              {players.length === 0 && <p className="empty-state content-card">No players yet.</p>}
              {players.map(player => (
                <div key={player.id} className="content-card" style={{padding:"16px",marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <div style={{width:42,height:42,borderRadius:"50%",background:"linear-gradient(135deg,var(--cyan),var(--navy))",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:800,fontSize:17}}>{(player.display_name||player.email||"?")[0].toUpperCase()}</div>
                      <div>
                        <div style={{fontWeight:700,fontSize:14,color:"var(--navy)"}}>{player.display_name||"—"}</div>
                        <div style={{fontSize:11,color:"var(--muted)"}}>{player.email}</div>
                        {player.phone&&<div style={{fontSize:11,color:"var(--muted)"}}>{player.phone}</div>}
                      </div>
                    </div>
                    <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                      <span style={{padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:player.status==="active"?"#dcfce7":player.status==="banned"?"#fee2e2":"#fef3c7",color:player.status==="active"?"#166534":player.status==="banned"?"#991b1b":"#92400e"}}>{player.status||"active"}</span>
                      <span style={{padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:"#fef9c3",color:"#854d0e"}}>{formatPoints(player.pointsBalance)} pts</span>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8,marginTop:12,paddingTop:10,borderTop:"1px solid var(--border)",flexWrap:"wrap"}}>
                    <span style={{fontSize:11,color:"var(--muted)",flex:1}}>Joined: {new Date(player.created_at).toLocaleDateString("en-IN")}</span>
                    {player.status!=="active"&&<button type="button" onClick={()=>runAction(`status-${player.id}`,()=>onUpdatePlayerStatus(player.id,"active"),"Player activated.")} style={{padding:"5px 12px",borderRadius:8,border:"1px solid #bbf7d0",background:"#dcfce7",color:"#166534",fontWeight:700,fontSize:12,cursor:"pointer"}}>✓ Activate</button>}
                    {player.status!=="suspended"&&<button type="button" onClick={()=>runAction(`status-${player.id}`,()=>onUpdatePlayerStatus(player.id,"suspended"),"Player suspended.")} style={{padding:"5px 12px",borderRadius:8,border:"1px solid #fde68a",background:"#fef3c7",color:"#92400e",fontWeight:700,fontSize:12,cursor:"pointer"}}>⏸ Hold</button>}
                    {player.status!=="banned"&&<button type="button" onClick={()=>{if(window.confirm(`Ban ${player.display_name||player.email}?`))runAction(`status-${player.id}`,()=>onUpdatePlayerStatus(player.id,"banned"),"Player banned.");}} style={{padding:"5px 12px",borderRadius:8,border:"1px solid #fecaca",background:"#fee2e2",color:"#991b1b",fontWeight:700,fontSize:12,cursor:"pointer"}}>🚫 Ban</button>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {adminTab === "draws" && <div className="admin-workspace-grid">
            <form className="content-card admin-form-card" onSubmit={createDraw}>
              <div className="panel-heading"><span>NEW DRAW</span><h2>Create lottery draw</h2><p>New draws start as drafts and must be opened separately.</p></div>
              <div className="admin-form-grid"><label>Draw code<input required value={drawForm.code} onChange={(event) => setDrawForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}/></label><label>Draw name<input required value={drawForm.name} onChange={(event) => setDrawForm((current) => ({ ...current, name: event.target.value }))}/></label><label>Sales close<input required type="datetime-local" value={drawForm.closesAt} onChange={(event) => setDrawForm((current) => ({ ...current, closesAt: event.target.value }))}/></label><label>Draw time<input required type="datetime-local" value={drawForm.drawAt} onChange={(event) => setDrawForm((current) => ({ ...current, drawAt: event.target.value }))}/></label><label>Maximum number<input required type="number" min="6" max="99" value={drawForm.maxNumber} onChange={(event) => setDrawForm((current) => ({ ...current, maxNumber: event.target.value }))}/></label><label>Numbers to pick<input required type="number" min="4" max="12" value={drawForm.picksRequired} onChange={(event) => setDrawForm((current) => ({ ...current, picksRequired: event.target.value }))}/></label><label>Entry points<input required type="number" min="0" max="100000" value={drawForm.entryPoints} onChange={(event) => setDrawForm((current) => ({ ...current, entryPoints: event.target.value }))}/></label><label>Top reward label<input required value={drawForm.prizeLabel} onChange={(event) => setDrawForm((current) => ({ ...current, prizeLabel: event.target.value }))}/></label></div>
              <button className="primary-button" type="submit" disabled={Boolean(busy)}>{busy === "create" ? "Creating…" : "Create draft draw"}</button>
            </form>

            <form className="content-card admin-form-card" onSubmit={(event) => { event.preventDefault(); runAction("points", () => onAdjustPoints(pointsForm.email, pointsForm.points, pointsForm.reason), "Player reward points updated and recorded in the audit ledger."); }}>
              <div className="panel-heading"><span>PLAYER SUPPORT</span><h2>Adjust reward points</h2><p>Use only for approved promotions, support corrections or testing. Every change is audited.</p></div>
              <label>Player email<input type="email" required value={pointsForm.email} onChange={(event) => setPointsForm((current) => ({ ...current, email: event.target.value }))}/></label><label>Point change<input type="number" required min="-1000000" max="1000000" value={pointsForm.points} onChange={(event) => setPointsForm((current) => ({ ...current, points: event.target.value }))}/><small>Use a negative value only for an approved correction.</small></label><label>Reason<input required minLength="5" value={pointsForm.reason} onChange={(event) => setPointsForm((current) => ({ ...current, reason: event.target.value }))}/></label><button className="primary-button" type="submit" disabled={Boolean(busy)}>{busy === "points" ? "Updating…" : "Record point adjustment"}</button>
              <div className="admin-player-preview"><strong>Recent players</strong>{players.slice(0, 6).map((player) => <button type="button" key={player.id} onClick={() => setPointsForm((current) => ({ ...current, email: player.email || "" }))}><span>{player.display_name || player.email || "Player"}<small>{player.status}</small></span><b>{formatPoints(player.pointsBalance)} pts</b></button>)}</div>
            </form>
          </div>

          </div>}

          {adminTab === "draws" && <section className="admin-draw-section"><div className="panel-heading"><span>DRAW CONTROL</span><h2>All lottery draws</h2><p>Publishing is allowed only after draw time. Settlement is atomic and cannot be rerun.</p></div><div className="admin-draw-list">{draws.length === 0 && <p className="empty-state">No draws created yet.</p>}{draws.map((draw) => <article className="content-card admin-draw-card" key={draw.id}><div className="admin-draw-head"><div><span className={`draw-status status-${draw.status}`}>{draw.status}</span><h3>{draw.name}</h3><p>{draw.code} • {draw.ticketCount} tickets</p></div><div><small>Draw time</small><strong>{formatDateTime(draw.draw_at)}</strong></div></div>{draw.result_numbers?.length > 0 ? <div className="ticket-balls ticket-balls--result">{draw.result_numbers.map((number) => <strong key={number}>{String(number).padStart(2, "0")}</strong>)}</div> : <div className="admin-draw-actions">{draw.status === "draft" && <button type="button" className="primary-button" disabled={Boolean(busy)} onClick={() => runAction(`open-${draw.id}`, () => onOpenDraw(draw.id), "Draw is now open for player ticket purchases.")}>{busy === `open-${draw.id}` ? "Opening…" : "Open draw for players"}</button>}{["open", "closed"].includes(draw.status) && <div className="publish-result-form"><input value={resultInputs[draw.id] || ""} onChange={(event) => setResultInputs((current) => ({ ...current, [draw.id]: event.target.value }))} placeholder={`Enter ${draw.picks_required} numbers: 4, 7, 12…`}/><button type="button" disabled={Boolean(busy)} onClick={() => publish(draw)}>{busy === `publish-${draw.id}` ? "Publishing…" : "Publish & settle"}</button></div>}</div>}{["draft", "open", "closed"].includes(draw.status) && <div className="cancel-draw-row"><input value={cancelReasons[draw.id] || ""} onChange={(event) => setCancelReasons((current) => ({ ...current, [draw.id]: event.target.value }))} placeholder="Cancellation reason (required)"/><button type="button" disabled={Boolean(busy) || String(cancelReasons[draw.id] || "").trim().length < 5} onClick={() => runAction(`cancel-${draw.id}`, () => onCancelDraw(draw.id, cancelReasons[draw.id]), "Draw cancelled. Every confirmed ticket was refunded automatically.")}>{busy === `cancel-${draw.id}` ? "Cancelling…" : "Cancel & refund"}</button></div>}<div className="admin-tier-row">{draw.draw_prize_tiers?.map((tier) => <span key={tier.matches_required}>{tier.matches_required} match <strong>{formatPoints(tier.prize_points)} pts</strong></span>)}</div></article>)}</div></section>
          </section>}

          <p className="responsible-note"><Icon name="shield" size={16}/>This console manages non-cash reward points. Real-money operations require a separate regulated and audited backend.</p>
        </div>
      </div>
    </AppFrame>
  );
}

function Countdown({ target }) {
  const calculateSeconds = () => target
    ? Math.max(0, Math.floor((new Date(target).getTime() - Date.now()) / 1000))
    : 0;
  const [seconds, setSeconds] = useState(calculateSeconds);
  useEffect(() => {
    setSeconds(calculateSeconds());
    const timer = window.setInterval(() => setSeconds(calculateSeconds()), 1000);
    return () => window.clearInterval(timer);
  }, [target]);
  const days = Math.floor(seconds / 86400);
  const hours = String(Math.floor((seconds % 86400) / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  return (
    <div className="countdown-row">
      {[{ value: days, label: "Days" }, { value: hours, label: "Hours" }, { value: minutes, label: "Minutes" }].map((item, index) => <div className="countdown-part" key={item.label}><div className="countdown-box"><strong>{String(item.value).padStart(2, "0")}</strong><span>{item.label}</span></div>{index < 2 && <b>:</b>}</div>)}
    </div>
  );
}


// ===== DEPOSIT SCREEN =====
function DepositScreen({ profile, walletPoints, onSuccess }) {
  const [settings, setSettings] = useState(null);
  const [method, setMethod] = useState("upi");
  const [amount, setAmount] = useState("");
  const [utrNumber, setUtrNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    getPaymentSettings().then(setSettings).catch(() => {});
  }, []);

  const coinsToAdd = settings ? Math.floor(Number(amount) * settings.coins_per_rupee) : 0;

  const submit = async () => {
    if (!amount || Number(amount) < (settings?.min_deposit || 100)) return setMsg({ type: "error", text: `Minimum deposit ₹${settings?.min_deposit || 100}` });
    if (method === "upi" && !utrNumber.trim()) return setMsg({ type: "error", text: "Please enter UTR number" });
    setBusy(true); setMsg(null);
    try {
      await submitDeposit({
        method, amount: Number(amount), coinsToAdd,
        utrNumber: utrNumber.trim(), notes,
        playerName: profile?.display_name || "",
        playerEmail: profile?.email || "",
      });
      setMsg({ type: "success", text: "Deposit request submitted! Admin will verify and add coins within 30 mins." });
      setStep(3);
      if (onSuccess) onSuccess();
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Failed to submit. Try again." });
    } finally { setBusy(false); }
  };

  return (
    <div className="wallet-screen">
      <div className="wallet-balance-card">
        <span className="wallet-balance-label">Current Balance</span>
        <span className="wallet-balance-amount">{(walletPoints || 0).toLocaleString()} coins</span>
      </div>

      {step === 3 ? (
        <div className="content-card payment-success">
          <div className="payment-success-icon">✅</div>
          <h3>Request Submitted!</h3>
          <p>Your deposit of <strong>₹{amount}</strong> is under review. Coins will be added within 30 minutes after verification.</p>
          <button className="primary-button" onClick={() => { setStep(1); setAmount(""); setUtrNumber(""); setMsg(null); }}>Make Another Deposit</button>
        </div>
      ) : (
        <div className="content-card">
          <div className="panel-heading"><span>ADD MONEY</span><h2>Deposit Funds</h2></div>
          {msg && <div className={`auth-notice ${msg.type === "error" ? "auth-notice--error" : "auth-notice--ok"}`}>{msg.text}</div>}

          <div className="payment-method-tabs">
            {[["upi", "📱 UPI / QR"], ["cash", "💵 Cash Deposit"]].map(([id, label]) => (
              <button key={id} type="button" className={`method-tab ${method === id ? "method-tab--active" : ""}`} onClick={() => setMethod(id)}>{label}</button>
            ))}
          </div>

          {step === 1 && (
            <>
              {method === "upi" && settings && (
                <div className="upi-details">
                  {settings.upi_qr_url && <img src={settings.upi_qr_url} alt="UPI QR Code" className="upi-qr"/>}
                  <div className="upi-id-box">
                    <span className="upi-id-label">UPI ID</span>
                    <span className="upi-id-value">{settings.upi_id}</span>
                    <button type="button" onClick={() => navigator.clipboard?.writeText(settings.upi_id)} className="copy-btn">Copy</button>
                  </div>
                  <p className="upi-instruction">Pay using any UPI app, then enter the UTR/reference number below.</p>
                </div>
              )}
              {method === "cash" && settings && (
                <div className="cash-instructions">
                  <div className="cash-icon">💵</div>
                  <p>{settings.cash_deposit_instructions}</p>
                </div>
              )}
              <label className="field-label">Amount (₹)
                <input type="number" className="text-field" placeholder={`Min ₹${settings?.min_deposit || 100}`} value={amount} onChange={e => setAmount(e.target.value)} min={settings?.min_deposit || 100} max={settings?.max_deposit || 50000}/>
              </label>
              {amount && coinsToAdd > 0 && (
                <div className="coins-preview">You will receive <strong>{coinsToAdd.toLocaleString()} coins</strong></div>
              )}
              <button className="primary-button" type="button" disabled={!amount} onClick={() => { if(Number(amount) >= (settings?.min_deposit||100)) setStep(2); else setMsg({type:"error",text:`Min ₹${settings?.min_deposit||100}`}); }}>Continue →</button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="payment-summary">
                <div className="summary-row"><span>Amount</span><strong>₹{amount}</strong></div>
                <div className="summary-row"><span>Coins to receive</span><strong>{coinsToAdd.toLocaleString()}</strong></div>
                <div className="summary-row"><span>Method</span><strong>{method === "upi" ? "UPI" : "Cash"}</strong></div>
              </div>
              {method === "upi" && (
                <label className="field-label">UTR / Reference Number *
                  <input type="text" className="text-field" placeholder="12-digit UTR number" value={utrNumber} onChange={e => setUtrNumber(e.target.value)}/>
                </label>
              )}
              <label className="field-label">Notes (optional)
                <input type="text" className="text-field" placeholder="e.g. Agent name, branch" value={notes} onChange={e => setNotes(e.target.value)}/>
              </label>
              <button className="primary-button" type="button" disabled={busy} onClick={submit}>{busy ? "Submitting…" : "Submit Deposit Request"}</button>
              <button className="text-button" type="button" onClick={() => setStep(1)}>← Back</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ===== WITHDRAWAL SCREEN =====
function WithdrawalScreen({ profile, walletPoints, onSuccess }) {
  const [settings, setSettings] = useState(null);
  const [method, setMethod] = useState("upi");
  const [amount, setAmount] = useState("");
  const [upiId, setUpiId] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [done, setDone] = useState(false);

  useEffect(() => { getPaymentSettings().then(setSettings).catch(() => {}); }, []);

  const coinsToDeduct = settings ? Math.floor(Number(amount) * settings.coins_per_rupee) : 0;
  const maxWithdrawable = settings ? Math.floor(walletPoints / settings.coins_per_rupee) : 0;

  const submit = async () => {
    if (!amount || Number(amount) < (settings?.min_withdrawal || 200)) return setMsg({ type: "error", text: `Minimum withdrawal ₹${settings?.min_withdrawal || 200}` });
    if (coinsToDeduct > walletPoints) return setMsg({ type: "error", text: "Insufficient coins!" });
    if (method === "upi" && !upiId.trim()) return setMsg({ type: "error", text: "Enter your UPI ID" });
    if (method === "bank" && (!accountNumber.trim() || !ifscCode.trim())) return setMsg({ type: "error", text: "Enter bank details" });
    setBusy(true); setMsg(null);
    try {
      await submitWithdrawal({
        method, amount: Number(amount), coinsToDeduct,
        upiId, bankName, accountNumber, ifscCode, accountHolder,
        playerName: profile?.display_name || "",
        playerEmail: profile?.email || "",
      });
      setDone(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Failed. Try again." });
    } finally { setBusy(false); }
  };

  if (done) return (
    <div className="content-card payment-success">
      <div className="payment-success-icon">🏦</div>
      <h3>Withdrawal Requested!</h3>
      <p>₹{amount} withdrawal is being processed. It will be transferred within 24-48 hours.</p>
      <p className="withdrawal-note">{settings?.withdrawal_note}</p>
    </div>
  );

  return (
    <div className="wallet-screen">
      <div className="wallet-balance-card">
        <span className="wallet-balance-label">Available Balance</span>
        <span className="wallet-balance-amount">{(walletPoints || 0).toLocaleString()} coins</span>
        <span className="wallet-balance-sub">Max withdrawable: ₹{maxWithdrawable.toLocaleString()}</span>
      </div>
      <div className="content-card">
        <div className="panel-heading"><span>WITHDRAW</span><h2>Request Withdrawal</h2></div>
        {msg && <div className={`auth-notice ${msg.type === "error" ? "auth-notice--error" : "auth-notice--ok"}`}>{msg.text}</div>}
        <div className="payment-method-tabs">
          {[["upi", "📱 UPI"], ["bank", "🏦 Bank Transfer"]].map(([id, label]) => (
            <button key={id} type="button" className={`method-tab ${method === id ? "method-tab--active" : ""}`} onClick={() => setMethod(id)}>{label}</button>
          ))}
        </div>
        <label className="field-label">Amount (₹)
          <input type="number" className="text-field" placeholder={`Min ₹${settings?.min_withdrawal || 200}`} value={amount} onChange={e => setAmount(e.target.value)}/>
        </label>
        {amount && coinsToDeduct > 0 && (
          <div className="coins-preview">Will deduct <strong>{coinsToDeduct.toLocaleString()} coins</strong> from your wallet</div>
        )}
        {method === "upi" && (
          <label className="field-label">Your UPI ID *
            <input type="text" className="text-field" placeholder="yourname@upi" value={upiId} onChange={e => setUpiId(e.target.value)}/>
          </label>
        )}
        {method === "bank" && (<>
          <label className="field-label">Account Holder Name *<input type="text" className="text-field" placeholder="As per bank records" value={accountHolder} onChange={e => setAccountHolder(e.target.value)}/></label>
          <label className="field-label">Bank Name<input type="text" className="text-field" placeholder="e.g. SBI, HDFC" value={bankName} onChange={e => setBankName(e.target.value)}/></label>
          <label className="field-label">Account Number *<input type="text" className="text-field" placeholder="Enter account number" value={accountNumber} onChange={e => setAccountNumber(e.target.value)}/></label>
          <label className="field-label">IFSC Code *<input type="text" className="text-field" placeholder="e.g. SBIN0001234" value={ifscCode} onChange={e => setIfscCode(e.target.value).toUpperCase()}/></label>
        </>)}
        <button className="primary-button" type="button" disabled={busy} onClick={submit}>{busy ? "Processing…" : "Submit Withdrawal Request"}</button>
      </div>
    </div>
  );
}

// ===== TRANSACTIONS HISTORY =====
function TransactionsScreen() {
  const [deposits, setDeposits] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [tab, setTab] = useState("deposits");
  useEffect(() => {
    getPlayerDeposits().then(setDeposits).catch(() => {});
    getPlayerWithdrawals().then(setWithdrawals).catch(() => {});
  }, []);
  const list = tab === "deposits" ? deposits : withdrawals;
  const statusColor = { pending: "#b45309", approved: "#166534", paid: "#166534", rejected: "#991b1b" };
  return (
    <div className="wallet-screen">
      <div className="payment-method-tabs" style={{marginBottom:16}}>
        {[["deposits","💰 Deposits"],["withdrawals","🏦 Withdrawals"]].map(([id,label])=>(
          <button key={id} type="button" className={`method-tab ${tab===id?"method-tab--active":""}`} onClick={()=>setTab(id)}>{label}</button>
        ))}
      </div>
      {list.length === 0 ? <div className="content-card" style={{textAlign:"center",padding:"40px 20px",color:"var(--muted)"}}>No {tab} yet.</div> : list.map(item => (
        <div key={item.id} className="content-card" style={{padding:"14px 16px",marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{fontWeight:700,fontSize:14}}>₹{item.amount} via {(item.method||"").toUpperCase()}</div>
              <div style={{fontSize:11,color:"var(--muted)",marginTop:3}}>{new Date(item.created_at).toLocaleString("en-IN")}</div>
              {item.utr_number && <div style={{fontSize:11,color:"var(--muted)"}}>UTR: {item.utr_number}</div>}
              {item.transaction_id && <div style={{fontSize:11,color:"var(--muted)"}}>TXN: {item.transaction_id}</div>}
              {item.admin_note && <div style={{fontSize:11,color:"var(--muted)",marginTop:3}}>Note: {item.admin_note}</div>}
            </div>
            <div style={{textAlign:"right"}}>
              <span style={{padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:`${statusColor[item.status]||"#374151"}22`,color:statusColor[item.status]||"#374151"}}>{item.status}</span>
              <div style={{fontSize:12,color:"var(--navy)",fontWeight:700,marginTop:4}}>{tab==="deposits"?`+${item.coins_to_add} coins`:`-${item.coins_to_deduct} coins`}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ===== ADMIN PAYMENTS TAB =====
function AdminPaymentsTab() {
  const [tab, setTab] = useState("deposits");
  const [deposits, setDeposits] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [actionInputs, setActionInputs] = useState({});
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState(null);

  const load = async () => {
    const [d, w, p, s] = await Promise.all([getAllDeposits(), getAllWithdrawals(), getAllPrizePayouts(), getPaymentSettings()]);
    setDeposits(d); setWithdrawals(w); setPayouts(p); setSettings(s);
  };
  useEffect(() => { load().catch(() => {}); }, []);

  const showMsg = (text, type = "success") => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3000); };

  const handleDeposit = async (id, action) => {
    setBusy(id);
    try {
      if (action === "approve") await approveDeposit(id, actionInputs[id] || "");
      else await rejectDeposit(id, actionInputs[id] || "Rejected by admin");
      showMsg(`Deposit ${action}d successfully!`);
      await load();
    } catch (err) { showMsg(err.message || "Failed", "error"); }
    finally { setBusy(""); }
  };

  const handleWithdrawal = async (id, action) => {
    setBusy(id);
    try {
      if (action === "approve") await approveWithdrawal(id, actionInputs[`txn_${id}`] || "", actionInputs[id] || "");
      else await rejectWithdrawal(id, actionInputs[id] || "Rejected by admin");
      showMsg(`Withdrawal ${action}d!`);
      await load();
    } catch (err) { showMsg(err.message || "Failed", "error"); }
    finally { setBusy(""); }
  };

  const handlePayout = async (id, status) => {
    setBusy(id);
    try {
      await updatePrizePayout(id, { status, transactionId: actionInputs[`txn_${id}`] || "", adminNote: actionInputs[id] || "" });
      showMsg("Payout updated!");
      await load();
    } catch (err) { showMsg(err.message || "Failed", "error"); }
    finally { setBusy(""); }
  };

  const statusBadge = (status) => {
    const colors = { pending: ["#fef3c7","#92400e"], approved: ["#d1fae5","#065f46"], paid: ["#d1fae5","#065f46"], rejected: ["#fee2e2","#991b1b"], processing: ["#dbeafe","#1e40af"] };
    const [bg, color] = colors[status] || ["#f3f4f6","#374151"];
    return <span style={{padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:bg,color}}>{status}</span>;
  };

  return (
    <div style={{marginTop:18}}>
      {msg && <div className={`auth-notice ${msg.type==="error"?"auth-notice--error":"auth-notice--ok"}`}>{msg.text}</div>}
      <div className="payment-method-tabs" style={{marginBottom:16}}>
        {[["deposits","💰 Deposits"],["withdrawals","🏦 Withdrawals"],["payouts","🏆 Prize Payouts"],["settings","⚙️ Settings"]].map(([id,label])=>(
          <button key={id} type="button" className={`method-tab ${tab===id?"method-tab--active":""}`} onClick={()=>setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === "deposits" && (
        <div>
          {deposits.length === 0 && <div className="content-card" style={{textAlign:"center",padding:"30px",color:"var(--muted)"}}>No deposit requests.</div>}
          {deposits.map(d => (
            <div key={d.id} className="content-card" style={{padding:"16px",marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                <div>
                  <div style={{fontWeight:700,fontSize:14}}>{d.player_name} <span style={{color:"var(--muted)",fontWeight:400,fontSize:12}}>({d.player_email})</span></div>
                  <div style={{fontSize:13,marginTop:4}}>₹{d.amount} via <strong>{(d.method||"").toUpperCase()}</strong> → <strong style={{color:"var(--cyan)"}}>{d.coins_to_add} coins</strong></div>
                  {d.utr_number && <div style={{fontSize:12,color:"var(--muted)"}}>UTR: {d.utr_number}</div>}
                  {d.notes && <div style={{fontSize:12,color:"var(--muted)"}}>Note: {d.notes}</div>}
                  <div style={{fontSize:11,color:"var(--muted)",marginTop:3}}>{new Date(d.created_at).toLocaleString("en-IN")}</div>
                </div>
                {statusBadge(d.status)}
              </div>
              {d.status === "pending" && (
                <div style={{marginTop:12,paddingTop:10,borderTop:"1px solid var(--border)",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                  <input placeholder="Admin note (optional)" value={actionInputs[d.id]||""} onChange={e=>setActionInputs(p=>({...p,[d.id]:e.target.value}))} style={{flex:1,minWidth:180,padding:"7px 12px",borderRadius:8,border:"1px solid var(--border)",fontSize:13,outline:"none"}}/>
                  <button disabled={busy===d.id} onClick={()=>handleDeposit(d.id,"approve")} style={{padding:"7px 16px",borderRadius:8,border:"1px solid #bbf7d0",background:"#dcfce7",color:"#166534",fontWeight:700,fontSize:13,cursor:"pointer"}}>✓ Approve</button>
                  <button disabled={busy===d.id} onClick={()=>handleDeposit(d.id,"reject")} style={{padding:"7px 16px",borderRadius:8,border:"1px solid #fecaca",background:"#fee2e2",color:"#991b1b",fontWeight:700,fontSize:13,cursor:"pointer"}}>✗ Reject</button>
                </div>
              )}
              {d.admin_note && <div style={{fontSize:12,color:"var(--muted)",marginTop:8}}>Admin: {d.admin_note}</div>}
            </div>
          ))}
        </div>
      )}

      {tab === "withdrawals" && (
        <div>
          {withdrawals.length === 0 && <div className="content-card" style={{textAlign:"center",padding:"30px",color:"var(--muted)"}}>No withdrawal requests.</div>}
          {withdrawals.map(w => (
            <div key={w.id} className="content-card" style={{padding:"16px",marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                <div>
                  <div style={{fontWeight:700,fontSize:14}}>{w.player_name} <span style={{color:"var(--muted)",fontWeight:400,fontSize:12}}>({w.player_email})</span></div>
                  <div style={{fontSize:13,marginTop:4}}>₹{w.amount} via <strong>{(w.method||"").toUpperCase()}</strong></div>
                  {w.method==="upi" && w.upi_id && <div style={{fontSize:12,color:"var(--muted)"}}>UPI: {w.upi_id}</div>}
                  {w.method==="bank" && <div style={{fontSize:12,color:"var(--muted)"}}>{w.bank_name} | {w.account_number} | {w.ifsc_code} | {w.account_holder}</div>}
                  <div style={{fontSize:11,color:"var(--muted)",marginTop:3}}>{new Date(w.created_at).toLocaleString("en-IN")}</div>
                </div>
                {statusBadge(w.status)}
              </div>
              {["pending","approved"].includes(w.status) && (
                <div style={{marginTop:12,paddingTop:10,borderTop:"1px solid var(--border)",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                  <input placeholder="Transaction ID" value={actionInputs[`txn_${w.id}`]||""} onChange={e=>setActionInputs(p=>({...p,[`txn_${w.id}`]:e.target.value}))} style={{flex:1,minWidth:140,padding:"7px 12px",borderRadius:8,border:"1px solid var(--border)",fontSize:13,outline:"none"}}/>
                  <input placeholder="Admin note" value={actionInputs[w.id]||""} onChange={e=>setActionInputs(p=>({...p,[w.id]:e.target.value}))} style={{flex:1,minWidth:140,padding:"7px 12px",borderRadius:8,border:"1px solid var(--border)",fontSize:13,outline:"none"}}/>
                  <button disabled={busy===w.id} onClick={()=>handleWithdrawal(w.id,"approve")} style={{padding:"7px 16px",borderRadius:8,border:"1px solid #bbf7d0",background:"#dcfce7",color:"#166534",fontWeight:700,fontSize:13,cursor:"pointer"}}>✓ Mark Paid</button>
                  <button disabled={busy===w.id} onClick={()=>handleWithdrawal(w.id,"reject")} style={{padding:"7px 16px",borderRadius:8,border:"1px solid #fecaca",background:"#fee2e2",color:"#991b1b",fontWeight:700,fontSize:13,cursor:"pointer"}}>✗ Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "payouts" && (
        <div>
          {payouts.length === 0 && <div className="content-card" style={{textAlign:"center",padding:"30px",color:"var(--muted)"}}>No prize payouts.</div>}
          {payouts.map(p => (
            <div key={p.id} className="content-card" style={{padding:"16px",marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                <div>
                  <div style={{fontWeight:700,fontSize:14}}>{p.player_name}</div>
                  <div style={{fontSize:12,color:"var(--muted)"}}>{p.draw_name}</div>
                  <div style={{fontSize:13,marginTop:4}}>Prize: <strong style={{color:"var(--gold)"}}>₹{p.prize_amount}</strong> ({p.prize_points} pts)</div>
                  {p.upi_id && <div style={{fontSize:12,color:"var(--muted)"}}>UPI: {p.upi_id}</div>}
                  {p.account_number && <div style={{fontSize:12,color:"var(--muted)"}}>{p.bank_name} | {p.account_number} | {p.ifsc_code}</div>}
                </div>
                {statusBadge(p.status)}
              </div>
              {["pending","processing"].includes(p.status) && (
                <div style={{marginTop:12,paddingTop:10,borderTop:"1px solid var(--border)",display:"flex",gap:8,flexWrap:"wrap"}}>
                  <input placeholder="Transaction ID" value={actionInputs[`txn_${p.id}`]||""} onChange={e=>setActionInputs(pr=>({...pr,[`txn_${p.id}`]:e.target.value}))} style={{flex:1,minWidth:140,padding:"7px 12px",borderRadius:8,border:"1px solid var(--border)",fontSize:13,outline:"none"}}/>
                  <button disabled={busy===p.id} onClick={()=>handlePayout(p.id,"paid")} style={{padding:"7px 14px",borderRadius:8,border:"1px solid #bbf7d0",background:"#dcfce7",color:"#166534",fontWeight:700,fontSize:13,cursor:"pointer"}}>✓ Mark Paid</button>
                  <button disabled={busy===p.id} onClick={()=>handlePayout(p.id,"processing")} style={{padding:"7px 14px",borderRadius:8,border:"1px solid #bfdbfe",background:"#dbeafe",color:"#1e40af",fontWeight:700,fontSize:13,cursor:"pointer"}}>Processing</button>
                  <button disabled={busy===p.id} onClick={()=>handlePayout(p.id,"failed")} style={{padding:"7px 14px",borderRadius:8,border:"1px solid #fecaca",background:"#fee2e2",color:"#991b1b",fontWeight:700,fontSize:13,cursor:"pointer"}}>Failed</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "settings" && settings && (
        <AdminPaymentSettings settings={settings} onSave={async (updated) => {
          await updatePaymentSettings(updated);
          setSettings(updated);
          showMsg("Payment settings saved!");
        }}/>
      )}
    </div>
  );
}

function AdminPaymentSettings({ settings, onSave }) {
  const [form, setForm] = useState(settings);
  const [busy, setBusy] = useState(false);
  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const save = async () => {
    setBusy(true);
    try { await onSave(form); } finally { setBusy(false); }
  };
  return (
    <div className="content-card">
      <div className="panel-heading"><span>PAYMENT SETTINGS</span><h2>Configure Payments</h2></div>
      <div className="admin-form-grid">
        <label>UPI ID<input className="text-field" value={form.upi_id||""} onChange={e=>set("upi_id",e.target.value)}/></label>
        <label>QR Code Image URL<input className="text-field" placeholder="https://..." value={form.upi_qr_url||""} onChange={e=>set("upi_qr_url",e.target.value)}/></label>
        <label>Coins per ₹1<input type="number" className="text-field" value={form.coins_per_rupee||1} onChange={e=>set("coins_per_rupee",Number(e.target.value))}/></label>
        <label>Min Deposit (₹)<input type="number" className="text-field" value={form.min_deposit||100} onChange={e=>set("min_deposit",Number(e.target.value))}/></label>
        <label>Max Deposit (₹)<input type="number" className="text-field" value={form.max_deposit||50000} onChange={e=>set("max_deposit",Number(e.target.value))}/></label>
        <label>Min Withdrawal (₹)<input type="number" className="text-field" value={form.min_withdrawal||200} onChange={e=>set("min_withdrawal",Number(e.target.value))}/></label>
        <label>Max Withdrawal (₹)<input type="number" className="text-field" value={form.max_withdrawal||25000} onChange={e=>set("max_withdrawal",Number(e.target.value))}/></label>
      </div>
      <label>Cash Deposit Instructions<textarea className="text-field" rows={3} value={form.cash_deposit_instructions||""} onChange={e=>set("cash_deposit_instructions",e.target.value)} style={{resize:"vertical"}}/></label>
      <label>Withdrawal Note<input className="text-field" value={form.withdrawal_note||""} onChange={e=>set("withdrawal_note",e.target.value)}/></label>
      <button className="primary-button" disabled={busy} onClick={save}>{busy?"Saving…":"Save Settings"}</button>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState(() => {
    if (recoveryModeRequested && liveBackendActive) return "player-reset-password";
    if (process.env.NODE_ENV === "development") {
      const previewScreen = new URLSearchParams(window.location.search).get("screen");
      const allowedPreviews = ["player-login", "player-register", "player-register-otp", "player-forgot-password", "player-reset-password", "player-dashboard", "player-lottery", "player-tickets", "player-results", "player-wallet", "player-roulette", "player-deposit", "player-withdrawal", "player-transactions", "admin-login", "admin-dashboard"];
      if (allowedPreviews.includes(previewScreen)) return previewScreen;
    }
    return "player-login";
  });
  const [playerIdentifier, setPlayerIdentifier] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [pendingRegistration, setPendingRegistration] = useState({ name: "", email: "", phone: "", age: "" });
  const [authNotice, setAuthNotice] = useState("");
  const [playerProfile, setPlayerProfile] = useState({ display_name: "RoyalWin player", email: "player@example.com" });
  const [playerTickets, setPlayerTickets] = useState(initialPlayerTickets);
  const [featuredDraw, setFeaturedDraw] = useState(liveBackendActive ? null : demoDraw);
  const [lotteryDraws, setLotteryDraws] = useState(liveBackendActive ? [] : [demoDraw, demoPublishedDraw]);
  const [walletPoints, setWalletPoints] = useState(2450);
  const [walletLedger, setWalletLedger] = useState([]);
  const [playSettings, setPlaySettings] = useState({ daily_point_limit: 1000, session_limit_minutes: 60 });
  const [adminData, setAdminData] = useState({
    summary: { players: 1, open_draws: 1, tickets: 1, points_sales: 100, winner_points: 0 },
    draws: [{ ...demoDraw, ticketCount: 1 }, { ...demoPublishedDraw, ticketCount: 1 }],
    players: [{ id: "demo-player", display_name: "Demo player", email: "player@example.com", status: "active", pointsBalance: 2450 }],
  });

  const loadPlayerPortalData = async () => {
    if (!liveBackendActive) return;
    const [draw, draws, tickets, wallet, ledger, settings] = await Promise.all([
      getFeaturedLotteryDraw(),
      getLotteryDraws(),
      getPlayerTickets(),
      getPlayerWallet(),
      getWalletLedger(),
      getResponsiblePlaySettings(),
    ]);
    setFeaturedDraw(draw);
    setLotteryDraws(draws);
    setPlayerTickets(tickets);
    setWalletPoints(Number(wallet.points_balance));
    setWalletLedger(ledger);
    setPlaySettings(settings);
  };

  const loadAdminPortalData = async () => {
    if (!liveBackendActive) return;
    setAdminData(await getAdminLotteryData());
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [screen]);

  useEffect(() => {
    if (!liveBackendActive) return undefined;
    let cancelled = false;
    const restoreSession = async () => {
      try {
        const identity = await getCurrentIdentity();
        if (!identity || cancelled) return;
        if (recoveryModeRequested) {
          setScreen("player-reset-password");
          return;
        }
        if (identity.profile.role === "admin") {
          await loadAdminPortalData();
          if (cancelled) return;
          setScreen("admin-dashboard");
          return;
        }
        await loadPlayerPortalData();
        if (!cancelled) {
          setPlayerProfile(identity.profile);
          setPlayerIdentifier(identity.profile.email || "");
          setScreen("player-dashboard");
        }
      } catch {
        // Keep the public login visible if a stored session is expired or incomplete.
      }
    };
    restoreSession();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!liveBackendActive) return undefined;
    return subscribeToAuthChanges((event) => {
      if (event === "PASSWORD_RECOVERY") setScreen("player-reset-password");
    });
  }, []);

  const registerNewPlayer = async (form) => {
    const redirectTo = getAuthRedirectUrl();
    if (liveBackendActive) {
      const result = await registerPlayer({ ...form, redirectTo });
      if (result.session) throw new Error("Email confirmation must be enabled in Supabase before player registration can be used.");
    }
    setPendingRegistration({ name: form.name.trim(), email: form.email.trim().toLowerCase(), phone: form.phone, age: form.age });
    setPlayerIdentifier(form.email.trim().toLowerCase());
    setScreen("player-register-otp");
  };
  const verifyPlayerOtp = async (otp) => {
    if (liveBackendActive) {
      const identity = await verifyRegistrationOtp(pendingRegistration.email, otp);
      await loadPlayerPortalData();
      setPlayerProfile(identity.profile);
    } else {
      setPlayerProfile({ display_name: pendingRegistration.name || "Demo player", email: pendingRegistration.email || "player@example.com", phone: pendingRegistration.phone, age: Number(pendingRegistration.age) });
    }
    setScreen("player-dashboard");
  };
  const resendPlayerOtp = async () => {
    if (liveBackendActive) await resendRegistrationOtp(pendingRegistration.email, getAuthRedirectUrl());
  };
  const playerLogin = async ({ identifier, password }) => {
    if (liveBackendActive) {
      const identity = await signInPlayer(identifier, password);
      await loadPlayerPortalData();
      setPlayerProfile(identity.profile);
    } else {
      setPlayerProfile({ display_name: "Demo player", email: identifier.includes("@") ? identifier : "player@example.com", phone: identifier.includes("@") ? "" : identifier });
    }
    setAuthNotice("");
    setScreen("player-dashboard");
  };
  const sendPasswordRecovery = async () => {
    if (liveBackendActive) await requestPasswordReset(recoveryEmail, getAuthRedirectUrl(true));
  };
  const saveRecoveredPassword = async (password) => {
    if (liveBackendActive) {
      await updateRecoveredPassword(password);
      await signOut();
    }
    const cleanUrl = new URL(`${process.env.PUBLIC_URL || ""}/`, window.location.origin);
    window.history.replaceState({}, document.title, cleanUrl.toString());
    setAuthNotice("Password updated successfully. Log in with your new password.");
    setScreen("player-login");
  };
  const adminLogin = async ({ userId, password }) => {
    if (liveBackendActive) {
      await signInAdmin(userId, password);
      await loadAdminPortalData();
    }
    setScreen("admin-dashboard");
  };
  const logout = async () => {
    try { if (liveBackendActive) await signOut(); }
    finally {
      setPlayerIdentifier("");
      setRecoveryEmail("");
      setPendingRegistration({ name: "", email: "", phone: "", age: "" });
      setAuthNotice("");
      setPlayerProfile({ display_name: "RoyalWin player", email: "player@example.com" });
      setFeaturedDraw(liveBackendActive ? null : demoDraw);
      setLotteryDraws(liveBackendActive ? [] : [demoDraw, demoPublishedDraw]);
      setPlayerTickets(initialPlayerTickets);
      setWalletPoints(2450);
      setWalletLedger([]);
      setScreen("player-login");
    }
  };
  const savePlayerTicket = async (numbers) => {
    if (liveBackendActive) {
      if (!featuredDraw?.id) throw new Error("No open lottery draw is available.");
      await purchaseLotteryTicket(featuredDraw.id, numbers);
      await loadPlayerPortalData();
      return;
    }
    setPlayerTickets((current) => [{ id: `RW786-${String(Date.now()).slice(-8)}`, numbers, matchedNumbers: [], matchCount: 0, prizePoints: 0, pointsSpent: 100, draw: demoDraw.name, drawCode: demoDraw.code, drawAt: demoDraw.draw_at, status: "confirmed", createdAt: new Date().toISOString() }, ...current]);
    setWalletPoints((current) => Math.max(0, current - 100));
  };
  const verifyPlayerTicket = async (code) => {
    if (liveBackendActive) return verifyLotteryTicket(code);
    const ticket = playerTickets.find((item) => item.id.toUpperCase() === String(code).trim().toUpperCase());
    return ticket ? { ticket_code: ticket.id, draw_name: ticket.draw, ticket_status: ticket.status, match_count: ticket.matchCount, prize_points: ticket.prizePoints } : null;
  };
  const savePlaySettings = async (settings) => {
    if (liveBackendActive) {
      const updated = await updateResponsiblePlaySettings(settings);
      setPlaySettings(updated);
      return;
    }
    setPlaySettings({ daily_point_limit: Number(settings.dailyPointLimit), session_limit_minutes: Number(settings.sessionLimitMinutes) });
  };
  const playRouletteRound = async (choice) => {
    if (liveBackendActive) return playDemoRoulette(choice);
    return null;
  };

  const adminCreateDraw = async (input) => {
    if (liveBackendActive) return createLotteryDraw(input);
    const newDraw = { ...demoDraw, id: `demo-${Date.now()}`, code: input.code, name: input.name, status: "draft", closes_at: new Date(input.closesAt).toISOString(), draw_at: new Date(input.drawAt).toISOString(), max_number: Number(input.maxNumber), picks_required: Number(input.picksRequired), entry_points: Number(input.entryPoints), prize_label: input.prizeLabel, ticketCount: 0 };
    setAdminData((current) => ({ ...current, draws: [newDraw, ...current.draws] }));
    return newDraw.id;
  };
  const adminOpenDraw = async (drawId) => {
    if (liveBackendActive) return openLotteryDraw(drawId);
    setAdminData((current) => ({ ...current, draws: current.draws.map((draw) => draw.id === drawId ? { ...draw, status: "open" } : draw) }));
  };
  const adminCancelDraw = async (drawId, reason) => {
    if (liveBackendActive) return cancelLotteryDraw(drawId, reason);
    setAdminData((current) => ({ ...current, draws: current.draws.map((draw) => draw.id === drawId ? { ...draw, status: "cancelled" } : draw) }));
    return { refunded_tickets: 0, refunded_points: 0 };
  };
  const adminPublishResult = async (drawId, numbers) => {
    if (liveBackendActive) return publishLotteryResult(drawId, numbers);
    setAdminData((current) => ({ ...current, draws: current.draws.map((draw) => draw.id === drawId ? { ...draw, status: "published", result_numbers: [...numbers].sort((a, b) => a - b) } : draw) }));
    return { settled_tickets: 0, winning_tickets: 0, awarded_points: 0 };
  };
  const adminUpdatePlayerStatus = async (playerId, status) => {
    const { error } = await requireSupabase().from("profiles").update({ status }).eq("id", playerId);
    if (error) throw error;
  };
  const adminAdjustPoints = async (email, points, reason) => {
    if (liveBackendActive) return adjustPlayerPoints(email, points, reason);
    setAdminData((current) => ({ ...current, players: current.players.map((player) => player.email === email ? { ...player, pointsBalance: Math.max(0, player.pointsBalance + Number(points)) } : player) }));
    return 0;
  };

  if (screen === "player-login") return <PlayerLogin identifier={playerIdentifier} setIdentifier={setPlayerIdentifier} onLogin={playerLogin} onRegister={() => { setPendingRegistration({ name: "", email: "", phone: "", age: "" }); setScreen("player-register"); }} onForgot={() => { setRecoveryEmail(playerIdentifier.includes("@") ? playerIdentifier : ""); setScreen("player-forgot-password"); }} onAdmin={() => setScreen("admin-login")} backendEnabled={liveBackendActive} notice={authNotice}/>;
  if (screen === "player-register") return <PlayerRegistration initial={pendingRegistration} onBack={() => setScreen("player-login")} onRegister={registerNewPlayer} backendEnabled={liveBackendActive}/>;
  if (screen === "player-register-otp") return <RegistrationOtp email={pendingRegistration.email} onBack={() => setScreen("player-register")} onVerify={verifyPlayerOtp} onResend={resendPlayerOtp} backendEnabled={liveBackendActive}/>;
  if (screen === "player-forgot-password") return <ForgotPassword email={recoveryEmail} setEmail={setRecoveryEmail} onBack={() => setScreen("player-login")} onSend={sendPasswordRecovery} backendEnabled={liveBackendActive}/>;
  if (screen === "player-reset-password") return <ResetPassword onSave={saveRecoveredPassword}/>;
  if (screen === "admin-login") return <AdminLogin onBack={() => setScreen("player-login")} onLogin={adminLogin} backendEnabled={liveBackendActive}/>;
  if (screen === "player-dashboard") return <PlayerDashboard profile={playerProfile} tickets={playerTickets} walletPoints={walletPoints} draw={featuredDraw} latestResult={lotteryDraws.find((draw) => draw.status === "published")} onNavigate={setScreen} onLogout={logout}/>;
  if (screen === "player-lottery") return <LotteryGame onNavigate={setScreen} onLogout={logout} onSave={savePlayerTicket} draw={featuredDraw}/>;
  if (screen === "player-tickets") return <PlayerTickets tickets={playerTickets} onVerify={verifyPlayerTicket} onNavigate={setScreen} onLogout={logout}/>;
  if (screen === "player-results") return <PlayerResults draws={lotteryDraws} tickets={playerTickets} onNavigate={setScreen} onLogout={logout}/>;
  if (screen === "player-wallet") return <PlayerWallet profile={playerProfile} walletPoints={walletPoints} ledger={walletLedger} settings={playSettings} onSaveSettings={savePlaySettings} onNavigate={setScreen} onLogout={logout}/>;
  if (screen === "player-deposit") return (
    <PlayerLayout active="player-wallet" onNavigate={setScreen} onLogout={logout} className="player-game-frame">
      <div className="game-page-heading"><div><span>ADD MONEY</span><h1>Deposit Funds</h1><p>Add money to your RoyalWin786 wallet</p></div></div>
      <DepositScreen profile={playerProfile} walletPoints={walletPoints} onSuccess={loadPlayerPortalData}/>
    </PlayerLayout>
  );
  if (screen === "player-withdrawal") return (
    <PlayerLayout active="player-wallet" onNavigate={setScreen} onLogout={logout} className="player-game-frame">
      <div className="game-page-heading"><div><span>WITHDRAW</span><h1>Request Withdrawal</h1><p>Transfer your winnings to your bank/UPI</p></div></div>
      <WithdrawalScreen profile={playerProfile} walletPoints={walletPoints} onSuccess={loadPlayerPortalData}/>
    </PlayerLayout>
  );
  if (screen === "player-transactions") return (
    <PlayerLayout active="player-wallet" onNavigate={setScreen} onLogout={logout} className="player-game-frame">
      <div className="game-page-heading"><div><span>HISTORY</span><h1>Transactions</h1><p>Your deposit and withdrawal history</p></div></div>
      <TransactionsScreen/>
    </PlayerLayout>
  );
  if (screen === "player-roulette") return <RouletteGame onNavigate={setScreen} onLogout={logout} onSpin={playRouletteRound}/>;
  if (screen === "admin-dashboard") return <AdminConsole data={adminData} onCreateDraw={adminCreateDraw} onOpenDraw={adminOpenDraw} onCancelDraw={adminCancelDraw} onPublishResult={adminPublishResult} onAdjustPoints={adminAdjustPoints} onUpdatePlayerStatus={adminUpdatePlayerStatus} onRefresh={loadAdminPortalData} onLogout={logout}/>;
  return <PlayerLogin identifier={playerIdentifier} setIdentifier={setPlayerIdentifier} onLogin={playerLogin} onRegister={() => { setPendingRegistration({ name: "", email: "", phone: "", age: "" }); setScreen("player-register"); }} onForgot={() => { setRecoveryEmail(playerIdentifier.includes("@") ? playerIdentifier : ""); setScreen("player-forgot-password"); }} onAdmin={() => setScreen("admin-login")} backendEnabled={liveBackendActive} notice={authNotice}/>;
}
