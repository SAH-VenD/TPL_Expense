import { useState, useRef, useCallback } from 'react';
import { CameraIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const startCamera = useCallback(async () => {
    setIsStarting(true);
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch {
      setError('Unable to access camera. Please check permissions or use file upload instead.');
    } finally {
      setIsStarting(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `receipt-${Date.now()}.jpg`, { type: 'image/jpeg' });
          stopCamera();
          onCapture(file);
        }
      },
      'image/jpeg',
      0.92,
    );
  }, [stopCamera, onCapture]);

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between p-4 bg-black/80">
        <h3 className="text-white font-medium">Capture Receipt</h3>
        <button onClick={handleClose} className="text-white p-2 hover:bg-white/10 rounded-full">
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center relative">
        {!stream && !error && (
          <button
            onClick={startCamera}
            disabled={isStarting}
            className="flex flex-col items-center gap-3 text-white"
          >
            <CameraIcon className="h-16 w-16" />
            <span className="text-lg">{isStarting ? 'Starting camera...' : 'Tap to start camera'}</span>
          </button>
        )}

        {error && (
          <div className="text-center p-6">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-white text-black rounded-lg font-medium"
            >
              Use file upload instead
            </button>
          </div>
        )}

        {stream && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
          />
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      {stream && (
        <div className="p-6 flex justify-center bg-black/80">
          <button
            onClick={capturePhoto}
            className="w-16 h-16 rounded-full bg-white border-4 border-gray-300 hover:bg-gray-100 transition-colors"
            aria-label="Capture photo"
          />
        </div>
      )}
    </div>
  );
}
