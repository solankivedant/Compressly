'use client';

import { Fragment } from 'react';
import Icon from '@/components/Icon';
import { ScreenHeader } from '@/components/Shell';

interface Format {
  name: string;
  tag: string;
  /** Short points; **words** between double stars are shown bold. */
  pros: string[];
  cons: string[];
}

const VIDEO: Format[] = [
  {
    name: 'HEVC (H.265)',
    tag: 'Smaller files',
    pros: [
      '**30–40% smaller** than H.264, same quality',
      'Plays on **iPhones, Macs and newer phones**',
      'Edits in **Premiere Pro, Final Cut, iMovie, DaVinci Resolve, CapCut, LumaFusion, Filmora, VN**',
    ],
    cons: [
      '**Old or low-end devices** may stutter or not play it',
      '**Slow or no editing** in basic apps and on low-end PCs',
      '**Windows** may need the HEVC Video Extension',
      '**Some apps re-convert it** on upload, losing the saving',
    ],
  },
  {
    name: 'H.264 (AVC)',
    tag: 'Plays everywhere',
    pros: ['**Plays and edits everywhere**, even on old devices', '**Light to edit**, quick to share'],
    cons: ['**Bigger files**, less space freed'],
  },
];

const PHOTO: Format[] = [
  {
    name: 'Optimised JPEG',
    tag: 'Opens everywhere',
    pros: ['**Opens everywhere**', '**Replaces the original** in place'],
    cons: ['**Saves less space** than HEIC'],
  },
  {
    name: 'HEIC',
    tag: 'Smaller files',
    pros: ['**About half the size** of JPEG', 'Native on **iPhone and newer Android**'],
    cons: [
      "**Old Windows, old Android and many websites** can't open it",
      '**Some editors, printers and print shops** reject it',
      '**New file**: delete the original JPEG yourself',
      'Web version makes **AVIF** and drops **date and place**',
    ],
  },
];

/** Renders "**bold** rest" with the starred words in bold. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split('**').map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : <Fragment key={i}>{part}</Fragment>))}
    </>
  );
}

function FormatCard({ f }: { f: Format }) {
  return (
    <section className="card stack">
      <div className="row-between">
        <strong style={{ fontSize: 20 }}>{f.name}</strong>
        <span className="chip primary">{f.tag}</span>
      </div>
      <div className="pc-grid">
        <div className="pc-box pc-pros">
          <span className="pc-head">
            <Icon name="check" size={18} /> Pros
          </span>
          <ul>
            {f.pros.map((t) => (
              <li key={t}>
                <Rich text={t} />
              </li>
            ))}
          </ul>
        </div>
        <div className="pc-box pc-cons">
          <span className="pc-head">
            <Icon name="close" size={18} /> Cons
          </span>
          <ul>
            {f.cons.map((t) => (
              <li key={t}>
                <Rich text={t} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/** Pros and cons of each output format, so people can choose in Settings knowing where the files will be used. */
export default function FormatGuide() {
  return (
    <>
      <ScreenHeader title="Format guide" subtitle="Which format should I pick?" back="/settings" />
      <div className="banner info guide-tip">
        <span>
          <Icon name="info" size={16} /> Files stay on a <strong>newer phone</strong> → pick the <strong>smaller format</strong>.
        </span>
        <span>
          <Icon name="info" size={16} /> You <strong>edit, share</strong> or use <strong>older devices</strong> → pick the one that <strong>plays everywhere</strong>.
        </span>
      </div>
      <h2 className="section-label">Videos</h2>
      {VIDEO.map((f) => (
        <FormatCard key={f.name} f={f} />
      ))}
      <h2 className="section-label">Photos</h2>
      {PHOTO.map((f) => (
        <FormatCard key={f.name} f={f} />
      ))}
    </>
  );
}
