import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, CircleDot, Fingerprint, Layers3, MoveUpRight, Network, ScanLine, ShieldCheck, Sparkles, Timer } from "lucide-react";
import RoulettePreview from "../components/RoulettePreview";
import HomeMotion from "../components/HomeMotion";
import s from "./home.module.css";

const play = <><span>Play ZK Spin</span><ArrowUpRight size={18} aria-hidden="true" /></>;

export default function Home() {
  return (
    <main className={s.home}>
      <HomeMotion />
      <a className={s.skip} href="#about">Skip to introduction</a>
      <header className={s.nav}>
        <Link className={s.wordmark} href="/" aria-label="ZK Spin home">ZKSPIN</Link>
        <nav aria-label="Main navigation"><a href="#how">How it works</a><a href="#modes">Demo &amp; Testnet</a></nav>
        <Link className={s.navPlay} href="/play">Play <ArrowRight size={16} /></Link>
      </header>

      <section className={s.hero} aria-labelledby="hero-title">
        <Image src="/images/roulette-hero.webp" alt="Close-up of a silver roulette wheel and white ball" fill preload sizes="100vw" className={s.heroImage} />
        <div className={s.heroCopy}>
          <p className={s.eyebrow}>ZCASH TESTNET BLOCK ROULETTE</p>
          <h1 id="hero-title">ZKSPIN</h1>
          <p className={s.tagline}>The thrill of chance.<br />The clarity of math.</p>
          <div className={s.actions}><Link className={s.primary} href="/play">Let&apos;s play <ArrowRight size={22} /></Link></div>
          <p className={s.caption}>No wallet. No deposits. Just simulated credits.</p>
        </div>
        <div className={s.heroBottom}><a href="#about"><ArrowDown size={16} /> Explore ZK Spin</a><span>CHANCE / MEETS / CLARITY</span></div>
      </section>

      <section className={s.overview} aria-label="Game overview">
        <div><p className={s.eyebrow}>HOW IT WORKS</p><h2>Simple. Transparent.</h2></div>
        <article><span>01</span><h3>Place your bet</h3><p>Choose your prediction and amount.</p></article>
        <article><span>02</span><h3>Watch the spin</h3><p>Try Demo or a Zcash testnet block.</p></article>
        <article><span>03</span><h3>Check the result</h3><p>Explore the calculation yourself.</p></article>
      </section>

      <section className={s.section} id="about" data-home-reveal>
        <div className={s.splitHeading}><div><p className={s.eyebrow}>01 / THE IDEA</p><h2>Roulette.<br /><span>Made different.</span></h2></div><p className={s.lead}>The familiar suspense of a spinning wheel, with room to understand what happens behind it. Simple choices. Considered design. A result you can explore.</p></div>
        <div className={s.pillars}>
          <article><CircleDot /><h3>Easy to find your rhythm.</h3><p>Red or black. Odd or even. Four simple choices, one place to start.</p></article>
          <article><ScanLine /><h3>The result has a story.</h3><p>Open a completed round and follow the calculation all the way to its pocket.</p></article>
          <article><Fingerprint /><h3>No account required.</h3><p>No wallet connection or personal profile. Your game history stays in this browser.</p></article>
        </div>
      </section>

      <section className={s.section} id="modes" data-home-reveal>
        <div className={s.sectionHeading}><p className={s.eyebrow}>02 / FIND YOUR ENTRY POINT</p><h2>Two ways in.<br /><span>Your kind of spin.</span></h2><p>Start with a little curiosity. Choose where it takes you.</p></div>
        <div className={s.modeGrid}>
          <article className={s.modeCard}>
            <div className={s.cardTop}><span>DEMO</span><span className={s.modeBadge}>A good first spin</span></div>
            <div className={s.modeArt} aria-hidden="true"><div className={s.demoDisc}><CircleDot size={90} strokeWidth={0.7} /><span>38</span></div><span className={s.artLabel}>LOCAL / RANDOM</span></div>
            <h3>Try it instantly.</h3><p>Meet the wheel, make a selection, and watch a local random draw unfold. No network wait.</p>
            <ul><li><Check size={15} /> Quick introduction to the game</li><li><Check size={15} /> Saved calculations for new rounds</li></ul>
            <Link href="/play" className={s.primary}>Play Demo <ArrowUpRight size={18} /></Link>
          </article>
          <article className={`${s.modeCard} ${s.networkCard}`}>
            <div className={s.cardTop}><span>TESTNET</span><span className={s.modeBadge}>Powered by block data</span></div>
            <div className={s.modeArt} aria-hidden="true"><div className={s.networkArt}><Network size={100} strokeWidth={0.8} /><span className={s.networkPulse} /></div><span className={s.artLabel}>BLOCK / HASH / RESULT</span></div>
            <h3>Let the block decide.</h3><p>See a Zcash testnet block hash become a roulette outcome, one transparent calculation at a time.</p>
            <ul><li><Check size={15} /> CipherScan-supplied testnet data</li><li><Check size={15} /> Inspect the hash-to-pocket math</li></ul>
            <Link href="/play" className={s.outlineButton}>Enter Testnet <ArrowUpRight size={18} /></Link>
          </article>
        </div>
        <p className={s.modeNote}>First time here? Start with Demo. Select your mode at the top of the game page.</p>
      </section>

      <section className={`${s.section} ${s.how}`} id="how" data-home-reveal>
        <p className={s.eyebrow}>03 / MAKE YOUR MOVE</p><h2>Three steps. One spin.</h2>
        <div className={s.steps}>
          <article><div className={s.stepNumber}>01 <ArrowRight size={18} /></div><h3>Choose.</h3><p>Enter the game. Pick Demo for a quick start or Testnet for a block-derived result.</p></article>
          <article><div className={s.stepNumber}>02 <ArrowRight size={18} /></div><h3>Play.</h3><p>Choose red, black, odd, or even. Set a simulated wager and lock it in before betting closes.</p></article>
          <article><div className={s.stepNumber}>03 <Check size={18} /></div><h3>Reveal.</h3><p>Watch the wheel settle. Tap your result or any previous round to see the details.</p></article>
        </div>
      </section>

      <section className={s.previewSection} id="preview" data-home-reveal>
        <div className={s.previewHeading}><p className={s.eyebrow}>04 / A LITTLE SUSPENSE</p><h2>Feel the spin.</h2><p>A small taste of the table. The full experience is one click away.</p></div>
        <RoulettePreview />
        <div className={s.previewFooter}><span>Want the full experience?</span><Link className={s.textLink} href="/play">{play}</Link></div>
      </section>

      <section className={s.section} id="technology" data-home-reveal>
        <div className={s.splitHeading}><div><p className={s.eyebrow}>05 / UNDER THE SURFACE</p><h2>Chance on the outside.<br /><span>Math underneath.</span></h2></div><p className={s.lead}>In Testnet, the wheel is the reveal. A deterministic calculation from a block hash decides the pocket before the animation begins.</p></div>
        <ol className={s.proofFlow}><li><Layers3 /><strong>Block hash</strong><span>From Zcash testnet</span></li><li><Fingerprint /><strong>SHA-256</strong><span>Hash the prefixed input</span></li><li><ScanLine /><strong>Accept a byte</strong><span>Skip values above 227</span></li><li><CircleDot /><strong>Find the pocket</strong><span>Divide by 6, round down</span></li></ol>
        <details className={s.technicalDetails}><summary>Explore the calculation <span>+</span></summary><div><p>The input is <code>zkspin:v1:</code> followed by the lowercase block hash, encoded as UTF-8. SHA-256 produces 32 bytes. The first byte between 0 and 227 is accepted.</p><p>Its value divided by 6, rounded down, gives an index into <code>[0, 00, 1, 2, …, 36]</code>. There are 228 accepted byte values: six for each of the 38 pockets.</p><p>The result panel recomputes this calculation from saved data. It does not independently validate the chain. Block data and confirmations come from CipherScan; this version does not generate zero-knowledge proofs.</p></div></details>
        <div className={s.trustLine}><ShieldCheck size={22} /><p>Clarity over claims.<span>Simulated balances. Inspectable math. No mainnet or real-money payouts.</span></p></div>
      </section>

      <section className={s.film}>
        <Image src="/images/roulette-hero.webp" alt="Close-up of the roulette ball on its polished metal track" fill sizes="100vw" className={s.filmImage} />
        <div><p className={s.eyebrow}>PRECISION MEETS POSSIBILITY</p><h2>Every spin<br />is a moment.</h2></div><span className={s.filmLabel}>ZK SPIN / A CLOSER LOOK</span>
      </section>

      <section className={`${s.section} ${s.why}`} data-home-reveal><div><p className={s.eyebrow}>THE DETAILS MAKE THE DIFFERENCE</p><h2>A little less friction.<br /><span>A lot more focus.</span></h2></div><div className={s.whyList}><article><Sparkles size={20} /><div><h3>Beautifully simple.</h3><p>A focused table, readable history, and the controls you need.</p></div></article><article><Timer size={20} /><div><h3>Your pace, your choice.</h3><p>Quick local rounds or the anticipation of a new testnet block.</p></div></article><article><ScanLine size={20} /><div><h3>More than a number.</h3><p>Every saved round opens into its wager, outcome, and available calculation.</p></div></article></div></section>

      <section className={`${s.section} ${s.faq}`} data-home-reveal><div><p className={s.eyebrow}>BEFORE YOU GO IN</p><h2>A few good questions.</h2></div><div>
        <details><summary>Not sure where to start?</summary><p>Choose Demo to learn the table without waiting for block data. Choose Testnet to explore block-derived outcomes. You can switch modes between rounds.</p><div className={s.actions}><Link href="/play" className={s.textLink}>Play Demo <ArrowUpRight size={16} /></Link><Link href="/play" className={s.textLink}>Enter Testnet <ArrowUpRight size={16} /></Link></div></details>
        <details><summary>Is the ZEC balance real money?</summary><p>No. ZEC on this page of the game represents simulated credit. There are no deposits, withdrawals, or spendable token payouts.</p></details>
        <details><summary>How do wins and zero pockets work?</summary><p>Red, black, odd, and even bets pay 1:1 when they win. Both 0 and 00 lose these bets. A win returns twice the wager including the original stake.</p></details>
        <details><summary>What can I verify?</summary><p>Testnet results show the saved block hash and each calculation step. New demo rounds include the original local random draw; older demo rounds may not. Demo draws are not blockchain-verifiable.</p></details>
        <details><summary>Why can Testnet take longer?</summary><p>It waits for the target block and one source-reported confirmation. Block production and data-source delays can affect the wait.</p></details>
      </div></section>

      <section className={s.closing} data-home-reveal><CircleDot className={s.closingIcon} size={38} strokeWidth={1} /><p className={s.eyebrow}>CURIOSITY BROUGHT YOU HERE</p><h2>The wheel is waiting.</h2><p>Choose your experience. Step into ZK Spin.</p><Link className={s.primary} href="/play">{play}</Link><div className={s.closingModes}><Link href="/play">Demo</Link><span>/</span><Link href="/play">Testnet</Link></div></section>
      <footer className={s.footer}><Link className={s.wordmark} href="/">ZKSPIN</Link><p>Zcash Testnet Block Roulette</p><span>Experimental game. Simulated credits only.</span><a href="#hero-title" aria-label="Back to top"><MoveUpRight size={18} /></a></footer>
    </main>
  );
}
