import { useState, useEffect, useCallback, useRef } from "react";

// ===== CARD ENGINE =====
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const RANK_VAL = { A: 14, K: 13, Q: 12, J: 11, 10: 10, 9: 9, 8: 8, 7: 7, 6: 6, 5: 5, 4: 4, 3: 3, 2: 2 };

function createDeck() {
  const deck = [];
  for (const suit of SUITS) for (const rank of RANKS) deck.push({ suit, rank, val: RANK_VAL[rank] });
  return deck;
}

function shuffle(deck) {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function isRed(suit) { return suit === "♥" || suit === "♦"; }

// ===== TEEN PATTI HAND RANKINGS =====
function getTeenPattiRank(cards) {
  if (cards.length !== 3) return { rank: 0, name: "—" };
  const vals = cards.map(c => c.val).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  const ranks = cards.map(c => c.rank);
  const isFlush = suits.every(s => s === suits[0]);
  const sorted = [...vals].sort((a, b) => b - a);
  const isSeq = (sorted[0] - sorted[1] === 1 && sorted[1] - sorted[2] === 1) ||
    (sorted[0] === 14 && sorted[1] === 3 && sorted[2] === 2);
  const isTrip = vals[0] === vals[1] && vals[1] === vals[2];
  const isPair = vals[0] === vals[1] || vals[1] === vals[2] || vals[0] === vals[2];

  if (isFlush && isSeq) return { rank: 6, name: "Pure Sequence", score: vals[0] };
  if (isTrip) return { rank: 5, name: "Three of a Kind", score: vals[0] };
  if (isSeq) return { rank: 4, name: "Sequence", score: vals[0] };
  if (isFlush) return { rank: 3, name: "Flush", score: vals[0] * 100 + vals[1] };
  if (isPair) return { rank: 2, name: "Pair", score: vals[0] * 100 + vals[1] };
  return { rank: 1, name: "High Card", score: vals[0] * 100 + vals[1] * 10 + vals[2] };
}

// ===== CARD COMPONENT =====
function Card({ card, faceDown = false, small = false, animate = false }) {
  const size = small ? { width: 38, height: 54, fontSize: 11, borderRadius: 5 } : { width: 60, height: 84, fontSize: 16, borderRadius: 8 };
  const base = {
    ...size, display: "inline-flex", flexDirection: "column", justifyContent: "space-between",
    padding: small ? "3px 4px" : "5px 7px", border: "1px solid #d1d5db", userSelect: "none",
    fontWeight: 700, transition: "transform 0.3s", boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
    animation: animate ? "dealCard 0.3s ease" : "none",
  };
  if (faceDown) return (
    <div style={{ ...base, background: "linear-gradient(135deg, #1e3a8a, #1d4ed8)", border: "1px solid #3b82f6" }}>
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.4 }}>
        <span style={{ fontSize: small ? 16 : 24 }}>🂠</span>
      </div>
    </div>
  );
  const color = isRed(card.suit) ? "#dc2626" : "#111827";
  return (
    <div style={{ ...base, background: "white", color }}>
      <div style={{ fontSize: size.fontSize, lineHeight: 1 }}>{card.rank}<br />{card.suit}</div>
      <div style={{ fontSize: size.fontSize, lineHeight: 1, alignSelf: "flex-end", transform: "rotate(180deg)" }}>{card.rank}<br />{card.suit}</div>
    </div>
  );
}

