'use client';

import Icon from '@/components/Icon';
import { ScreenHeader } from '@/components/Shell';

interface Format {
  name: string;
  tag: string;
  pros: string[];
  cons: string[];
}

const VIDEO: Format[] = [
  {
    name: 'HEVC (H.265)',
    tag: 'Smaller files',
    pros: [
      'About 30–40% smaller than H.264 at the same quality',
      'Plays on iPhones, Macs and most phones from the last few years',
      'Edits in Premiere Pro, Final Cut Pro, iMovie, DaVinci Resolve, CapCut, LumaFusion, Filmora and VN on a reasonably new device',
    ],
    cons: [
      'Older or low-end phones, TVs and PCs may stutter, play no picture, or not open it',
      'Editing is slow or not possible in basic or older editing apps, and heavy on low-end computers',
      "Windows may need the HEVC Video Extension; some browsers and websites can't play it",
      'Some apps re-convert it when you share or upload, so the saving can be lost there',
    ],
  },
  {
    name: 'H.264 (AVC)',
    tag: 'Plays everywhere',
    pros: ['Plays and edits everywhere, even on old and cheap devices', 'Light to edit, quick to share and upload'],
    cons: ['Files are bigger, so less space is freed'],
  },
];

const PHOTO: Format[] = [
  {
    name: 'Optimised JPEG',
    tag: 'Opens everywhere',
    pros: ['Opens everywhere: every phone, computer, website and app', 'Can replace the original in the same place'],
    cons: ['Saves less space than HEIC'],
  },
  {
    name: 'HEIC',
    tag: 'Smaller files',
    pros: ['About half the size of a JPEG at the same look', 'Native on iPhone and most new Android phones'],
    cons: [
      "Older Windows PCs, older Android phones and many websites can't open it without converting",
      "Some editing apps, printers and photo shops don't accept it",
      'Saved as a new file, so the original JPEG has to be deleted separately',
      'On the web it is made as AVIF, and camera details (date, place) are not copied',
    ],
  },
];

function FormatCard({ f }: { f: Format }) {
  return (
    <section className="card stack">
      <div className="row-between">
        <strong style={{ fontSize: 18 }}>{f.name}</strong>
        <span className="chip small primary">{f.tag}</span>
      </div>
      <div className="pc-grid">
        <div className="pc-box pc-pros">
          <span className="pc-head">
            <Icon name="check" size={16} /> Pros
          </span>
          <ul>
            {f.pros.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
        <div className="pc-box pc-cons">
          <span className="pc-head">
            <Icon name="close" size={16} /> Cons
          </span>
          <ul>
            {f.cons.map((t) => (
              <li key={t}>{t}</li>
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
      <div className="banner info">
        <Icon name="info" size={14} /> Pick the smaller format if the files stay on a newer phone. Pick the one that plays everywhere if you edit them, share them a lot,
        or watch them on older or low-end devices.
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
