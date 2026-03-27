import Link from 'next/link';
import { bsodCopy } from '@/data/copy';

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0078D7] selection:bg-white/20">
      <div className="text-white max-w-2xl px-8 font-mono">
        {/* Sad face */}
        <p className="text-[120px] leading-none mb-8">:(</p>

        {/* Main message */}
        <h1 className="text-2xl mb-6 leading-relaxed">
          {bsodCopy.title}
        </h1>

        {/* Progress fake */}
        <p className="text-lg text-white/80 mb-8">
          0% complete
        </p>

        {/* Error details */}
        <div className="space-y-4 text-sm text-white/70">
          <p>{bsodCopy.description}</p>
          <p className="text-white/50">
            Stop code: {bsodCopy.errorCode}
          </p>
          <p className="text-white/50 mt-2">
            {bsodCopy.technicalInfo}
          </p>
        </div>

        {/* QR code placeholder + reboot button */}
        <div className="mt-12 flex items-center gap-6">
          <div className="w-24 h-24 bg-white/10 rounded-lg flex items-center justify-center text-xs text-white/30 border border-white/20">
            <div className="text-center">
              <p className="text-3xl mb-1">?</p>
              <p>no qr lol</p>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-sm text-white/60 mb-3">
              If you&apos;d like to know more, search online for: DEVOS_PAGE_NOT_FOUND
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-white text-[#0078D7] rounded-lg font-bold
                         hover:bg-white/90 transition-colors text-sm"
            >
              {bsodCopy.buttonText}
            </Link>
          </div>
        </div>

        {/* devOS branding */}
        <p className="mt-16 text-xs text-white/20">
          devOS v2.0 :: This is not a real crash. Probably.
        </p>
      </div>
    </div>
  );
}
