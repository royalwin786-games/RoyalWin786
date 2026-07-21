import { useEffect, useRef, useState } from "react";

const reportItems = [
  { icon: "chart", label: "Net Sales Report", screen: "orders" },
  { icon: "money", label: "Sold / Unsold", screen: "orders" },
  { icon: "clipboard", label: "Stock Summary", screen: "stock" },
  { icon: "cart", label: "Unsold Entry", screen: "stock" },
  { icon: "purchase", label: "Purchase Report", screen: "orders" },
  { icon: "document", label: "Unsold Details", screen: "orders" },
  { icon: "arrange", label: "Series Arrange", screen: "stock" },
];

const orderGroups = [
  { name: "ROYALWIN GOLD WEEKLY DRAW", code: "RW1230", date: "15/01/2026" },
  { name: "ROYALWIN DIAMOND WEEKLY DRAW", code: "RW1223", date: "15/01/2026" },
];

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
      <span className="brand-kicker">Secure partner platform</span>
      <BrandMark />
      <h1>RoyalWin<span>786</span></h1>
      <p>Smart draw, stock and ticket management</p>
      <div className="brand-benefits" aria-label="Platform benefits">
        <span><Icon name="shield" size={18}/>Secure access</span>
        <span><Icon name="chart" size={18}/>Live insights</span>
        <span><Icon name="ticket" size={18}/>Fast operations</span>
      </div>
      {showVersion && <small>RoyalWin Web &amp; App • v2.0</small>}
    </section>
  );
}

function OtpLogin({ mobile, setMobile, onContinue, onRegister }) {
  const valid = mobile.replace(/\D/g, "").length === 10;
  return (
    <AppFrame className="auth-frame">
      <div className="otp-screen">
        <Brand />
        <section className="auth-card otp-card">
          <div className="auth-card-heading"><span>Partner login</span><h2>Welcome back</h2><p>Enter your registered mobile number to continue securely.</p></div>
          <label className="phone-input">
            <strong>+91</strong><span/><input value={mobile} inputMode="numeric" maxLength={10} placeholder="Enter mobile number" onChange={(event) => setMobile(event.target.value.replace(/\D/g, ""))}/>
          </label>
          <button type="button" className="primary-button" disabled={!valid} onClick={onContinue}>Request OTP</button>
          <button type="button" className="text-button" onClick={onRegister}>New partner? <strong>Create account</strong></button>
          <p className="secure-note"><Icon name="shield" size={16}/>Your login is protected with secure verification.</p>
        </section>
      </div>
    </AppFrame>
  );
}

function MpinLogin({ mobile, onLogin }) {
  const [mpin, setMpin] = useState(["", "", "", ""]);
  const refs = useRef([]);
  const [biometric, setBiometric] = useState(false);

  const changeDigit = (index, value) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    setMpin((current) => current.map((item, itemIndex) => itemIndex === index ? digit : item));
    if (digit && refs.current[index + 1]) refs.current[index + 1].focus();
  };

  return (
    <AppFrame className="auth-frame">
      <div className="mpin-screen">
        <Brand showVersion />
        <section className="auth-card mpin-card">
          <div className="auth-card-heading"><span>Secure sign in</span><h2>Hello {mobile || "9769980248"}</h2><p>Choose your preferred login method.</p></div>
          <div className="login-methods"><button type="button" className="outline-pill">Biometric</button><button type="button" className="solid-pill">MPIN</button></div>
          <label className="mpin-label">Enter MPIN</label>
          <div className="mpin-row">
            {mpin.map((digit, index) => <input key={index} ref={(node) => { refs.current[index] = node; }} type="password" inputMode="numeric" maxLength={1} value={digit} placeholder="•" aria-label={`MPIN digit ${index + 1}`} onChange={(event) => changeDigit(index, event.target.value)} />)}
          </div>
          <button type="button" className="forgot-button">Forgot MPIN</button>
          <div className="biometric-row"><strong>Enable Biometric</strong><button type="button" aria-pressed={biometric} aria-label="Enable biometric" className={`toggle ${biometric ? "toggle--on" : ""}`} onClick={() => setBiometric((value) => !value)}><span/></button></div>
        </section>
        <button type="button" className="login-action" onClick={onLogin}>Login With MPIN</button>
      </div>
    </AppFrame>
  );
}

