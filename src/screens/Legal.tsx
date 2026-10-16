import { Link, useNavigate } from 'react-router-dom';
import { PHOTO, Screen } from '@/design/Screen';
import { copy } from '@/i18n';

/**
 * The privacy policy and the terms (owner, 16 Oct 2026), at /privacidad and
 * /terminos: Google's consent screen links to them, so they are readable by
 * anybody, signed in or not.
 */
export function Legal({ doc }: { doc: 'privacy' | 'terms' }) {
  const t = copy.legal;
  const page = t[doc];
  const navigate = useNavigate();
  const other =
    doc === 'privacy'
      ? { to: '/terminos', label: t.otherTerms }
      : { to: '/privacidad', label: t.otherPrivacy };

  return (
    <Screen backdrop="nebulosa" scrim="heavy" opacity={PHOTO.content40}>
      <article className="flex min-h-dvh flex-col overflow-y-auto px-6 pt-[var(--top-inset)] pb-[var(--bottom-inset)] sm:min-h-0">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
          className="mb-6 self-start text-[length:var(--fs-body-13)] text-crema/70 hover:text-crema"
        >
          ← {t.back}
        </button>
        <p className="eyebrow mb-3">{page.kicker}</p>
        <h1 className="mb-2 text-[length:var(--fs-title-30)] leading-[var(--lh-heading-1_15)] text-blanco">
          {page.title}
        </h1>
        <p className="mb-6 text-[length:var(--fs-body-11_5)] text-crema/60">{t.updated}</p>
        <p className="mb-6 text-[length:var(--fs-body-14)] leading-relaxed text-crema/85">
          {page.intro}
        </p>

        {page.sections.map((section) => (
          <section key={section.heading} className="mb-6">
            <h2 className="mb-2 text-[length:var(--fs-heading-15)] text-blanco">
              {section.heading}
            </h2>
            {section.body.map((paragraph) => (
              <p
                key={paragraph}
                className="mb-2.5 text-[length:var(--fs-body-14)] leading-relaxed text-crema/80"
              >
                {paragraph}
              </p>
            ))}
          </section>
        ))}

        {t.contact && (
          <p className="mb-6 text-[length:var(--fs-body-14)] leading-relaxed text-crema/80">
            {t.contactLead}
            <a href={`mailto:${t.contact}`} className="text-crema underline">
              {t.contact}
            </a>
            .
          </p>
        )}
        <Link
          to={other.to}
          className="mb-8 text-[length:var(--fs-body-13)] text-crema/70 underline"
        >
          {other.label}
        </Link>
      </article>
    </Screen>
  );
}
