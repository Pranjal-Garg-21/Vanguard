/** Join code, QR and a printable sheet for the classroom wall. */
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { Button, Card } from '@/ui';
import { joinUrl, LANGUAGE_NAMES, type ClassRow } from '../data';

export function JoinTab({ cls }: { cls: ClassRow }) {
  const url = joinUrl(cls.join_code);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(url, { width: 640, margin: 1, errorCorrectionLevel: 'M' }).then(setQr);
  }, [url]);

  return (
    <div className="grid gap-5 md:grid-cols-[1fr_1.2fr]">
      <Card className="flex flex-col items-center text-center print:border-0 print:bg-white print:text-black">
        <h2 className="text-xl font-extrabold">Join {cls.name} on MoneyPath</h2>
        {qr && <img src={qr} alt={`QR code for ${url}`} className="mt-4 w-64 max-w-full" />}
        <p className="mt-4 text-sm text-muted">or open the app and type</p>
        <p className="font-mono text-4xl font-black tracking-[0.3em]">{cls.join_code}</p>
        <p className="mt-2 text-xs break-all text-muted">{url}</p>
      </Card>

      <div className="space-y-4 print:hidden">
        <Card className="space-y-3">
          <h3 className="font-bold">How students join</h3>
          <ol className="list-decimal space-y-1 pl-5 text-ink-soft">
            <li>Scan the QR with the phone camera (internet needed once).</li>
            <li>Tap “Add to home screen” so it works offline.</li>
            <li>Pick a language ({LANGUAGE_NAMES[cls.language] ?? cls.language} is the class default), an avatar and a picture code.</li>
          </ol>
        </Card>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => window.print()}>Print QR sheet</Button>
          <Button
            variant="secondary"
            onClick={async () => {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? 'Copied' : 'Copy join link'}
          </Button>
        </div>
      </div>
    </div>
  );
}
