'use client';

import React, { useEffect, useRef, useState } from 'react';
import { BarcodeScanner } from 'web-wasm-barcode-reader';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function ScanPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const { profile } = useAuthStore();
  const householdId = profile?.household_id;
  const userId = profile?.id;

  const [lastScanned, setLastScanned] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let scanner: BarcodeScanner;

    const initScanner = async () => {
      scanner = new BarcodeScanner({
        container: containerRef.current!,
        onDetect: async (result) => {
          const text = result.data;

          if (lastScanned !== text) {
            if (navigator.vibrate) {
              navigator.vibrate(200);
            }

            setLastScanned(text);

            if (householdId && userId) {
              await supabase.from('inbox_scans').insert({
                household_id: householdId,
                raw_barcode: text,
                status: 'unparsed',
                scanned_by: userId,
              });
            }

            setTimeout(() => setLastScanned(null), 2000);
          }
        },
        onError: (err) => console.error("Scanner Error:", err),
      });

      await scanner.start();
    };

    initScanner();

    return () => {
      if (scanner) {
        scanner.stop();
      }
    };
  }, [householdId, userId, lastScanned]);

  return (
    <div className="flex flex-col h-screen bg-black relative">
      <header className="absolute top-0 w-full z-10 flex justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
        <button onClick={() => router.back()} className="text-white">
          Cancel
        </button>
        <div className="text-white font-bold">Scan Barcode</div>
        <div className="w-12"></div>
      </header>

      <div
        ref={containerRef}
        className="flex-1 relative flex items-center justify-center overflow-hidden w-full h-full"
      >
        {/* The BarcodeScanner will automatically mount the video and overlay canvas inside this container */}
      </div>

      <div className="absolute bottom-24 left-0 w-full flex justify-center pb-8 z-10">
        {lastScanned ? (
          <div className="bg-success-green text-white px-6 py-2 rounded-full font-semibold shadow-lg">
            Captured: {lastScanned}
          </div>
        ) : (
          <div className="bg-black/50 text-white px-6 py-2 rounded-full backdrop-blur-md">
            Align barcode within frame
          </div>
        )}
      </div>
    </div>
  );
}
