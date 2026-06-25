'use client'

import { useEffect, useMemo, useRef } from 'react'
import styles from './landing.module.css'

const steps = [
  {
    number: '01',
    title: 'Name the mission',
    text: 'Forge starts by learning what you are trying to make real and what keeps stopping you.',
  },
  {
    number: '02',
    title: 'Lock the commitment',
    text: 'The coach turns the goal into one concrete action with a real date, time, and proof requirement.',
  },
  {
    number: '03',
    title: 'Follow up after the deadline',
    text: 'Forge asks what happened: kept, missed, or partial. No vague progress theater.',
  },
  {
    number: '04',
    title: 'Build from evidence',
    text: 'Proof becomes output history. Misses become coaching context. The next action gets sharper.',
  },
]

const features = [
  {
    title: 'Commitments with deadlines',
    text: 'Every promise needs a specific action, date, time, and reason it matters.',
  },
  {
    title: 'Proof-based progress',
    text: 'Links, files, screenshots, shipped pages, reflections, and visible artifacts become evidence.',
  },
  {
    title: 'Coach follow-ups',
    text: 'Forge returns after the deadline and asks the question most task apps avoid.',
  },
  {
    title: 'Pattern memory',
    text: 'Repeated misses, overplanning, avoidance, and wins become useful coaching context.',
  },
  {
    title: 'Mission dashboard',
    text: 'Your current goal, commitment, blocker, roadmap, and recent proof stay visible.',
  },
  {
    title: 'Evidence Vault',
    text: 'Completed work becomes a permanent record of what changed, not just another checked box.',
  },
]

const proofRows = [
  { label: 'Commitment', value: 'Send the first customer interview request' },
  { label: 'Deadline', value: 'Today, 6:00 PM' },
  { label: 'Proof', value: 'Screenshot or sent-message link' },
]

