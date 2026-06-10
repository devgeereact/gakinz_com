import './App.css'

function App() {
  return (
    <main className="coming-soon">
      <div className="glow" aria-hidden="true" />

      <header className="cs-brand">
        <span className="cs-mark">GAkinz</span>
        <span className="cs-badge">
          <span className="cs-dot" aria-hidden="true" />
          Launching 2026
        </span>
      </header>

      <section className="cs-center">
        <p className="cs-eyebrow">London web design &amp; development studio</p>
        <h1 className="cs-title">
          Something good is
          <br />
          taking root.
        </h1>
        <p className="cs-sub">
          We&apos;re building our new home — sites that look sharp, load fast,
          and earn their keep.
        </p>

        <form
          className="cs-form"
          onSubmit={(e) => {
            e.preventDefault()
            e.currentTarget.reset()
          }}
        >
          <div className="cs-field">
            <input
              type="email"
              name="email"
              placeholder="you@company.com"
              aria-label="Email address"
              required
            />
            <button type="submit">Notify me</button>
          </div>
          <p className="cs-note">No spam. One email when we go live.</p>
        </form>
      </section>

      <footer className="cs-foot">
        <span>© 2026 GAkinz</span>
        <a href="mailto:hello@gakinz.com" className="cs-link">
          hello@gakinz.com
        </a>
      </footer>
    </main>
  )
}

export default App