function AppHeader({ onLogout, onNavigate }) {
  return (
    <header className="app-header">
      <div className="header-brand"><BrandMark compact/><span><strong>RoyalWin786</strong><small>Partner Console</small></span></div>
      <nav className="desktop-nav" aria-label="Desktop navigation">
        <button type="button" className="active"><Icon name="home" size={18}/>Overview</button>
        <button type="button" onClick={() => onNavigate("orders")}><Icon name="trophy" size={18}/>Results</button>
        <button type="button" onClick={() => onNavigate("stock")}><Icon name="cube" size={18}/>Stock</button>
        <button type="button" onClick={() => onNavigate("orders")}><Icon name="document" size={18}/>Orders</button>
      </nav>
      <button type="button" className="icon-button logout-button" aria-label="Logout" onClick={onLogout}><Icon name="logout" size={24}/><span>Logout</span></button>
    </header>
  );
}

function Countdown() {
  const [seconds, setSeconds] = useState(2 * 3600 + 41 * 60 + 12);
  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const hours = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  return (
    <div className="countdown-row">
      {[{ value: hours, label: "Hour" }, { value: minutes, label: "Minutes" }, { value: secs, label: "Seconds" }].map((item, index) => <div className="countdown-part" key={item.label}><div className="countdown-box"><strong>{item.value}</strong><span>{item.label}</span></div>{index < 2 && <b>:</b>}</div>)}
    </div>
  );
}

function BottomMenu({ onNavigate }) {
  const items = [
    { icon: "home", label: "Overview", screen: "dashboard", active: true },
    { icon: "trophy", label: "Results", screen: "orders" },
    { icon: "cube", label: "Stock", screen: "stock" },
    { icon: "ticket", label: "Verify Ticket", screen: "orders" },
  ];
  return (
    <nav className="bottom-menu" aria-label="Main navigation">
      {items.map((item) => <button type="button" key={item.label} className={item.active ? "active" : ""} onClick={() => onNavigate(item.screen)}><span><Icon name={item.icon} size={27}/></span><small>{item.label}</small></button>)}
    </nav>
  );
}

function Dashboard({ onNavigate, onLogout }) {
  return (
    <AppFrame className="dashboard-frame">
      <div className="dashboard-screen">
        <AppHeader onLogout={onLogout} onNavigate={onNavigate}/>
        <div className="dashboard-content">
          <div className="page-heading"><div><span>Dashboard</span><h1>Good afternoon, partner</h1><p>Here is your RoyalWin786 activity overview.</p></div><button type="button" onClick={() => onNavigate("stock")}>Manage stock <span>→</span></button></div>
          <section className="content-card timer-card">
            <div className="section-heading"><span className="chip"><Icon name="clock" size={19}/>Next draw close</span><h2>Time remaining</h2></div>
            <Countdown />
          </section>
          <section className="content-card latest-card">
            <span className="chip"><i/>Latest draw</span>
            <h2>ROYALWIN GOLD WEEKLY DRAW</h2>
            <div className="draw-grid">
              <div><span className="round-icon"><Icon name="calendar" size={23}/></span><p>Draw Date<strong>15/01/2026</strong></p></div>
              <div><span className="round-icon"><Icon name="clock" size={23}/></span><p>Time<strong>01:00 PM</strong></p></div>
            </div>
          </section>
          <section className="report-grid">
            {reportItems.map((item) => <button type="button" key={item.label} className="report-tile" onClick={() => onNavigate(item.screen)}><span><Icon name={item.icon} size={30}/></span><small>{item.label}</small></button>)}
          </section>
        </div>
        <BottomMenu onNavigate={onNavigate}/>
      </div>
    </AppFrame>
  );
}

function ScreenTopBar({ title, onBack, action }) {
  return (
    <header className="screen-topbar">
      <button type="button" className="back-button" aria-label="Go back" onClick={onBack}><Icon name="back" size={35}/></button>
      <h1>{title}</h1>
      {action || <span className="topbar-spacer"/>}
    </header>
  );
}

