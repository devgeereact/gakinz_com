import './App.css'

function App() {
  return (
    <main className="coming-soon">
      <div className="glow" aria-hidden="true" />

      <header className="cs-brand">
        <span className="cs-mark">GAkinz</span>
      </header>

      <section className="cs-center">
        <p className="cs-eyebrow">London web design &amp; development studio</p>
        <h1 className="cs-title">
          Something good is
          <br />
          taking root.
        </h1>
        <p className="cs-sub">
          We&apos;re building our new home. Sites that look sharp, load fast,
          and earn their keep — coming soon.
        </p>

        <form
          className="cs-form"
          onSubmit={(e) => {
            e.preventDefault()
            e.currentTarget.reset()
          }}
        >
          <input
            type="email"
            name="email"
            placeholder="you@company.com"
            aria-label="Email address"
            required
          />
          <button type="submit">Notify me</button>
        </form>
        <p className="cs-note">Start a project early — hello@gakinz.com</p>
      </section>

      <footer className="cs-foot">
        <span>© 2026 GAkinz</span>
        <span>Made in London</span>
      </footer>
    </main>
  )
}

export default App
