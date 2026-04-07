'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useInventory, useAddInventoryItem } from '../hooks/queries';
import { NewItem } from '../types/models';
import { useAuthStore } from '../store/authStore';

function getUniqueCategories(items: { category?: string | null }[]): string[] {
  const seen = new Set<string>();
  for (const item of items) {
    if (item.category?.trim()) seen.add(item.category.trim());
  }
  return Array.from(seen).sort();
}

type Step = 'scanning' | 'loading' | 'confirm' | 'notFound' | 'saving';

interface ProductDraft {
  barcode: string;
  name: string;
  category: string;
  unit: string;
  brand: string;
}

const DEFAULT_CATEGORY_SUGGESTIONS = ['Kitchen', 'Bathroom', 'Cleaning', 'Pantry'];

function mapOFFCategory(categoriesStr: string | undefined): string {
  if (!categoriesStr) return 'Kitchen';
  const cats = categoriesStr.toLowerCase();
  if (cats.includes('cleaning') || cats.includes('household') || cats.includes('detergent') || cats.includes('dishwash') || cats.includes('laundry')) return 'Cleaning';
  if (cats.includes('hygiene') || cats.includes('beauty') || cats.includes('shampoo') || cats.includes('soap') || cats.includes('toothpaste')) return 'Bathroom';
  if (cats.includes('pasta') || cats.includes('rice') || cats.includes('cereal') || cats.includes('flour') || cats.includes('sauce') || cats.includes('pantry')) return 'Pantry';
  return 'Kitchen';
}

function parseUnit(quantity: string | undefined): string {
  if (!quantity) return '';
  const match = quantity.match(/\b(ml|l|g|kg|oz|lb|fl oz|count|rolls|sheets|pack)\b/i);
  return match ? match[1].toLowerCase() : '';
}

async function lookupBarcode(barcode: string): Promise<ProductDraft | null> {
  try {
    let res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, {
      headers: { 'User-Agent': 'TendedWebApp/1.0' },
    });
    let json = await res.json();
    if (json.status !== 1 || !json.product) {
      res = await fetch(`https://world.openproductsfacts.org/api/v0/product/${barcode}.json`, {
        headers: { 'User-Agent': 'TendedWebApp/1.0' },
      });
      json = await res.json();
    }
    if (json.status !== 1 || !json.product) return null;
    const p = json.product;
    const name = p.product_name_en?.trim() || p.product_name?.trim() || p.abbreviated_product_name?.trim() || '';
    if (!name) return null;
    return { barcode, name, category: mapOFFCategory(p.categories), unit: parseUnit(p.quantity), brand: p.brands?.split(',')[0]?.trim() ?? '' };
  } catch { return null; }
}

interface Props {
  visible: boolean;
  onScan: (barcode: string) => Promise<boolean>;
  onManualEntry: (name: string) => Promise<boolean>;
  onClose: () => void;
}