function StockScreen({ onBack }) {
  const [fields, setFields] = useState({ from: "", to: "", qty: "" });
  const [activeField, setActiveField] = useState("from");
  const [submitted, setSubmitted] = useState(false);

  const addDigit = (digit) => {
    setFields((current) => ({ ...current, [activeField]: `${current[activeField]}${digit}`.slice(0, 5) }));
    setSubmitted(false);
  };
  const clear = () => { setFields({ from: "", to: "", qty: "" }); setSubmitted(false); };
  const removeDigit = () => setFields((current) => ({ ...current, [activeField]: current[activeField].slice(0, -1) }));
  const bookwise = () => { setFields({ from: "2015", to: "2015", qty: "50" }); setSubmitted(false); };

  return (
    <AppFrame className="details-frame">
      <div className="details-screen stock-screen">
        <ScreenTopBar title="Stock Unsold" onBack={onBack} action={<div className="expiry-pill">5d 4h 6m 1s</div>}/>
        <div className="details-content">
          <section className="content-card stock-summary">
            <div className="summary-top"><span>Draw Date: 20-01-2026</span><button type="button"><Icon name="eye" size={23}/>View Stock</button></div>
            <h2>ROYALWIN PREMIUM WEEKLY DRAW - RW1233</h2>
            <div className="stock-range">
              <div className="stock-tags"><span>Book 50</span><span>Series 00</span></div>
              <div className="stock-values"><p>From<strong>2015</strong></p><p>To<strong>2015</strong></p><p>Qty<strong>50</strong></p><button type="button" aria-label="Reset stock"><Icon name="reset" size={28}/></button></div>
            </div>
          </section>
          <section className="content-card unsold-entry">
            <div className="entry-heading"><h2>Enter Number for Unsold</h2><span>Total Qty : <strong>{fields.qty || 0}</strong></span></div>
            <div className="field-grid">
              {["from", "to", "qty"].map((field) => <button type="button" key={field} className={activeField === field ? "active" : ""} onClick={() => setActiveField(field)}><span>{field[0].toUpperCase() + field.slice(1)}</span><strong>{fields[field] || "—"}</strong></button>)}
            </div>
            {submitted && <p className="submit-message">Unsold quantity submitted successfully.</p>}
          </section>
          <section className="number-pad" aria-label="Number pad">
            {[1,2,3,4,5,6,7,8,9].map((digit) => <button type="button" key={digit} onClick={() => addDigit(digit)}>{digit}</button>)}
            <button type="button" className="clear-key" onClick={clear}>C</button>
            <button type="button" className="delete-key" onClick={removeDigit}><Icon name="delete" size={28}/></button>
            <button type="button" className="qr-key" aria-label="Scan QR"><Icon name="qr" size={28}/></button>
            <button type="button" onClick={() => addDigit(0)}>0</button>
            <button type="button" className="bookwise-key" onClick={bookwise}>Bookwise<br/>Unsold</button>
            <button type="button" className="submit-key" onClick={() => setSubmitted(true)}>Submit</button>
          </section>
        </div>
      </div>
    </AppFrame>
  );
}

function DrawOrder({ draw, cleared }) {
  return (
    <div className="order-group">
      <section className="lottery-order">
        <div className="lottery-order__head"><div><h2>{draw.name}</h2><p>DRAW DATE: {draw.date} • CODE: {draw.code}</p></div><span>Total</span></div>
        <div className="order-bands">{["5/5","10/10","25/25","50/50","100/100"].map((item) => <strong key={item}>{item}</strong>)}</div>
        <div className="order-inputs"><span><Icon name="copy" size={24}/></span>{[0,1,2,3,4].map((item) => <div key={item}>{cleared ? 0 : 0}</div>)}</div>
      </section>
      <section className="lottery-total"><div><h2>{draw.name}<br/>{draw.code}</h2><p>Total tickets for this draw</p></div><span>Grand<strong>0</strong></span></section>
    </div>
  );
}

function OrdersScreen({ onBack }) {
  const [cleared, setCleared] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  return (
    <AppFrame className="details-frame orders-frame">
      <div className="details-screen orders-screen">
        <ScreenTopBar title="View Order List" onBack={onBack} action={<button type="button" className="clear-orders" onClick={() => { setCleared(true); setSubmitted(false); }}>Clear</button>}/>
        <div className="orders-content">
          {orderGroups.map((draw) => <DrawOrder key={draw.code} draw={draw} cleared={cleared}/>) }
        </div>
        <div className="order-footer">
          <div className="grand-total"><span>Grand Total</span><strong>0</strong></div>
          {submitted && <p>Order list submitted.</p>}
          <div><button type="button" className="primary-button" onClick={() => setSubmitted(true)}>Submit</button><button type="button" className="secondary-button" onClick={() => { setCleared(true); setSubmitted(false); }}>Clear</button></div>
        </div>
      </div>
    </AppFrame>
  );
}

export default function App() {
  const [screen, setScreen] = useState("otp");
  const [mobile, setMobile] = useState("");

  const logout = () => { setMobile(""); setScreen("otp"); };
  if (screen === "otp") return <OtpLogin mobile={mobile} setMobile={setMobile} onContinue={() => setScreen("mpin")} onRegister={() => { setMobile("9769980248"); setScreen("mpin"); }}/>;
  if (screen === "mpin") return <MpinLogin mobile={mobile} onLogin={() => setScreen("dashboard")}/>;
  if (screen === "stock") return <StockScreen onBack={() => setScreen("dashboard")}/>;
  if (screen === "orders") return <OrdersScreen onBack={() => setScreen("dashboard")}/>;
  return <Dashboard onNavigate={setScreen} onLogout={logout}/>;
}
