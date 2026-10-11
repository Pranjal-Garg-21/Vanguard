/** Join code, QR and a printable sheet for the classroom wall. */
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { Icon } from '@/ui';
import { ghost, lime, Panel } from '../theme';
import { joinUrl, LANGUAGE_NAMES, type ClassRow } from '../data';

export function JoinTab({ cls }: { cls: ClassRow }) {
  const url = joinUrl(cls.join_code);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(url, { width: 640, margin: 1, errorCorrectionLevel: 'M' }).then(setQr);
  }, [url]);

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_1.2fr] lg:gap-8">
      <section className="flex flex-col items-center rounded-xl border border-[#e3e8ef] bg-white p-8 text-center shadow-sm print:border-0 print:shadow-none">
        <h2 className="text-xl font-bold">Join {cls.name} on PaisaPath</h2>
        {qr && <img src={qr} alt={`QR code for ${url}`} className="mt-6 w-64 max-w-full rounded-lg border border-[#e3e8ef] p-2" />}
        <p className="mt-6 text-sm text-[#5b6577]">or open the app and type</p>
        <p className="mt-1 rounded-lg bg-[#1c2538] px-5 py-2 font-mono text-4xl font-bold tracking-[0.3em] text-[#a3e635] print:bg-white print:text-black">{cls.join_code}</p>
        <p className="mt-3 text-xs break-all text-[#7a8597]">{url}</p>
      </section>

      <div className="space-y-6 print:hidden">
        <Panel icon="qr" title="How students join">
          <ol className="list-decimal space-y-2 pl-5 leading-relaxed text-[#3b4558]">
            <li>Scan the QR with the phone camera (internet needed once).</li>
            <li>Tap “Add to home screen” so it works offline.</li>
            <li>Pick a language ({LANGUAGE_NAMES[cls.language] ?? cls.language} is the class default), an avatar and a picture code.</li>
          </ol>
        </Panel>
        <div className="flex flex-wrap gap-3">
          <button type="button" className={lime} onClick={() => window.print()}>
            Print QR sheet
          </button>
          <button
            type="button"
            className={ghost}
            onClick={async () => {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            <Icon name={copied ? 'check' : 'link'} className="h-4 w-4" />
            {copied ? 'Copied' : 'Copy join link'}
          </button>
        </div>
      </div>
    </div>
  );
}
