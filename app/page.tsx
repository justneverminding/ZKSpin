import Image from "next/image";
import Link from "next/link";
import RoulettePreview from "../components/RoulettePreview";
import s from "./home.module.css";

export default function Home() {
  return <main className={s.home}>
    <header className={s.nav}><Link className={s.wordmark} href="/">ZKSPIN</Link><nav aria-label="Main navigation"><a href="#how">How it works</a><Link href="/play">Enter the game ↗</Link></nav></header>
    <section className={s.hero}>
      <Image src="/images/roulette-cinematic.png" alt="Silver roulette wheel with red and black pockets" fill preload sizes="100vw" className={s.heroImage} />
      <div className={s.heroCopy}><p className={s.eyebrow}>Zcash Testnet Block Roulette</p><h1>ZKSPIN</h1><p className={s.tagline}>A little suspense.<br />Every spin, a story.</p><p className={s.intro}>Pick your side. Watch the wheel. Discover the calculation behind the result.</p><Link className={s.primary} href="/play">Let&apos;s Play <span aria-hidden="true">↗</span></Link><p className={s.caption}>No wallet needed. No real-money wagers.</p></div>
      <a href="#how" className={s.scroll}>The game, in three moves ↓</a><span className={s.heroNote}>38 POCKETS / ONE MOMENT</span>
    </section>
    <section className={s.section} id="how"><p className={s.eyebrow}>THE ESSENTIALS</p><h2>Simple to enter.<br />Hard to look away.</h2><div className={s.steps}>
      <article><span>01</span><h3>Make your call.</h3><p>Choose red, black, odd, or even. Set your wager using the simulated balance.</p></article>
      <article><span>02</span><h3>Let it spin.</h3><p>Lock in before the timer ends. Play a quick demo round or wait for a Zcash testnet block to determine the result.</p></article>
      <article><span>03</span><h3>See the whole story.</h3><p>Tap the result to explore its calculation. Revisit past rounds in Recent Spins.</p></article>
    </div></section>
    <section className={s.preview}><div><p className={s.eyebrow}>A TASTE OF THE TABLE</p><h2>The pause.<br />The spin.<br /><em>The reveal.</em></h2><p>Classic roulette rhythm, with a result you can look into.</p><Link className={s.textLink} href="/play">Take your place ↗</Link></div><RoulettePreview /></section>
    <section className={s.section}><p className={s.eyebrow}>CHOOSE YOUR PACE</p><h2>One wheel. Two ways in.</h2><div className={s.modes}>
      <article><span>01 / DEMO</span><h3>Straight to the spin.</h3><p>A local random draw selects the pocket. A quick way to find your rhythm and get familiar with the table.</p><small>Local random result · No block wait</small></article>
      <article><span>02 / TESTNET</span><h3>Let the block decide.</h3><p>A Zcash testnet block hash drives the result. Open the calculation to see the hash, the accepted byte, and the final pocket.</p><small>Block-derived result · One source confirmation</small></article>
    </div></section>
    <section className={s.faq}><h2>Before the first spin.</h2><div>
      <details><summary>Am I playing with real ZEC?</summary><p>No. The balance labelled ZEC is simulated game credit. There are no deposits, withdrawals, or real-money payouts.</p></details>
      <details><summary>What happens on 0 or 00?</summary><p>Both are green pockets. Red, black, odd, and even bets lose on either zero. Winning bets pay 1:1: the return is twice the wager, including your original stake.</p></details>
      <details><summary>Can I check a result?</summary><p>Tap a result number in the game or Recent Spins. Testnet rounds show how the block hash maps to a pocket. New demo rounds show the saved random draw; older demo rounds may not include it.</p></details>
      <details><summary>Why does testnet sometimes take longer?</summary><p>The game waits for its target block and a source-reported confirmation. Block production and the CipherScan data source can take time. Demo mode uses a local draw.</p></details>
    </div></section>
    <section className={s.closing}><p className={s.eyebrow}>YOUR NEXT MOVE</p><h2>The wheel is waiting.</h2><Link className={s.primary} href="/play">Let&apos;s Play <span aria-hidden="true">↗</span></Link></section>
    <footer className={s.footer}><Link className={s.wordmark} href="/">ZKSPIN</Link><p>Zcash Testnet Block Roulette</p><span>An experimental game. Simulated credits only.</span></footer>
  </main>;
}