// ===== TEEN PATTI GAME =====
function TeenPatti({ walletPoints, setWalletPoints, onExit }) {
  const [phase, setPhase] = useState("bet"); // bet, play, showdown, result
  const [ante, setAnte] = useState(10);
  const [pot, setPot] = useState(0);
  const [playerCards, setPlayerCards] = useState([]);
  const [aiCards, setAiCards] = useState([]);
  const [playerSeen, setPlayerSeen] = useState(false);
  const [currentBet, setCurrentBet] = useState(0);
  const [playerFolded, setPlayerFolded] = useState(false);
  const [aiFolded, setAiFolded] = useState(false);
  const [result, setResult] = useState(null);
  const [msg, setMsg] = useState("");
  const [aiThinking, setAiThinking] = useState(false);
  const deckRef = useRef([]);

  const startGame = () => {
    if (walletPoints < ante * 2) return setMsg("Not enough coins!");
    const deck = shuffle(createDeck());
    deckRef.current = deck;
    const pCards = [deck[0], deck[1], deck[2]];
    const aCards = [deck[3], deck[4], deck[5]];
    setPlayerCards(pCards); setAiCards(aCards);
    setPlayerSeen(false); setPlayerFolded(false); setAiFolded(false);
    setResult(null); setMsg("");
    const bootPot = ante * 2;
    setPot(bootPot);
    setCurrentBet(ante);
    setWalletPoints(w => w - ante);
    setPhase("play");
  };

  const seeCards = () => setPlayerSeen(true);

  const placeBet = (amount) => {
    if (walletPoints < amount) return setMsg("Not enough coins!");
    setWalletPoints(w => w - amount);
    setPot(p => p + amount);
    setCurrentBet(amount);
    aiTurn(amount);
  };

  const fold = () => {
    setPlayerFolded(true);
    setResult({ winner: "ai", reason: "You folded" });
    setPhase("result");
  };

  const aiTurn = useCallback((playerBet) => {
    setAiThinking(true);
    setTimeout(() => {
      setAiThinking(false);
      const aiHand = getTeenPattiRank(aiCards);
      const rand = Math.random();
      // AI folds on bad hand sometimes
      if (aiHand.rank <= 1 && rand < 0.35) {
        setAiFolded(true);
        setWalletPoints(w => w + pot + playerBet);
        setResult({ winner: "player", reason: "AI folded!" });
        setPhase("result");
        return;
      }
      // AI calls
      setPot(p => p + playerBet);
      setMsg("AI called!");
      // Auto showdown after AI calls 3 times
      if (Math.random() < 0.4) showdown();
    }, 1200);
  }, [aiCards, pot]);

  const showdown = useCallback(() => {
    setPhase("showdown");
    setTimeout(() => {
      const playerHand = getTeenPattiRank(playerCards);
      const aiHand = getTeenPattiRank(aiCards);
      let winner, reason;
      if (playerHand.rank > aiHand.rank || (playerHand.rank === aiHand.rank && playerHand.score >= aiHand.score)) {
        winner = "player";
        reason = `Your ${playerHand.name} beats AI's ${aiHand.name}!`;
        setWalletPoints(w => w + pot);
      } else {
        winner = "ai";
        reason = `AI's ${aiHand.name} beats your ${playerHand.name}`;
      }
      setResult({ winner, reason, playerHand: playerHand.name, aiHand: aiHand.name });
      setPhase("result");
    }, 1500);
  }, [playerCards, aiCards, pot]);

  const betAmount = playerSeen ? currentBet * 2 : currentBet;

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 14px 80px" }}>
      <div style={{ textAlign: "center", padding: "16px 0 10px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#b45309", letterSpacing: 2 }}>TEEN PATTI</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#1e3a8a" }}>3 Patti</div>
      </div>

      {/* Pot & Balance */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, background: "#1e3a8a", borderRadius: 12, padding: "10px 14px", color: "white", textAlign: "center" }}>
          <div style={{ fontSize: 10, opacity: 0.7, letterSpacing: 1 }}>POT</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#fbbf24" }}>{pot}</div>
        </div>
        <div style={{ flex: 1, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "10px 14px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#166534", letterSpacing: 1 }}>YOUR COINS</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#166534" }}>{walletPoints}</div>
        </div>
      </div>

      {/* AI Section */}
      <div style={{ background: "#1e3a8a", borderRadius: 16, padding: "16px", marginBottom: 12, textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>
          {aiThinking ? "🤔 AI is thinking..." : aiFolded ? "AI Folded" : "AI Player"}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          {phase === "showdown" || phase === "result"
            ? aiCards.map((c, i) => <Card key={i} card={c} />)
            : [0, 1, 2].map(i => <Card key={i} faceDown />)}
        </div>
        {result && <div style={{ marginTop: 8, fontSize: 13, color: "#fbbf24", fontWeight: 600 }}>{result.aiHand}</div>}
      </div>

      {msg && <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 10, padding: "8px 14px", fontSize: 13, color: "#92400e", marginBottom: 10, textAlign: "center" }}>{msg}</div>}

      {/* Player Cards */}
      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 16, padding: "16px", marginBottom: 12, textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>Your Cards {playerSeen ? "" : "(Blind)"}</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          {phase === "bet" ? [0, 1, 2].map(i => <Card key={i} faceDown />) :
            playerCards.map((c, i) => <Card key={i} card={c} faceDown={!playerSeen} animate />)}
        </div>
        {result && <div style={{ marginTop: 8, fontSize: 13, color: "#1e3a8a", fontWeight: 600 }}>{result.playerHand}</div>}
      </div>

      {/* Result */}
      {phase === "result" && result && (
        <div style={{ background: result.winner === "player" ? "#d1fae5" : "#fee2e2", border: `1px solid ${result.winner === "player" ? "#6ee7b7" : "#fca5a5"}`, borderRadius: 14, padding: "16px", marginBottom: 12, textAlign: "center" }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>{result.winner === "player" ? "🏆" : "😔"}</div>
          <div style={{ fontWeight: 800, fontSize: 18, color: result.winner === "player" ? "#065f46" : "#991b1b" }}>
            {result.winner === "player" ? `You Won ${pot} Coins!` : "You Lost!"}
          </div>
          <div style={{ fontSize: 13, color: "#374151", marginTop: 4 }}>{result.reason}</div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {phase === "bet" && (
          <>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[10, 20, 50, 100].map(a => (
                <button key={a} onClick={() => setAnte(a)} style={{ flex: 1, padding: "8px", borderRadius: 10, border: `2px solid ${ante === a ? "#1e3a8a" : "#e5e7eb"}`, background: ante === a ? "#eff6ff" : "white", color: ante === a ? "#1e3a8a" : "#374151", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{a}</button>
              ))}
            </div>
            <button onClick={startGame} style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #1e3a8a, #2563eb)", color: "white", fontWeight: 800, fontSize: 16, cursor: "pointer" }}>
              Deal Cards (Ante: {ante} coins)
            </button>
          </>
        )}

        {phase === "play" && !aiThinking && (
          <>
            {!playerSeen && (
              <button onClick={seeCards} style={{ width: "100%", padding: "12px", borderRadius: 12, border: "2px solid #7c3aed", background: "#ede9fe", color: "#4c1d95", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
                👁 See Cards (Play Seen)
              </button>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => placeBet(betAmount)} style={{ flex: 2, padding: "13px", borderRadius: 12, border: "none", background: "#16a34a", color: "white", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
                {playerSeen ? `Chaal (${betAmount})` : `Blind Chaal (${betAmount})`}
              </button>
              <button onClick={fold} style={{ flex: 1, padding: "13px", borderRadius: 12, border: "none", background: "#dc2626", color: "white", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
                Pack
              </button>
            </div>
            {playerSeen && (
              <button onClick={showdown} style={{ width: "100%", padding: "12px", borderRadius: 12, border: "2px solid #1e3a8a", background: "#eff6ff", color: "#1e3a8a", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
                Show 🃏
              </button>
            )}
          </>
        )}

        {aiThinking && (
          <div style={{ textAlign: "center", padding: "14px", color: "#6b7280", fontStyle: "italic" }}>AI is thinking...</div>
        )}

        {phase === "result" && (
          <button onClick={() => { setPhase("bet"); setPot(0); setPlayerCards([]); setAiCards([]); setResult(null); setMsg(""); }} style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #1e3a8a, #2563eb)", color: "white", fontWeight: 800, fontSize: 16, cursor: "pointer" }}>
            Play Again
          </button>
        )}
      </div>
    </div>
  );
}

// ===== ANDAR BAHAR =====
function AndarBahar({ walletPoints, setWalletPoints, onExit }) {
  const [phase, setPhase] = useState("bet");
  const [bet, setBet] = useState(0);
  const [side, setSide] = useState(null);
  const [joker, setJoker] = useState(null);
  const [andarCards, setAndarCards] = useState([]);
  const [baharCards, setBaharCards] = useState([]);
  const [result, setResult] = useState(null);
  const [dealing, setDealing] = useState(false);
  const deckRef = useRef([]);

  const startGame = (selectedSide) => {
    if (!bet || bet > walletPoints) return;
    setSide(selectedSide);
    setWalletPoints(w => w - bet);
    const deck = shuffle(createDeck());
    deckRef.current = deck;
    const jokerCard = deck.shift();
    setJoker(jokerCard);
    setAndarCards([]); setBaharCards([]);
    setResult(null);
    setPhase("dealing");
    setDealing(true);
    dealCards(deck, jokerCard, selectedSide);
  };

  const dealCards = (deck, jokerCard, selectedSide) => {
    const andar = [], bahar = [];
    let found = false, winner = null, idx = 0;
    while (!found && idx < deck.length) {
      const card = deck[idx++];
      if (andar.length <= bahar.length) {
        andar.push(card);
        if (card.rank === jokerCard.rank) { found = true; winner = "andar"; }
      } else {
        bahar.push(card);
        if (card.rank === jokerCard.rank) { found = true; winner = "bahar"; }
      }
    }
    // Animate dealing
    let i = 0;
    const total = andar.length + bahar.length;
    const interval = setInterval(() => {
      if (i < andar.length) setAndarCards(andar.slice(0, i + 1));
      if (i < bahar.length) setBaharCards(bahar.slice(0, i + 1));
      i++;
      if (i >= Math.max(andar.length, bahar.length)) {
        clearInterval(interval);
        setDealing(false);
        const won = winner === selectedSide;
        if (won) setWalletPoints(w => w + bet * 2);
        setResult({ winner, won, msg: won ? `${winner.toUpperCase()} wins! You won ${bet * 2} coins!` : `${winner.toUpperCase()} wins! Better luck next time.` });
        setPhase("result");
      }
    }, 200);
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 14px 80px" }}>
      <div style={{ textAlign: "center", padding: "16px 0 10px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#b45309", letterSpacing: 2 }}>CARD GAME</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#1e3a8a" }}>Andar Bahar</div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "10px 14px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#166534" }}>YOUR COINS</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#166534" }}>{walletPoints}</div>
        </div>
        <div style={{ flex: 1, background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 12, padding: "10px 14px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#92400e" }}>YOUR BET</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#92400e" }}>{bet || "—"}</div>
        </div>
      </div>

      {/* Joker Card */}
      {joker && (
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>JOKER CARD</div>
          <Card card={joker} />
          <div style={{ fontSize: 12, color: "#374151", marginTop: 6 }}>Find {joker.rank} in Andar or Bahar</div>
        </div>
      )}

      {/* Andar & Bahar columns */}
      {(andarCards.length > 0 || baharCards.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <div style={{ background: side === "andar" ? "#eff6ff" : "#f9fafb", border: `2px solid ${side === "andar" ? "#2563eb" : "#e5e7eb"}`, borderRadius: 14, padding: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#1e3a8a", marginBottom: 8, textAlign: "center" }}>ANDAR {side === "andar" ? "🎯" : ""}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>
              {andarCards.map((c, i) => <Card key={i} card={c} small animate />)}
            </div>
          </div>
          <div style={{ background: side === "bahar" ? "#fef3c7" : "#f9fafb", border: `2px solid ${side === "bahar" ? "#f59e0b" : "#e5e7eb"}`, borderRadius: 14, padding: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#92400e", marginBottom: 8, textAlign: "center" }}>BAHAR {side === "bahar" ? "🎯" : ""}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>
              {baharCards.map((c, i) => <Card key={i} card={c} small animate />)}
            </div>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={{ background: result.won ? "#d1fae5" : "#fee2e2", border: `1px solid ${result.won ? "#6ee7b7" : "#fca5a5"}`, borderRadius: 14, padding: "16px", marginBottom: 12, textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>{result.won ? "🏆" : "😔"}</div>
          <div style={{ fontWeight: 800, fontSize: 16, color: result.won ? "#065f46" : "#991b1b" }}>{result.msg}</div>
        </div>
      )}

      {/* Actions */}
      {phase === "bet" && (
        <>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 6 }}>Select Bet Amount</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[10, 25, 50, 100, 200].map(a => (
                <button key={a} onClick={() => setBet(a)} style={{ flex: 1, padding: "9px", borderRadius: 10, border: `2px solid ${bet === a ? "#1e3a8a" : "#e5e7eb"}`, background: bet === a ? "#eff6ff" : "white", color: bet === a ? "#1e3a8a" : "#374151", fontWeight: 700, cursor: "pointer" }}>{a}</button>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button onClick={() => startGame("andar")} disabled={!bet} style={{ padding: "16px", borderRadius: 12, border: "2px solid #2563eb", background: "#eff6ff", color: "#1e3a8a", fontWeight: 800, fontSize: 16, cursor: bet ? "pointer" : "not-allowed", opacity: bet ? 1 : 0.5 }}>
              🏠 Andar
            </button>
            <button onClick={() => startGame("bahar")} disabled={!bet} style={{ padding: "16px", borderRadius: 12, border: "2px solid #f59e0b", background: "#fef3c7", color: "#92400e", fontWeight: 800, fontSize: 16, cursor: bet ? "pointer" : "not-allowed", opacity: bet ? 1 : 0.5 }}>
              🌿 Bahar
            </button>
          </div>
        </>
      )}

      {dealing && <div style={{ textAlign: "center", padding: "16px", color: "#6b7280" }}>🃏 Dealing cards...</div>}

      {phase === "result" && (
        <button onClick={() => { setPhase("bet"); setJoker(null); setAndarCards([]); setBaharCards([]); setResult(null); setSide(null); setBet(0); }} style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #1e3a8a, #2563eb)", color: "white", fontWeight: 800, fontSize: 16, cursor: "pointer" }}>
          Play Again
        </button>
      )}
    </div>
  );
}

// ===== RUMMY =====
function Rummy({ walletPoints, setWalletPoints, onExit }) {
  const [phase, setPhase] = useState("bet");
  const [bet, setBet] = useState(0);
  const [playerHand, setPlayerHand] = useState([]);
  const [aiHand, setAiHand] = useState([]);
  const [drawPile, setDrawPile] = useState([]);
  const [discardPile, setDiscardPile] = useState([]);
  const [selected, setSelected] = useState([]);
  const [turn, setTurn] = useState("player");
  const [result, setResult] = useState(null);
  const [msg, setMsg] = useState("");
  const [drawn, setDrawn] = useState(false);

  const startGame = () => {
    if (!bet || walletPoints < bet) return setMsg("Not enough coins!");
    setWalletPoints(w => w - bet);
    const deck = shuffle(createDeck());
    const ph = deck.slice(0, 7);
    const ah = deck.slice(7, 14);
    const discard = [deck[14]];
    const draw = deck.slice(15);
    setPlayerHand(ph); setAiHand(ah); setDrawPile(draw); setDiscardPile(discard);
    setSelected([]); setTurn("player"); setResult(null); setMsg(""); setDrawn(false);
    setPhase("play");
  };

  const drawCard = (fromDiscard = false) => {
    if (drawn) return setMsg("Already drew! Now discard a card.");
    if (fromDiscard) {
      const card = discardPile[discardPile.length - 1];
      setPlayerHand(h => [...h, card]);
      setDiscardPile(d => d.slice(0, -1));
    } else {
      const card = drawPile[0];
      setPlayerHand(h => [...h, card]);
      setDrawPile(d => d.slice(1));
    }
    setDrawn(true);
    setMsg("Good! Now discard a card from your hand.");
  };

  const discardCard = (idx) => {
    if (!drawn) return setMsg("Draw a card first!");
    const card = playerHand[idx];
    const newHand = playerHand.filter((_, i) => i !== idx);
    setPlayerHand(newHand);
    setDiscardPile(d => [...d, card]);
    setDrawn(false);
    setSelected([]);
    setMsg("");
    aiTurn(newHand);
  };

  const toggleSelect = (idx) => {
    if (!drawn) { setMsg("Draw a card first, then select to discard."); return; }
    discardCard(idx);
  };

  const checkRummy = (hand) => {
    // Simple rummy check: look for sets (same rank) or runs (same suit, consecutive)
    const byRank = {};
    const bySuit = {};
    hand.forEach(c => {
      byRank[c.rank] = (byRank[c.rank] || []).concat(c);
      bySuit[c.suit] = (bySuit[c.suit] || []).concat(c);
    });
    let score = 0;
    Object.values(byRank).forEach(g => { if (g.length >= 3) score += g.length * 10; });
    Object.values(bySuit).forEach(g => {
      const sorted = g.sort((a, b) => a.val - b.val);
      let run = 1;
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].val - sorted[i-1].val === 1) { run++; if (run >= 3) score += run * 10; }
        else run = 1;
      }
    });
    return score;
  };

  const aiTurn = (currentPlayerHand) => {
    setTimeout(() => {
      // AI draws
      const newDraw = drawPile[0];
      if (!newDraw) { endGame(currentPlayerHand); return; }
      const newAiHand = [...aiHand, newDraw];
      const newDrawPile = drawPile.slice(1);
      // AI discards worst card (lowest unmatched)
      const toDiscard = newAiHand.reduce((worst, card, i) =>
        card.val < (worst ? newAiHand[worst].val : 999) ? i : worst, null);
      const aiDiscard = newAiHand[toDiscard];
      const finalAiHand = newAiHand.filter((_, i) => i !== toDiscard);
      setAiHand(finalAiHand);
      setDiscardPile(d => [...d, aiDiscard]);
      setDrawPile(newDrawPile);

      // Check if AI won
      const aiScore = checkRummy(finalAiHand);
      if (aiScore >= 60 || newDrawPile.length < 2) {
        endGame(currentPlayerHand, finalAiHand);
      } else {
        setTurn("player");
        setMsg("Your turn! Draw a card.");
      }
    }, 1000);
  };

  const endGame = (ph = playerHand, ah = aiHand) => {
    const playerScore = checkRummy(ph);
    const aiScore = checkRummy(ah);
    if (playerScore >= aiScore) {
      setWalletPoints(w => w + bet * 2);
      setResult({ winner: "player", msg: `You win! Your score: ${playerScore} vs AI: ${aiScore}. +${bet * 2} coins!` });
    } else {
      setResult({ winner: "ai", msg: `AI wins! AI score: ${aiScore} vs yours: ${playerScore}.` });
    }
    setPhase("result");
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 14px 80px" }}>
      <div style={{ textAlign: "center", padding: "16px 0 10px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#b45309", letterSpacing: 2 }}>CARD GAME</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#1e3a8a" }}>Rummy</div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "10px 14px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#166534" }}>YOUR COINS</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#166534" }}>{walletPoints}</div>
        </div>
        <div style={{ flex: 1, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12, padding: "10px 14px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#1e40af" }}>POT</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#1e40af" }}>{bet * 2 || "—"}</div>
        </div>
      </div>

      {msg && <div style={{ background: "#fef3c7", borderRadius: 10, padding: "8px 14px", fontSize: 13, color: "#92400e", marginBottom: 10, textAlign: "center" }}>{msg}</div>}

      {phase === "play" && (
        <>
          {/* AI hand */}
          <div style={{ background: "#1e3a8a", borderRadius: 14, padding: "12px", marginBottom: 10, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>AI Hand ({aiHand.length} cards)</div>
            <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
              {aiHand.map((_, i) => <Card key={i} faceDown small />)}
            </div>
          </div>

          {/* Piles */}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 10 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 4 }}>DRAW PILE ({drawPile.length})</div>
              <div onClick={() => drawCard(false)} style={{ cursor: turn === "player" && !drawn ? "pointer" : "default", opacity: turn === "player" && !drawn ? 1 : 0.5 }}>
                <Card faceDown />
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 4 }}>DISCARD</div>
              {discardPile.length > 0 && (
                <div onClick={() => drawCard(true)} style={{ cursor: turn === "player" && !drawn ? "pointer" : "default", opacity: turn === "player" && !drawn ? 1 : 0.5 }}>
                  <Card card={discardPile[discardPile.length - 1]} />
                </div>
              )}
            </div>
          </div>

          {/* Player hand */}
          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 14, padding: "12px", marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8, textAlign: "center" }}>Your Hand — {drawn ? "Tap a card to discard" : "Draw a card first"}</div>
            <div style={{ display: "flex", gap: 5, justifyContent: "center", flexWrap: "wrap" }}>
              {playerHand.map((c, i) => (
                <div key={i} onClick={() => toggleSelect(i)} style={{ cursor: drawn ? "pointer" : "default", transform: selected.includes(i) ? "translateY(-8px)" : "none", transition: "transform 0.2s" }}>
                  <Card card={c} small />
                </div>
              ))}
            </div>
          </div>

          {turn === "ai" && <div style={{ textAlign: "center", color: "#6b7280", fontSize: 13, padding: 8 }}>🤔 AI is playing...</div>}

          <button onClick={() => endGame()} style={{ width: "100%", padding: "11px", borderRadius: 10, border: "2px solid #1e3a8a", background: "#eff6ff", color: "#1e3a8a", fontWeight: 700, cursor: "pointer" }}>
            Declare Rummy 🎯
          </button>
        </>
      )}

      {result && (
        <div style={{ background: result.winner === "player" ? "#d1fae5" : "#fee2e2", border: `1px solid ${result.winner === "player" ? "#6ee7b7" : "#fca5a5"}`, borderRadius: 14, padding: "16px", marginBottom: 12, textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>{result.winner === "player" ? "🏆" : "😔"}</div>
          <div style={{ fontWeight: 800, fontSize: 16, color: result.winner === "player" ? "#065f46" : "#991b1b" }}>{result.msg}</div>
        </div>
      )}

      {phase === "bet" && (
        <>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 6 }}>Select Bet Amount</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[10, 25, 50, 100].map(a => (
                <button key={a} onClick={() => setBet(a)} style={{ flex: 1, padding: "9px", borderRadius: 10, border: `2px solid ${bet === a ? "#1e3a8a" : "#e5e7eb"}`, background: bet === a ? "#eff6ff" : "white", fontWeight: 700, cursor: "pointer" }}>{a}</button>
              ))}
            </div>
          </div>
          <button onClick={startGame} disabled={!bet} style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #1e3a8a, #2563eb)", color: "white", fontWeight: 800, fontSize: 16, cursor: bet ? "pointer" : "not-allowed", opacity: bet ? 1 : 0.5 }}>
            Start Rummy ({bet} coins)
          </button>
        </>
      )}

      {phase === "result" && (
        <button onClick={() => { setPhase("bet"); setPlayerHand([]); setAiHand([]); setResult(null); setMsg(""); setBet(0); }} style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #1e3a8a, #2563eb)", color: "white", fontWeight: 800, fontSize: 16, cursor: "pointer" }}>
          Play Again
        </button>
      )}
    </div>
  );
}

// ===== CARD GAMES LOBBY =====
export function CardGamesLobby({ onSelectGame }) {
  const games = [
    { id: "teen-patti", name: "Teen Patti", icon: "🃏", desc: "Classic 3-card Indian poker. Blind or Seen — can you beat the AI?", color: "#1e3a8a", bg: "#eff6ff" },
    { id: "andar-bahar", name: "Andar Bahar", icon: "🎴", desc: "Simple & fast! Pick Andar or Bahar before the joker appears.", color: "#92400e", bg: "#fef3c7" },
    { id: "rummy", name: "Rummy", icon: "🎰", desc: "Form sets and sequences. Declare Rummy to win the pot!", color: "#065f46", bg: "#d1fae5" },
  ];
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 14px 80px" }}>
      <div style={{ textAlign: "center", padding: "20px 0 16px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#b45309", letterSpacing: 2 }}>CARD GAMES</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#1e3a8a" }}>Play & Win</div>
        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>vs AI · Coins from your wallet</div>
      </div>
      {games.map(g => (
        <div key={g.id} onClick={() => onSelectGame(g.id)}
          style={{ background: g.bg, border: `2px solid ${g.color}33`, borderRadius: 18, padding: "20px", marginBottom: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 16, transition: "transform 0.15s, box-shadow 0.15s", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 42, flexShrink: 0 }}>{g.icon}</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: g.color }}>{g.name}</div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 3 }}>{g.desc}</div>
          </div>
          <div style={{ marginLeft: "auto", fontSize: 20, color: g.color }}>→</div>
        </div>
      ))}
    </div>
  );
}

// ===== MAIN EXPORT =====
export default function CardGameScreen({ game, walletPoints, setWalletPoints, onExit }) {
  if (game === "teen-patti") return <TeenPatti walletPoints={walletPoints} setWalletPoints={setWalletPoints} onExit={onExit} />;
  if (game === "andar-bahar") return <AndarBahar walletPoints={walletPoints} setWalletPoints={setWalletPoints} onExit={onExit} />;
  if (game === "rummy") return <Rummy walletPoints={walletPoints} setWalletPoints={setWalletPoints} onExit={onExit} />;
  return <CardGamesLobby onSelectGame={onExit} />;
}
