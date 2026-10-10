import { useParams } from "react-router-dom"
import Seo, { SITE_URL } from "@/marketing/components/Seo"
import { Action, Gap, Label, Measure, MediaFrame, Placeholder, Section } from "@/marketing/components/primitives"
import NotFound from "./NotFound"
import { KIND_LABELS, spineFor, useWorkRecord } from "@/marketing/data/work"
import { cn } from "@/lib/utils"

/**
 * /work/:slug — one record in full.
 *
 * The one new public route this relaunch adds.
 *
 * Structured data: a work record is a CreativeWork, and a product I own and
 * run is closer to SoftwareApplication. The type is chosen from the record's
 * own kind rather than applied uniformly, because structured data is a
 * machine-readable claim and a wrong one is worse than none.
 */
export default function WorkDetail() {
  const { slug } = useParams()
  const { record, loading } = useWorkRecord(slug)

  if (loading && !record) {
    return (
      <Measure className="py-24">
        <p aria-live="polite" className="text-lede text-gk-ink-soft">
          Loading the record…
        </p>
      </Measure>
    )
  }

  if (!record) return <NotFound />

  const kind = KIND_LABELS[record.kind]
  const spine = spineFor(record)

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": record.kind === "product" ? "SoftwareApplication" : "CreativeWork",
    name: record.title,
    url: `${SITE_URL}/work/${record.slug}`,
    ...(record.summary ? { description: record.summary } : {}),
    ...(record.year ? { dateCreated: record.year } : {}),
    ...(record.kind === "product" ? { applicationCategory: "BusinessApplication" } : {}),
    creator: { "@id": `${SITE_URL}/#person` },
  }

  return (
    <>
      <Seo
        title={record.title}
        description={
          record.summary ??
          `${kind.name}: ${record.title}. A record of what was built and what it was for.`
        }
        path={`/work/${record.slug}`}
        type="article"
        image={record.cover ? `${SITE_URL}${record.cover.src}` : undefined}
        jsonLd={jsonLd}
      />

      <header className={cn("border-b border-gk-edge border-l-2", spine === "set" ? "border-l-gk-set" : "border-l-gk-come")}>
        <Measure className="pb-12 pt-12 sm:pb-16 sm:pt-20">
          <nav aria-label="Breadcrumb" className="mb-8">
            <ol className="flex items-center gap-2 font-data text-label uppercase text-gk-ink-mute">
              <li>
                <a href="/" className="hover:text-gk-ink">
                  Home
                </a>
              </li>
              <li aria-hidden>/</li>
              <li>
                <a href="/work" className="hover:text-gk-ink">
                  Work
                </a>
              </li>
              <li aria-hidden>/</li>
              <li aria-current="page" className="text-gk-ink">
                {record.title}
              </li>
            </ol>
          </nav>

          <Label>{kind.name}</Label>
          <h1 className="mt-5 max-w-4xl font-display text-t2 font-normal text-gk-ink lg:text-t1">
            {record.title}
            {record.clientName && <span className="text-gk-ink-mute"> for {record.clientName}</span>}
          </h1>
          {record.summary && <p className="mt-6 max-w-2xl text-lede text-gk-ink-soft">{record.summary}</p>}

          <dl className="mt-10 grid max-w-2xl grid-cols-2 gap-x-8 border-t border-gk-rule pt-4 font-data text-label sm:grid-cols-3">
            {[
              ["Kind", kind.name],
              ["Sector", record.sector],
              ["Year", record.year],
            ].map(([label, value]) => (
              <div key={label} className="py-2">
                <dt className="uppercase text-gk-ink-mute">{label}</dt>
                <dd className={cn("mt-1", value ? "text-gk-ink" : "text-gk-come")}>
                  {value ?? "to supply"}
                </dd>
              </div>
            ))}
          </dl>

          {(record.liveUrl || record.repoUrl) && (
            <div className="mt-8 flex flex-wrap gap-4">
              {record.liveUrl && (
                <Action href={record.liveUrl} variant="strong">
                  Visit the site
                </Action>
              )}
              {record.repoUrl && <Action href={record.repoUrl}>Source</Action>}
            </div>
          )}
        </Measure>
      </header>

      <Section>
        <div className="grid gap-12 lg:grid-cols-[1fr_22rem] lg:gap-16">
          <div className="min-w-0 max-w-2xl">
            {kind.rows.map((label, i) => (
              <section key={label} className="border-t border-gk-edge py-8 first:border-t-0 first:pt-0">
                <h2 className="font-data text-label uppercase text-gk-ink-mute">{label}</h2>
                <p className="mt-4 text-lede text-gk-ink">
                  {record.rows[i] ?? <Gap>to supply</Gap>}
                </p>
              </section>
            ))}

            {record.awaiting && (
              <p className="border-t border-gk-edge pt-8 text-body text-gk-come">
                <span className="font-data text-label uppercase">Awaiting · </span>
                {record.awaiting}
              </p>
            )}
          </div>

          <div className="lg:pt-1">
            {record.cover ? (
              <figure>
                <MediaFrame>
                  <img src={record.cover.src} alt={record.cover.alt} loading="lazy" />
                </MediaFrame>
                {record.cover.caption && (
                  <figcaption className="mt-2 font-data text-label text-gk-ink-mute">
                    {record.cover.caption}
                  </figcaption>
                )}
              </figure>
            ) : (
              <Placeholder
                ratio="16 / 10"
                label="Screenshot, to supply"
                detail="A real capture of the work. No generated wireframe stands in for it."
              />
            )}
          </div>
        </div>

        {record.images.length > 0 && (
          <div className="mt-16 border-t border-gk-edge pt-10">
            <h2 className="font-display text-t3 text-gk-ink">More from this project</h2>
            <ul className="mt-8 grid gap-8 sm:grid-cols-2">
              {record.images.map((img) => (
                <li key={img.src}>
                  <figure>
                    <MediaFrame>
                      <img src={img.src} alt={img.alt} loading="lazy" />
                    </MediaFrame>
                    {img.caption && (
                      <figcaption className="mt-2 font-data text-label text-gk-ink-mute">
                        {img.caption}
                      </figcaption>
                    )}
                  </figure>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      <section className="pb-16 md:pb-24">
        <Measure>
          <div className="grid gap-8 rounded-media bg-gk-sunk px-6 py-12 sm:px-12 sm:py-16 md:grid-cols-[1fr_auto] md:items-end">
            <h2 className="max-w-2xl font-display text-t2 text-gk-ink">
              Something like this, for you?
            </h2>
            <Action to="/contact" variant="strong">
              Start a project
            </Action>
          </div>
        </Measure>
      </section>
    </>
  )
}
