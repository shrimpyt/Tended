'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { X, Camera } from 'lucide-react';

interface Props {
  visible: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export default function BarcodeScanModal({ visible, onClose, onScan }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Store the codeReader instance so we can call reset() on cleanup
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasCamera, setHasCamera] = useState<boolean>(true);

  // Initialize Scanner when modal opens
  useEffect(() => {
    if (!visible) return;

    const codeReader = new BrowserMultiFormatReader();
    readerRef.current = codeReader;

    codeReader.listVideoInputDevices()
      .then((videoInputDevices) => {
        if (videoInputDevices.length === 0) {
          setHasCamera(false);
          setError('No camera found on this device.');
          return;
        }
        
        let selectedDeviceId = videoInputDevices[0].deviceId;
        // Prefer back camera if available
        const backCamera = videoInputDevices.find(device => device.label.toLowerCase().includes('back'));
        if (backCamera) {
          selectedDeviceId = backCamera.deviceId;
        }

        if (videoRef.current) {
          codeReader.decodeFromVideoDevice(selectedDeviceId, videoRef.current, (result, err) => {
            if (result) {
              onScan(result.getText());
              // Auto-stop after successful scan
              codeReader.reset();
              onClose();
            }
          });
        }
      })
      .catch((err) => {
        console.error(err);
        setHasCamera(false);
        setError('Camera access denied or unavailable.');
      });

    return () => {
      if (readerRef.current) {
        readerRef.current.reset();
      }
    };
  }, [visible, onScan, onClose]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-elevated">
        <button onClick={onClose} className="p-2 -ml-2 text-text-secondary hover:text-text-primary rounded-full hover:bg-surface transition-colors">
          <X size={24} />
        </button>
        <h2 className="text-lg font-bold text-text-primary">Scan Barcode</h2>
        <div className="w-10"></div> {/* Spacer for balance */}
      </div>

      {/* Scanner Area */}
      <div className="flex-1 relative flex flex-col items-center justify-center bg-black">
        {error ? (
          <div className="text-center p-6 text-white">
            <Camera size={48} className="mx-auto mb-4 opacity-50" />
            <p className="font-medium text-lg mb-2">{error}</p>
            <p className="text-sm opacity-70">Please check your camera permissions.</p>
          </div>
        ) : (
          <>
            <video 
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              muted
            />
            {/* Scan guides overlay */}
            <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none z-10" />
            <div className="absolute inset-x-12 inset-y-32 border-2 border-white/50 rounded-xl pointer-events-none z-10" />
            <div className="absolute w-full h-0.5 bg-red-500/50 pointer-events-none z-10 top-1/2 -translate-y-1/2" />
          </>
        )}
      </div>

      {/* Footer / Instructions */}
      <div className="bg-surface-elevated p-6 pb-8 border-t border-border">
        <p className="text-center text-text-primary font-medium tracking-wide">
          Center the barcode in the frame
        </p>
        <p className="text-center text-text-secondary text-sm mt-1">
          It will scan automatically when focused
        </p>
      </div>
    </div>
  );
}
