import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

export default function BarcodeScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const controlsRef = useRef(null);
  const scannedRef = useRef(false);
  const [error, setError] = useState(null);
  const [manualCode, setManualCode] = useState("");

  const handleDetected = useCallback(
    (code) => {
      if (scannedRef.current) return;
      scannedRef.current = true;
      controlsRef.current?.stop();
      onScan(code);
    },
    [onScan]
  );

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    let cancelled = false;

    (async () => {
      try {
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result) => {
            if (result && !cancelled) {
              handleDetected(result.getText());
            }
          }
        );
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
      } catch {
        if (!cancelled) {
          setError(
            "Camera access is unavailable. Enter the barcode number below instead."
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      readerRef.current?.reset();
    };
  }, [handleDetected]);

  const submitManual = (e) => {
    e.preventDefault();
    const code = manualCode.replace(/\D/g, "");
    if (code.length >= 8) {
      handleDetected(code);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[var(--color-kitchen-bg)]/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Scan barcode"
    >
      <div className="flex items-center justify-between border-b border-[var(--color-kitchen-border)] px-4 py-3">
        <h2 className="font-serif text-lg text-[var(--color-kitchen-cream)]">
          Scan Barcode
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-1.5 text-sm text-[var(--color-kitchen-muted)] hover:text-[var(--color-kitchen-cream)]"
        >
          Cancel
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
        {!error ? (
          <div className="relative w-full max-w-sm overflow-hidden rounded-xl border-2 border-[var(--color-kitchen-amber)]/50 bg-black">
            <video
              ref={videoRef}
              className="aspect-[4/3] w-full object-cover"
              muted
              playsInline
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-32 w-56 rounded-lg border-2 border-[var(--color-kitchen-amber)] shadow-[0_0_0_9999px_rgba(0,0,0,0.45)_inset]" />
            </div>
          </div>
        ) : (
          <p className="max-w-sm text-center text-sm text-[var(--color-kitchen-warning)]">
            {error}
          </p>
        )}

        <p className="text-center text-xs text-[var(--color-kitchen-muted)]">
          Point your camera at the product barcode
        </p>

        <form onSubmit={submitManual} className="flex w-full max-w-sm gap-2">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Or enter barcode manually"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-[var(--color-kitchen-border)] bg-[var(--color-kitchen-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-kitchen-amber)]"
          />
          <button
            type="submit"
            disabled={manualCode.replace(/\D/g, "").length < 8}
            className="rounded-lg bg-[var(--color-kitchen-amber)] px-4 py-2 text-sm font-semibold text-[#0f0f0f] disabled:opacity-40"
          >
            Look up
          </button>
        </form>
      </div>
    </div>
  );
}