export default function LandingPageClient() {
  const pageRef = useRef<HTMLDivElement>(null)
  const links = useMemo(() => {
    const flaskBase = (process.env.NEXT_PUBLIC_FLASK_URL || 'http://localhost:8001').replace(/\/$/, '')
    return {
      login: `${flaskBase}/login`,
      register: `${flaskBase}/register`,
    }
  }, [])

  useEffect(() => {
    pageRef.current?.classList.add(styles.motionReady)
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))
    if (!nodes.length) return undefined

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.visible)
            observer.unobserve(entry.target)
          }
        })
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.18 },
    )

    nodes.forEach(node => observer.observe(node))
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={pageRef} className={styles.page}>
      <header className={styles.nav}>
        <a className={styles.brand} href="#top" aria-label="Forge home">
          <span className={styles.mark} aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </span>
          <span>Forge</span>
        </a>
        <nav className={styles.navLinks} aria-label="Landing navigation">
          <a href="#problem">Problem</a>
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
          <a href="#proof">Proof</a>
        </nav>
        <div className={styles.navActions}>
          <a className={styles.loginLink} href={links.login}>Log in</a>
          <a className={styles.navCta} href={links.register}>Start free</a>
        </div>
      </header>

      <main id="top">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <p className={styles.signal}>Personal execution coach</p>
              <h1 id="hero-title">Turn goals into action.</h1>
              <p className={styles.heroText}>
                Forge turns intentions into commitments, follows up after deadlines,
                asks for proof, and helps you build discipline through real progress.
              </p>
              <div className={styles.heroActions}>
                <a className={styles.primaryButton} href={links.register}>
                  Start building discipline
                </a>
                <a className={styles.secondaryButton} href="#how">
                  See how it works
                </a>
              </div>
            </div>

            <div className={styles.heroSystem} aria-label="Forge commitment preview">
              <div className={styles.systemHeader}>
                <div>
                  <span>Current mission</span>
                  <strong>Launch the first real offer</strong>
                </div>
                <p>Live</p>
              </div>

              <div className={styles.coachCard}>
                <span>Forge check-in</span>
                <p>You said you would send the first customer interview request by 6 PM. Did you do it?</p>
              </div>

              <div className={styles.proofPanel}>
                {proofRows.map(row => (
                  <div key={row.label}>
                    <span>{row.label}</span>
                    <strong>{row.value}</strong>
                  </div>
                ))}
              </div>

              <div className={styles.statusRail}>
                <div>
                  <span>Kept</span>
                  <strong>12</strong>
                </div>
                <div>
                  <span>Partial</span>
                  <strong>3</strong>
                </div>
                <div>
                  <span>Missed</span>
                  <strong>4</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="problem" className={styles.problem} data-reveal>
          <div className={styles.sectionHeader}>
            <p className={styles.signal}>The problem</p>
            <h2>Task apps collect intentions. They rarely create follow-through.</h2>
          </div>
          <div className={styles.problemGrid}>
            <article>
              <span>Planning feels productive</span>
              <p>Most tools let you add more tasks, reorganize lists, and feel busy without proving anything changed.</p>
            </article>
            <article>
              <span>Deadlines disappear quietly</span>
              <p>When you miss the thing you said mattered, regular task apps do not ask what happened or shrink the next move.</p>
            </article>
            <article>
              <span>Progress needs evidence</span>
              <p>Forge treats proof as the turning point: a shipped link, sent message, uploaded file, or honest reflection.</p>
            </article>
          </div>
        </section>

        <section id="how" className={styles.loop} data-reveal>
          <div className={styles.loopIntro}>
            <p className={styles.signal}>The accountability loop</p>
            <h2>Goal → Mission → Commitment → Deadline → Proof → Progress.</h2>
            <p>
              Forge is built around the full loop, not just the moment where you type a task and hope you remember it.
            </p>
          </div>
          <div className={styles.steps}>
            {steps.map(step => (
              <article key={step.number} className={styles.stepCard}>
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.solution} data-reveal>
          <div className={styles.solutionCopy}>
            <p className={styles.signal}>Product solution</p>
            <h2>A coach that remembers what you said you would do.</h2>
            <p>
              Forge connects conversation to product output. The coach learns your mission,
              creates commitments, stores proof, updates the dashboard, and uses your behavior
              history to coach the next move.
            </p>
          </div>
          <div className={styles.solutionBoard}>
            <div className={styles.boardColumn}>
              <span>Coach</span>
              <strong>What are you avoiding?</strong>
              <p>Short, direct, one question at a time.</p>
            </div>
            <div className={styles.boardColumn}>
              <span>Commitment</span>
              <strong>One action by Friday at 5 PM.</strong>
              <p>Specific enough to verify later.</p>
            </div>
            <div className={styles.boardColumn}>
              <span>Evidence</span>
              <strong>Proof submitted and logged.</strong>
              <p>The next plan starts from what happened.</p>
            </div>
          </div>
        </section>

        <section id="features" className={styles.features} data-reveal>
          <div className={styles.sectionHeader}>
            <p className={styles.signal}>What Forge tracks</p>
            <h2>Everything important after the promise.</h2>
          </div>
          <div className={styles.featureGrid}>
            {features.map((feature, index) => (
              <article
                key={feature.title}
                className={index === 0 || index === 5 ? styles.featureLarge : undefined}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="proof" className={styles.proof} data-reveal>
          <div className={styles.proofCopy}>
            <p className={styles.signal}>Beta proof slots</p>
            <h2>Built for people who need execution, not another place to hide plans.</h2>
            <p>
              Social proof will come from real beta users. Until then, the page should make the product promise clear:
              Forge is measured by commitments kept, proof submitted, and users returning to finish the next action.
            </p>
          </div>
          <div className={styles.metrics}>
            <div>
              <span>Day 2 return</span>
              <strong>Tracked in beta</strong>
            </div>
            <div>
              <span>Commitments kept</span>
              <strong>Proof required</strong>
            </div>
            <div>
              <span>Output history</span>
              <strong>Evidence Vault</strong>
            </div>
          </div>
        </section>

        <section className={styles.finalCta} data-reveal>
          <div>
            <p className={styles.signal}>Start with one commitment</p>
            <h2>Become the person who follows through.</h2>
            <p>
              Open Forge, name the mission, and lock the first action that will prove you are moving.
            </p>
          </div>
          <a className={styles.primaryButton} href={links.register}>
            Start building discipline
          </a>
        </section>
      </main>

      <footer className={styles.footer}>
        <span>Forge</span>
        <div>
          <a href={`${(process.env.NEXT_PUBLIC_FLASK_URL || 'http://localhost:8001').replace(/\/$/, '')}/privacy`}>Privacy</a>
          <a href={`${(process.env.NEXT_PUBLIC_FLASK_URL || 'http://localhost:8001').replace(/\/$/, '')}/terms`}>Terms</a>
          <a href={`${(process.env.NEXT_PUBLIC_FLASK_URL || 'http://localhost:8001').replace(/\/$/, '')}/contact`}>Contact</a>
        </div>
      </footer>
    </div>
  )
}
