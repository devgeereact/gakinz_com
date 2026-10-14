import { Link } from "react-router-dom"
import Seo from "@/marketing/components/Seo"

/** The public 404 (D-044). Tells the visitor where to go next. */
export default function NotFound() {
  return (
    <>
      <Seo title="Page not found" description="That page is not here." path="/404" />
      <header className="phead wrap" style={{ minHeight: "70vh" }}>
        <p className="mono mute">404</p>
        <h1 className="h-xl" style={{ marginTop: 16 }}>
          That page is not here.
        </h1>
        <p className="lede" style={{ marginTop: 20 }}>
          It may have moved. The work and the contact page are both one click away.
        </p>
        <div className="hero__actions">
          <Link className="btn btn--main" to="/">
            Back to the start
          </Link>
          <Link className="btn" to="/work">
            See the work
          </Link>
        </div>
      </header>
    </>
  )
}
