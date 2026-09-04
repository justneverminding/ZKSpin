import RouletteWheel from "../components/RouletteWheel";
export default function Home() {
  return (
    <main className="game">
      <header className="topbar">
        <div>
          <h1 className="brand">ZKSPIN</h1>
          <p className="subtitle">Zero Knowledge Roulette</p>
        </div>

        <div className="balance">
          <span>Balance</span>
          <strong>100 TEST ZEC</strong>
        </div>
      </header>

      <section className="roulette-section">
        <RouletteWheel />

        <p className="wheel-label">Waiting for spin</p>
      </section>

      <section className="bet-panel">
        <div className="bet-amount">
          <span>Bet amount</span>

          <div className="amount-control">
            <button>-</button>
            <strong>1 TEST ZEC</strong>
            <button>+</button>
          </div>
        </div>

        <div className="bet-options">
          <button>RED</button>
          <button>BLACK</button>
          <button>ODD</button>
          <button>EVEN</button>
        </div>

        <button className="spin-button">SPIN</button>
      </section>

      <section className="history">
        <h2>Recent Spins</h2>

        <div className="history-empty">
          No spins yet.
        </div>
      </section>
    </main>
  );
}
