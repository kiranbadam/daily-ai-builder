"use client";

import { useEffect, useRef, useState } from "react";
import {
  brand,
  stats,
  pipeline,
  features,
  setupSteps,
  reliability,
  faqs,
  terminalDemo,
} from "../src/content/brochure-content";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TerminalLineType = "command" | "blank" | "output" | "success";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map a terminalDemo line type to the appropriate CSS class suffix. */
function terminalLineClass(type: TerminalLineType): string {
  switch (type) {
    case "command":
      return "terminal-command";
    case "output":
      return "terminal-output";
    case "success":
      return "terminal-success";
    case "blank":
    default:
      return "";
  }
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function Home() {
  // Terminal typewriter animation state
  const [visibleLines, setVisibleLines] = useState(0);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Intersection Observer — reveal-on-scroll for `.reveal` elements
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1 },
    );

    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  // Terminal typewriter — progressively reveal lines with their configured delays
  useEffect(() => {
    let totalDelay = 1000; // initial pause before first line
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    terminalDemo.forEach((line, i) => {
      totalDelay += line.delay;
      timeouts.push(setTimeout(() => setVisibleLines(i + 1), totalDelay));
    });

    return () => timeouts.forEach(clearTimeout);
  }, []);

  return (
    <>
      {/* ----------------------------------------------------------------- */}
      {/* 1. Navigation                                                     */}
      {/* ----------------------------------------------------------------- */}
      <nav className="nav">
        <div className="container nav-inner">
          <a href="#" className="nav-logo">
            <img src="/logo.svg" alt="RoboDevLoop" width={28} height={28} />
            RoboDevLoop
          </a>
          <div className="nav-links">
            <a href="#how-it-works">How It Works</a>
            <a href="#features">Features</a>
            <a href="#get-started">Get Started</a>
            <a href={brand.ctaGithub.href} className="nav-cta">
              {brand.ctaGithub.label}
            </a>
          </div>
        </div>
      </nav>

      {/* ----------------------------------------------------------------- */}
      {/* 2. Hero                                                           */}
      {/* ----------------------------------------------------------------- */}
      <section className="hero section">
        <div className="container">
          <p className="eyebrow">{brand.eyebrow}</p>
          <h1>{brand.tagline}</h1>
          <p className="hero-subtitle">{brand.subhead}</p>

          {/* Animated Terminal */}
          <div className="hero-terminal terminal" ref={terminalRef}>
            <div className="terminal-header">
              <span className="terminal-dot" style={{ background: "#ff5f57" }} />
              <span className="terminal-dot" style={{ background: "#febc2e" }} />
              <span className="terminal-dot" style={{ background: "#28c840" }} />
            </div>
            <div className="terminal-body">
              {terminalDemo.map((line, i) => (
                <div
                  key={i}
                  className={`terminal-line ${terminalLineClass(line.type as TerminalLineType)} ${i < visibleLines ? "visible" : ""}`}
                >
                  {line.type === "blank" ? "\u00A0" : line.text}
                  {i === visibleLines - 1 && line.type === "command" && (
                    <span className="terminal-cursor" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="hero-ctas">
            <a href={brand.ctaPrimary.href} className="btn btn-primary">
              {brand.ctaPrimary.label}
            </a>
            <a href={brand.ctaSecondary.href} className="btn btn-outline">
              {brand.ctaSecondary.label}
            </a>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 3. Stats Bar                                                      */}
      {/* ----------------------------------------------------------------- */}
      <section className="section">
        <div className="container">
          <div className="stats-bar reveal">
            {stats.map((stat, i) => (
              <div key={i} className="stat-card">
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
                <div className="stat-desc">{stat.description}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 4. How It Works — The Pipeline                                    */}
      {/* ----------------------------------------------------------------- */}
      <section id="how-it-works" className="section">
        <div className="container">
          <div className="section-header reveal">
            <p className="eyebrow">The Loop</p>
            <h2>The Autonomous Dev Loop</h2>
          </div>
          <div className="pipeline-grid">
            {pipeline.map((phase, i) => (
              <div key={i} className="pipeline-card reveal">
                <div className="pipeline-phase">PHASE {phase.phase}</div>
                <div className="pipeline-icon">{phase.icon}</div>
                <h3>{phase.title}</h3>
                <p>{phase.summary}</p>
              </div>
            ))}
          </div>
          <div className="pipeline-loop-back reveal">
            &#8617; Ship feeds back into Ideate &mdash; the loop never stops
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 5. One Line, That's It                                            */}
      {/* ----------------------------------------------------------------- */}
      <section className="one-line section">
        <div className="container">
          <div className="section-header reveal">
            <h2>One command. That&apos;s literally it.</h2>
          </div>
          <div className="one-line-terminal terminal reveal">
            <div className="terminal-header">
              <span className="terminal-dot" style={{ background: "#ff5f57" }} />
              <span className="terminal-dot" style={{ background: "#febc2e" }} />
              <span className="terminal-dot" style={{ background: "#28c840" }} />
            </div>
            <div className="terminal-body">
              <div className="terminal-line terminal-command visible">
                $ npx robodevloop
              </div>
            </div>
          </div>
          <p className="reveal">
            RoboDevLoop handles the rest &mdash; config, deploy, auth, scheduling.
            <br />
            Wake up to shipped features.
          </p>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 6. Features Grid                                                  */}
      {/* ----------------------------------------------------------------- */}
      <section id="features" className="section">
        <div className="container">
          <div className="section-header reveal">
            <p className="eyebrow">Capabilities</p>
            <h2>Everything you need, nothing you don&apos;t</h2>
          </div>
          <div className="features-grid">
            {features.map((feat, i) => (
              <div key={i} className="feature-card reveal">
                <div className="feature-icon">{feat.icon}</div>
                <h3>{feat.title}</h3>
                <p>{feat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 7. Trust & Reliability                                            */}
      {/* ----------------------------------------------------------------- */}
      <section className="section trust">
        <div className="container">
          <div className="section-header reveal">
            <p className="eyebrow">Reliability</p>
            <h2>Built to run unattended</h2>
          </div>
          <div className="trust-grid">
            {reliability.map((item, i) => (
              <div key={i} className="trust-card reveal">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 8. Get Started                                                    */}
      {/* ----------------------------------------------------------------- */}
      <section id="get-started" className="section get-started">
        <div className="container">
          <div className="section-header reveal">
            <p className="eyebrow">Setup</p>
            <h2>Get started in 60 seconds</h2>
          </div>
          <div className="steps">
            {setupSteps.map((step, i) => (
              <div key={i} className="step reveal">
                <div className="step-number">{step.step}</div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
                {step.command && (
                  <div className="step-terminal terminal">
                    <div className="terminal-header">
                      <span
                        className="terminal-dot"
                        style={{ background: "#ff5f57" }}
                      />
                      <span
                        className="terminal-dot"
                        style={{ background: "#febc2e" }}
                      />
                      <span
                        className="terminal-dot"
                        style={{ background: "#28c840" }}
                      />
                    </div>
                    <div className="terminal-body">
                      <div className="terminal-line terminal-command visible">
                        $ {step.command}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 9. FAQ                                                            */}
      {/* ----------------------------------------------------------------- */}
      <section className="section">
        <div className="container">
          <div className="section-header reveal">
            <h2>FAQ</h2>
          </div>
          <div className="faq-list">
            {faqs.map((faq, i) => (
              <div key={i} className="faq-item reveal">
                <div className="faq-q">{faq.q}</div>
                <div className="faq-a">{faq.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 10. Final CTA                                                     */}
      {/* ----------------------------------------------------------------- */}
      <section className="section final-cta">
        <div className="container reveal">
          <h2>Your repos are waiting.</h2>
          <p>Engage the loop. Ship while you sleep.</p>
          <div className="hero-ctas">
            <a href={brand.ctaPrimary.href} className="btn btn-primary">
              {brand.ctaPrimary.label}
            </a>
            <a href={brand.ctaGithub.href} className="btn btn-outline">
              {brand.ctaGithub.label}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