export default function BarcodeScanModal({ visible, onScan, onManualEntry, onClose }: Props) {
  const { profile } = useAuthStore();
  const householdId = profile?.household_id ?? '';
  const { data: items = [] } = useInventory(householdId);
  const { mutateAsync: addItem } = useAddInventoryItem();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const scannedRef = useRef(false);
  const manualInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('scanning');
  const [draft, setDraft] = useState<ProductDraft | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [maxQuantity, setMaxQuantity] = useState('1');
  const [threshold, setThreshold] = useState('0.25');
  const [manualName, setManualName] = useState('');
  const [manualCategory, setManualCategory] = useState('');
  const [manualBarcode, setManualBarcode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [barcodeDetectorSupported, setBarcodeDetectorSupported] = useState(false);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const handleDetectedCode = useCallback(async (code: string) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    stopCamera();
    setStep('loading');
    const product = await lookupBarcode(code);
    if (product) { setDraft(product); setStep('confirm'); }
    else { setManualBarcode(code); setManualName(''); setStep('notFound'); }
  }, [stopCamera]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Use BarcodeDetector API if available
      const BarcodeDetectorAPI = (window as { BarcodeDetector?: new (opts: { formats: string[] }) => { detect: (img: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
      if (BarcodeDetectorAPI) {
        setBarcodeDetectorSupported(true);
        const detector = new BarcodeDetectorAPI({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code', 'code_128', 'code_39'] });
        const scan = async () => {
          if (!videoRef.current || scannedRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0 && codes[0].rawValue) {
              handleDetectedCode(codes[0].rawValue);
              return;
            }
          } catch { /* ignore */ }
          animFrameRef.current = requestAnimationFrame(scan);
        };
        animFrameRef.current = requestAnimationFrame(scan);
      } else {
        setBarcodeDetectorSupported(false);
        // Camera shows live feed; user types barcode manually
      }
    } catch (err) {
      setCameraError('Camera access denied or not available. Enter the barcode manually below.');
    }
  }, [handleDetectedCode]);

  const reset = useCallback(() => {
    scannedRef.current = false;
    setStep('scanning');
    setDraft(null);
    setQuantity('1');
    setMaxQuantity('1');
    setThreshold('0.25');
    setManualName('');
    setManualBarcode('');
    setManualCategory('');
    setError(null);
  }, []);

  useEffect(() => {
    if (visible) {
      reset();
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleManualBarcodeSubmit = async (code: string) => {
    if (!code.trim()) return;
    scannedRef.current = true;
    stopCamera();
    setStep('loading');
    const product = await lookupBarcode(code.trim());
    if (product) { setDraft(product); setStep('confirm'); }
    else { setManualBarcode(code.trim()); setManualName(''); setStep('notFound'); }
  };

  const handleSave = async () => {
    if (!profile?.household_id || !profile?.id) return;
    const name = draft ? draft.name.trim() : manualName.trim();
    if (!name) { setError('Item name is required.'); return; }
    const qty = parseFloat(quantity);
    const maxQty = parseFloat(maxQuantity);
    const thresh = parseFloat(threshold);
    if (isNaN(qty) || qty < 0) { setError('Starting quantity must be 0 or more.'); return; }
    if (isNaN(maxQty) || maxQty <= 0) { setError('Max quantity must be greater than 0.'); return; }
    if (qty > maxQty) { setError('Starting quantity cannot exceed max quantity.'); return; }
    if (isNaN(thresh) || thresh < 0) { setError('Threshold must be 0 or more.'); return; }

    setStep('saving');
    setError(null);

    const resolvedCategory = draft ? draft.category.trim() || null : manualCategory.trim() || null;
    const newItem: NewItem = {
      name,
      category: resolvedCategory,
      quantity: qty,
      max_quantity: maxQty,
      threshold: thresh,
      unit: draft?.unit || null,
    };
    try {
      await addItem({ householdId: profile.household_id, userId: profile.id, item: newItem });
    } catch {
      setError('Failed to save. Please try again.');
      setStep(draft ? 'confirm' : 'notFound');
      return;
    }
    onClose();
  };

  const handleClose = () => { stopCamera(); onClose(); };
  const categorySuggestions = getUniqueCategories(items).length > 0 ? getUniqueCategories(items) : DEFAULT_CATEGORY_SUGGESTIONS;
  const unitLabel = draft?.unit ? ` ${draft.unit}` : '';

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-white/10 shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <button
            onClick={step === 'confirm' || step === 'notFound' ? () => { reset(); startCamera(); } : handleClose}
            className="text-sm text-text-secondary hover:text-foreground transition-colors w-14"
          >
            {step === 'confirm' || step === 'notFound' ? 'Rescan' : 'Cancel'}
          </button>
          <h2 className="text-sm font-semibold">
            {step === 'scanning' && 'Scan Barcode'}
            {step === 'loading' && 'Looking up…'}
            {step === 'confirm' && 'Product Found'}
            {step === 'notFound' && 'Not Found'}
            {step === 'saving' && 'Saving…'}
          </h2>
          {(step === 'confirm' || step === 'notFound') ? (
            <button onClick={handleSave} className="text-sm text-primary-blue font-medium hover:text-primary-blue/80 transition-colors w-14 text-right">Add</button>
          ) : (
            <div className="w-14" />
          )}
        </div>

        {/* Scanning step */}
        {step === 'scanning' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Live camera feed */}
            <div className="relative flex-1 bg-black min-h-[240px]">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              <canvas ref={canvasRef} className="hidden" />

              {/* Viewfinder overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-40 relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary-blue rounded-tl" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary-blue rounded-tr" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary-blue rounded-bl" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary-blue rounded-br" />
                </div>
              </div>

              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6">
                  <p className="text-sm text-text-secondary text-center">{cameraError}</p>
                </div>
              )}
            </div>

            {/* Manual barcode entry */}
            <div className="p-4 flex-shrink-0">
              {!barcodeDetectorSupported && !cameraError && (
                <p className="text-xs text-amber text-center mb-2">Auto-detection not supported in this browser. Enter barcode manually.</p>
              )}
              {barcodeDetectorSupported && (
                <p className="text-xs text-text-secondary text-center mb-2">Point camera at barcode, or type it manually below</p>
              )}
              <div className="flex gap-2">
                <input
                  ref={manualInputRef}
                  type="text"
                  inputMode="numeric"
                  placeholder="Or type barcode number…"
                  className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-blue"
                  onKeyDown={e => { if (e.key === 'Enter') handleManualBarcodeSubmit((e.target as HTMLInputElement).value); }}
                />
                <button
                  onClick={() => handleManualBarcodeSubmit(manualInputRef.current?.value ?? '')}
                  className="px-4 py-2 rounded-lg bg-primary-blue text-white text-sm font-medium hover:bg-primary-blue/90 transition-colors"
                >
                  Look up
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading / Saving */}
        {(step === 'loading' || step === 'saving') && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-blue" />
            <p className="text-sm text-text-secondary">
              {step === 'loading' ? 'Looking up product…' : 'Adding to inventory…'}
            </p>
          </div>
        )}

        {/* Confirm / Not Found - shared form UI */}
        {(step === 'confirm' || step === 'notFound') && (
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
            {error && <div className="px-4 py-3 rounded-lg bg-red/10 border border-red/30 text-sm text-red">{error}</div>}

            {step === 'confirm' && draft && (
              <div className="p-4 rounded-xl bg-surface-elevated border border-border flex flex-col gap-1">
                <p className="text-xs text-text-secondary uppercase tracking-widest">{draft.brand || 'Unknown brand'}</p>
                <input
                  value={draft.name}
                  onChange={e => setDraft(d => d ? { ...d, name: e.target.value } : d)}
                  className="text-lg font-semibold bg-transparent focus:outline-none border-b border-transparent focus:border-primary-blue pb-0.5"
                />
                {draft.unit && <p className="text-xs text-text-secondary">{draft.unit}</p>}
                <p className="text-xs text-border">#{draft.barcode}</p>
              </div>
            )}

            {step === 'notFound' && (
              <>
                <div className="px-4 py-3 rounded-xl bg-amber/10 border border-amber/30 text-sm text-amber">
                  Product not found in database. Enter the details manually.
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Item name</label>
                  <input
                    autoFocus
                    value={manualName}
                    onChange={e => setManualName(e.target.value)}
                    placeholder="e.g. Dish Soap"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-blue"
                  />
                </div>
              </>
            )}

            {/* Category */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                Category <span className="normal-case font-normal">(optional)</span>
              </label>
              <input
                value={step === 'confirm' ? draft?.category ?? '' : manualCategory}
                onChange={e => step === 'confirm' ? setDraft(d => d ? { ...d, category: e.target.value } : d) : setManualCategory(e.target.value)}
                placeholder="e.g. Kitchen, Pantry…"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-blue"
              />
              <div className="flex flex-wrap gap-1.5">
                {categorySuggestions.map(chip => (
                  <button
                    key={chip}
                    onClick={() => step === 'confirm' ? setDraft(d => d ? { ...d, category: chip } : d) : setManualCategory(chip)}
                    className="px-2.5 py-1 rounded-full text-xs border border-border text-text-secondary hover:text-foreground hover:border-primary-blue transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Quantity</label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <p className="text-xs text-text-secondary mb-1">Current{unitLabel}</p>
                  <input
                    type="number"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-blue"
                  />
                </div>
                <span className="text-text-secondary text-lg pt-5">/</span>
                <div className="flex-1">
                  <p className="text-xs text-text-secondary mb-1">Max{unitLabel}</p>
                  <input
                    type="number"
                    value={maxQuantity}
                    onChange={e => setMaxQuantity(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-blue"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Reorder when below{unitLabel}</label>
              <input
                type="number"
                value={threshold}
                onChange={e => setThreshold(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-blue"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
