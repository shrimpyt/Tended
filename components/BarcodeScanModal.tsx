'use client';

import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { X, Camera, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  visible: boolean;
  onClose: () => void;
  onScan: (barcode: string) => Promise<boolean>;
}

export default function BarcodeScanModal({ visible, onClose, onScan }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Store the codeReader instance so we can call reset() on cleanup
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [status, setStatus] = useState<'scanning' | 'loading' | 'success' | 'error'>('scanning');
  const statusRef = useRef(status);
  const [statusMessage, setStatusMessage] = useState<string>('');

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Initialize Scanner when modal opens
  useEffect(() => {
    if (!visible) {
      // Defer resetting status
      return;
    }

    const codeReader = new BrowserMultiFormatReader();
    readerRef.current = codeReader;

    // Camera requires a secure context on most browsers
    if (!window.isSecureContext) {
      setTimeout(() => {
        setHasCamera(false);
        setError('Camera requires a secure (HTTPS) connection.');
      }, 0);
      return;
    }

    const BACK_CAMERA_HINTS = ['back', 'rear', 'environment'];

    codeReader.listVideoInputDevices()
      .then((videoInputDevices) => {
        console.log('[BarcodeScanModal] Found devices:', videoInputDevices.map(d => d.label));
        if (videoInputDevices.length === 0) {
          setHasCamera(false);
          setError('No camera found on this device.');
          return;
        }

        let selectedDeviceId = videoInputDevices[0].deviceId;
        // Prefer back/rear/environment-facing camera when available
        const backCamera = videoInputDevices.find(device => {
          const label = device.label.toLowerCase();
          return BACK_CAMERA_HINTS.some(hint => label.includes(hint));
        });
        if (backCamera) {
          console.log('[BarcodeScanModal] Selecting back camera:', backCamera.label);
          selectedDeviceId = backCamera.deviceId;
        } else {
          console.log('[BarcodeScanModal] No back camera found, using default:', videoInputDevices[0].label);
        }

        if (videoRef.current) {
          console.log('[BarcodeScanModal] Starting decode from device:', selectedDeviceId);
          codeReader.decodeFromVideoDevice(selectedDeviceId, videoRef.current, async (result, err) => {
            // Only process if we are currently in scanning state
            if (result && statusRef.current === 'scanning') {
              console.log('[BarcodeScanModal] Scan success:', result.getText());
              codeReader.reset(); // Stop scanning

              setStatus('loading');
              setStatusMessage('Identifying product...');

              try {
                const success = await onScan(result.getText());
                if (success) {
                  setStatus('success');
                  setStatusMessage('Product added successfully!');
                  setTimeout(() => onClose(), 1500);
                } else {
                  setStatus('error');
                  setStatusMessage('Product not found.');
                  setTimeout(() => setStatus('scanning'), 2500);
                }
              } catch (scanErr) {
                setStatus('error');
                setStatusMessage('Failed to add product.');
                setTimeout(() => setStatus('scanning'), 2500);
              }
            }
            if (err && !(err.name === 'NotFoundException')) {
              // Only log real errors, not the "no barcode found in this frame" exception
              console.error('[BarcodeScanModal] Decode error:', err);
            }
          });
        } else {
          console.error('[BarcodeScanModal] videoRef.current is null during initialization');
          setError('Video element not ready.');
        }
      })
      .catch((err: Error) => {
        console.error('[BarcodeScanModal] Initialization error:', err);
        setHasCamera(false);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Camera permission denied. Please allow access in your browser settings.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('No camera found on this device.');
        } else {
          setError(`Camera error: ${err.message}`);
        }
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
              className={`absolute inset-0 w-full h-full object-cover ${status !== 'scanning' ? 'opacity-30' : ''}`}
              autoPlay
              playsInline
              muted
            />

            {status === 'scanning' && (
              <>
                {/* Scan guides overlay */}
                <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none z-10" />
                <div className="absolute inset-x-12 inset-y-32 border-2 border-white/50 rounded-xl pointer-events-none z-10" />
                <div className="absolute w-full h-0.5 bg-red-500/50 pointer-events-none z-10 top-1/2 -translate-y-1/2 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
              </>
            )}

            {status !== 'scanning' && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-black/60 backdrop-blur-sm text-white">
                {status === 'loading' && (
                  <>
                    <Loader2 size={48} className="animate-spin text-primary-blue mb-4" />
                    <p className="text-lg font-medium">{statusMessage}</p>
                  </>
                )}
                {status === 'success' && (
                  <>
                    <CheckCircle2 size={56} className="text-green-500 mb-4" />
                    <p className="text-lg font-medium text-center">{statusMessage}</p>
                  </>
                )}
                {status === 'error' && (
                  <>
                    <AlertCircle size={56} className="text-red-500 mb-4" />
                    <p className="text-lg font-medium text-center">{statusMessage}</p>
                    <p className="text-sm opacity-70 mt-2">Retrying shortly...</p>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer / Instructions */}
      <div className="bg-surface-elevated p-6 pb-8 border-t border-border">
        <p className="text-center text-text-primary font-medium tracking-wide">
          {status === 'scanning' ? 'Center the barcode in the frame' : statusMessage}
        </p>
        <p className="text-center text-text-secondary text-sm mt-1">
          {status === 'scanning' ? 'It will scan automatically when focused' : 'Please wait...'}
        </p>
      </div>
    </div>
  );
}
