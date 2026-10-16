import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Screen } from '@/design/Screen';
import { copy } from '@/i18n';
import { BED_TRACKS } from '@/lib/catalog';
import { deleteMeditation, listMeditations } from '@/store/meditations';

/**
 * The saved practices of PDR 9.6. Package 14, «Mis prácticas» (16 Oct 2026).
 *
 * PDR 5.7 pairs each meditation with a stored audio file, so deleting one
 * there means deleting two things. Here the audio is synthesised at play time
 * from the script and the bed descriptor, so a meditation is one row and
 * deleting it leaves nothing behind — which is worth saying out loud, because
 * "and its stored audio" is exactly the kind of clause that quietly stops
 * being true.
 */

const text = copy.library;

function bedName(id: string): string {
  return BED_TRACKS.find((track) => track.id === id)?.name ?? text.voiceOnly;
}

function dayOf(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(text.locale, {
    day: 'numeric',
    month: 'long',
  });
}

function ArrowGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
    </svg>
  );
}

export function Library() {
  const [meditations, setMeditations] = useState(() => listMeditations());
  const [confirming, setConfirming] = useState<string | null>(null);

  return (
    <Screen photo="maderaCafe" veil={0.3} glassAlpha={0.51}>
      <div className="pz meditaciones practicas">
        <div className="sc">
          <div className="cabeza">
            <p className="k">{text.kicker}</p>
            <h1 className="t mt">
              {text.titleLead}
              <em>{text.titleEmphasis}</em>
            </h1>
            {meditations.length === 0 && <p className="cuerpo">{text.empty}</p>}
            <div className="pie">
              <Link to="/meditaciones" className="btn p">
                {text.create}
                <ArrowGlyph />
              </Link>
            </div>
          </div>

          {meditations.length > 0 && (
            <div className="d-der">
              <div className="d-lista">
                {meditations.map((meditation) => (
                  <article key={meditation.id} className="vid tarj">
                    <div className="fila-t">
                      <h2 className="nm">{meditation.script.title}</h2>
                      <span className="min">{copy.meditation.minutes(meditation.estimated_minutes)}</span>
                    </div>
                    <p className="int">«{meditation.intent}»</p>
                    <p className="meta">
                      {dayOf(meditation.created_at)} · {bedName(meditation.script.bed_track_id)}
                    </p>

                    {confirming === meditation.id ? (
                      <>
                        <p className="conf">{text.deleteConfirm}</p>
                        <div className="acc2">
                          <button
                            type="button"
                            onClick={() => {
                              deleteMeditation(meditation.id);
                              setMeditations(listMeditations());
                              setConfirming(null);
                            }}
                            className="mini-b bo"
                          >
                            {text.delete}
                          </button>
                          <button type="button" onClick={() => setConfirming(null)} className="mini-b">
                            {text.keep}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="acc2">
                        <Link to={`/meditaciones?id=${meditation.id}`} className="mini-b on">
                          <PlayGlyph />
                          {text.listen}
                        </Link>
                        <button type="button" onClick={() => setConfirming(meditation.id)} className="mini-b">
                          {text.delete}
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Screen>
  );
}
