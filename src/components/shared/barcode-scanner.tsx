"use client";

// src/components/shared/barcode-scanner.tsx
// Hardware scanner (USB/Bluetooth): types into the input — scanners send Enter automatically
// Camera scanner: uses @zxing/browser to decode from webcam/tablet camera
// Supports EAN-13, UPC-A, QR Code, Code128 — auto-detected
//
// Props:
//   continuous (default false) — when true, camera stays open after each scan.
//     Same barcode scanned within 1.5s is ignored (debounce) to prevent repeat fires.
//     Caller decides when to close (e.g. user presses the X button).
//   When false (default / product page) — camera closes immediately after one scan.

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Camera, Keyboard, ScanBarcode, Loader2, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import type { BrowserMultiFormatReader } from "@zxing/browser";

type ScanMode = "hardware" | "camera";

interface Props {
  open:        boolean;
  onClose:     () => void;
  onScan:      (barcode: string) => void;
  /** Keep camera running after each scan. Same code debounced for 1.5s. Default: false */
  continuous?: boolean;
}

export function BarcodeScanner({ open, onClose, onScan, continuous = false }: Props) {
  const [mode,        setMode]        = useState<ScanMode>("camera"); // default to camera for stock entry UX
  const [manualInput, setManualInput] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning,  setIsScanning]  = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null); // shows briefly after scan

  const videoRef    = useRef<HTMLVideoElement>(null);
  const inputRef    = useRef<HTMLInputElement>(null);
  const readerRef   = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const activeRef   = useRef(false);
  // Debounce: track last scanned code + timestamp to prevent same code firing repeatedly
  const lastCodeRef = useRef<{ code: string; ts: number } | null>(null);

  // ── Stop camera ───────────────────────────────────────────
  const stopCamera = useCallback(() => {
    activeRef.current = false;
    try { controlsRef.current?.stop(); } catch { /* ignore */ }
    controlsRef.current = null;
    try { (readerRef.current as any)?.reset?.(); } catch { /* ignore */ }
    readerRef.current = null;
    const stream = videoRef.current?.srcObject;
    if (stream instanceof MediaStream) stream.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsScanning(false);
  }, []);

  // ── Start camera ──────────────────────────────────────────
  const startCamera = useCallback(async () => {
    stopCamera();
    activeRef.current = true;
    setIsScanning(false);
    setCameraError(null);
    setLastScanned(null);
    lastCodeRef.current = null;

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Camera requires HTTPS. Use https:// or run: next dev --experimental-https");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      if (!activeRef.current || !videoRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      if (!activeRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }

      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      // Suppress zxing torch/flash warnings
      const origWarn = console.warn.bind(console);
      console.warn = (...args: unknown[]) => {
        if (typeof args[0] === "string" && /setPhotoOptions|photo/i.test(args[0])) return;
        origWarn(...args);
      };

      setIsScanning(true);

      const controls = await reader.decodeFromStream(
        stream,
        videoRef.current,
        (result) => {
          if (result == null || !activeRef.current) return;
          const code = result.getText();
          const now  = Date.now();

          if (continuous) {
            // ── Continuous mode: debounce same code for 1.5s ──
            const last = lastCodeRef.current;
            if (last && last.code === code && now - last.ts < 1500) return;
            lastCodeRef.current = { code, ts: now };

            // Flash the scanned code on screen briefly
            setLastScanned(code);
            setTimeout(() => setLastScanned(null), 1200);

            // Fire — camera keeps running
            onScan(code);
          } else {
            // ── Single scan mode: stop camera then fire ───────
            stopCamera();
            onScan(code);
          }
        }
      );

      if (activeRef.current) {
        controlsRef.current = controls;
      } else {
        controls.stop();
      }
    } catch (err) {
      if (!activeRef.current) return;
      const msg  = err instanceof Error ? err.message : String(err);
      const name = err instanceof Error ? (err as DOMException).name : "";
      if      (/notallowed/i.test(name) || /permission/i.test(msg))
        setCameraError("Camera permission denied — allow camera access in your browser, then try again.");
      else if (/notfound|devicenotfound/i.test(name))
        setCameraError("No camera found. Use the Scanner / Manual tab instead.");
      else if (/notreadable|could not start/i.test(msg) || /notreadable/i.test(name))
        setCameraError("Camera is in use by another app. Close it and try again.");
      else if (/https|secure/i.test(msg))
        setCameraError("Camera requires HTTPS. Run: next dev --experimental-https");
      else
        setCameraError(`Camera unavailable: ${msg || name || "unknown error"}. Use Scanner / Manual tab.`);
      setIsScanning(false);
    }
  }, [stopCamera, onScan, continuous]);

  // ── Open/close/mode effect ────────────────────────────────
  useEffect(() => {
    if (!open) {
      stopCamera();
      setManualInput("");
      setCameraError(null);
      setLastScanned(null);
      lastCodeRef.current = null;
      // Reset to camera tab when used in continuous mode (stock entry)
      // Reset to hardware tab for single-scan (product page)
      setMode(continuous ? "camera" : "hardware");
      return;
    }
    if (mode === "camera") {
      startCamera();
    } else {
      stopCamera();
      setTimeout(() => inputRef.current?.focus(), 80);
    }
    return () => { stopCamera(); };
  }, [open, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Hardware scanner keydown ──────────────────────────────
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const code = manualInput.trim();
      if (!code) return;
      setManualInput("");

      if (continuous) {
        // Debounce for hardware scanner in continuous mode too
        const now  = Date.now();
        const last = lastCodeRef.current;
        if (last && last.code === code && now - last.ts < 1500) return;
        lastCodeRef.current = { code, ts: now };
        setLastScanned(code);
        setTimeout(() => setLastScanned(null), 1200);
        onScan(code);
        // Don't close — refocus for next scan
        setTimeout(() => inputRef.current?.focus(), 50);
      } else {
        onScan(code);
      }
    }
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={() => { stopCamera(); onClose(); }}
      />

      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-background
        border border-border rounded-2xl shadow-2xl max-w-sm mx-auto overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ScanBarcode className="h-5 w-5" />
            <h3 className="font-semibold">
              {continuous ? "Scan Products" : "Scan Barcode"}
            </h3>
            {continuous && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-lg">
                Keep scanning
              </span>
            )}
          </div>
          <button
            onClick={() => { stopCamera(); onClose(); }}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b border-border">
          {(["camera", "hardware"] as ScanMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm
                font-medium transition-colors ${
                  mode === m
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
            >
              {m === "camera" ? <Camera className="h-4 w-4" /> : <Keyboard className="h-4 w-4" />}
              {m === "camera" ? "Camera" : "Scanner / Manual"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">

          {/* ── Camera ── */}
          {mode === "camera" && (
            <div className="space-y-3">
              <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
                <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />

                {/* Scan overlay */}
                {isScanning && !cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-52 h-32 relative">
                      <span className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl" />
                      <span className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr" />
                      <span className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl" />
                      <span className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white rounded-br" />
                      <div className="absolute inset-x-2 top-1/2 h-px bg-red-400/80 animate-pulse" />
                    </div>
                  </div>
                )}

                {/* Scan success flash — shows product was detected */}
                {lastScanned && (
                  <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none">
                    <div className="flex items-center gap-2 bg-emerald-600 text-white text-xs font-semibold
                      px-3 py-2 rounded-xl shadow-lg animate-pulse">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span className="font-mono truncate max-w-40">{lastScanned}</span>
                    </div>
                  </div>
                )}

                {/* Loading spinner */}
                {!isScanning && !cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                  </div>
                )}
              </div>

              {cameraError ? (
                <div className="space-y-3">
                  <p className="text-sm text-destructive text-center">{cameraError}</p>
                  <Button variant="outline" className="w-full gap-2" onClick={startCamera}>
                    <RefreshCw className="h-4 w-4" /> Try Again
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center">
                  {continuous
                    ? "Point at barcode — keeps scanning. Close when done."
                    : "Point camera at barcode — scans automatically"}
                </p>
              )}
            </div>
          )}

          {/* ── Hardware / Manual ── */}
          {mode === "hardware" && (
            <>
              <div className="space-y-1">
                <p className="text-sm font-medium">Hardware scanner or manual entry</p>
                <p className="text-xs text-muted-foreground">
                  {continuous
                    ? "Plug in your USB/Bluetooth scanner and scan — each scan adds to the cart. Or type barcodes manually."
                    : "Plug in a USB/Bluetooth scanner and scan — it types into the field automatically. Or type manually and press Enter."}
                </p>
              </div>

              {/* Last scanned feedback in hardware mode too */}
              {lastScanned && continuous && (
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 text-emerald-700 rounded-xl text-xs font-semibold">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span className="font-mono">{lastScanned}</span>
                </div>
              )}

              <div className="relative">
                <ScanBarcode className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Scan or type barcode, then Enter"
                  className="h-11 pl-11 font-mono"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                />
              </div>

              {/* Only show Search button in single-scan mode — in continuous, Enter key handles it */}
              {!continuous && (
                <Button
                  onClick={() => {
                    const code = manualInput.trim();
                    if (code) { setManualInput(""); onScan(code); }
                  }}
                  disabled={!manualInput.trim()}
                  className="w-full"
                >
                  Search
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}