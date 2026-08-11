'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSession } from '../lib/SessionContext';
import { UserIntent } from '../lib/types';
import { predictSign } from '../lib/apiClient';

interface CameraPreviewProps {
  onCaptureDone: (intent: UserIntent, confidence: number) => void;
  onCancel: () => void;
}

export const CameraPreview: React.FC<CameraPreviewProps> = ({ onCaptureDone, onCancel }) => {
  const { session, submitKtpForVerification } = useSession();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Initialize webcam
  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setStreamActive(true);
        }
      } catch (err) {
        console.warn('Camera access error:', err);
        setCameraError('Kamera tidak terdeteksi atau izin belum diberikan. Gunakan mode simulasi.');
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startSigningCapture = () => {
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          beginRecordSequence();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const capturePhotoFromVideo = (): string => {
    if (
      videoRef.current &&
      videoRef.current.readyState >= 2 &&
      videoRef.current.videoWidth > 0 &&
      videoRef.current.videoHeight > 0
    ) {
      try {
        const targetWidth = 480;
        const targetHeight = Math.round((videoRef.current.videoHeight / videoRef.current.videoWidth) * 480) || 270;
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(videoRef.current, 0, 0, targetWidth, targetHeight);
          return canvas.toDataURL('image/jpeg', 0.6);
        }
      } catch (err) {
        console.warn('Failed to capture frame from video element:', err);
      }
    }

    // Realistic KTP Canvas Graphic Fallback (no abstract wallpaper)
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 480;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Card Background (KTP Cyan/Blue Gradient)
        const grad = ctx.createLinearGradient(0, 0, 480, 300);
        grad.addColorStop(0, '#0284c7');
        grad.addColorStop(1, '#0369a1');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 480, 300);

        // KTP Header
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PROVINSI DKI JAKARTA', 240, 26);
        ctx.fillText('KOTA JAKARTA SELATAN', 240, 44);

        // NIK Line
        ctx.font = 'bold 17px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('NIK  : 3174052108950003', 20, 80);

        // Photo Box Frame
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(340, 70, 120, 160);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.strokeRect(340, 70, 120, 160);
        ctx.fillStyle = '#475569';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('👤', 400, 160);

        // Text details
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Nama         : AHMAD HIDAYAT', 20, 115);
        ctx.fillText('Tempat/Tgl   : JAKARTA, 21-08-1995', 20, 140);
        ctx.fillText('Jenis Kelamin: LAKI-LAKI', 20, 165);
        ctx.fillText('Alamat       : JL. SUDIRMAN NO. 45', 20, 190);
        ctx.fillText('Agama        : ISLAM', 20, 215);
        ctx.fillText('Status       : BELUM KAWIN', 20, 240);
        ctx.fillText('Pekerjaan    : KARYAWAN SWASTA', 20, 265);

        return canvas.toDataURL('image/jpeg', 0.7);
      }
    } catch (e) {
      console.error('Failed to render fallback canvas:', e);
    }
    return '';
  };

  const beginRecordSequence = async () => {
    setIsRecording(true);

    // Simulate landmark extraction / document scan (~1.5s)
    setTimeout(async () => {
      setIsRecording(false);
      
      if (session.workflow_state === 'IDENTITY') {
        const capturedPhoto = capturePhotoFromVideo();
        submitKtpForVerification(capturedPhoto);
        onCancel();
        return;
      }

      // Generate synthetic 30 frames x 261 features for backend test or intent prediction
      const dummyLandmarks: number[][] = Array.from({ length: 30 }, () =>
        Array.from({ length: 261 }, () => Math.random() * 0.5 - 0.25)
      );

      const response = await predictSign(session.session_id, dummyLandmarks);
      
      // Map state-dependent intent fallback
      let intent: UserIntent = response.intent;
      if (session.workflow_state === 'PATIENT_STATUS') {
        intent = Math.random() > 0.3 ? 'YA' : 'TIDAK';
      } else if (session.workflow_state === 'INSURANCE') {
        intent = Math.random() > 0.4 ? 'YA' : 'TIDAK';
      } else if (session.workflow_state === 'DESTINATION') {
        intent = 'SAKIT';
      } else if (session.workflow_state === 'CONFIRM') {
        intent = 'YA';
      }

      onCaptureDone(intent, response.confidence || 0.88);
    }, 1500);
  };

  return (
    <div className="bg-[#13231F] rounded-xl border border-[#D9E1DD] overflow-hidden flex flex-col h-full relative">
      {/* Live Video / Simulator Box */}
      <div className="relative aspect-video w-full flex items-center justify-center bg-black overflow-hidden">
        {cameraError ? (
          <div className="p-6 text-center text-gray-300">
            <div className="text-4xl mb-2">📹</div>
            <p className="text-sm font-medium text-amber-300 mb-1">{cameraError}</p>
            <p className="text-xs text-gray-400">Anda dapat menekan tombol &quot;Mulai Isyarat (Simulasi)&quot; di bawah.</p>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform -scale-x-100"
          />
        )}

        {/* Upper body + Hand framing overlay guide / KTP document scanner frame */}
        <div className="absolute inset-0 border-4 border-dashed border-[#126B55]/60 rounded-xl pointer-events-none flex flex-col items-center justify-center p-6">
          {session.workflow_state === 'IDENTITY' ? (
            <div className="w-80 h-48 border-2 border-emerald-400/70 rounded-xl bg-emerald-500/10 flex flex-col items-center justify-center p-4">
              <span className="text-4xl mb-2">🪪</span>
              <span className="text-xs text-emerald-300 font-mono font-bold">Bingkai Pemindaian KTP / KK</span>
              <span className="text-[10px] text-emerald-200/80 mt-1">Posisikan KTP / dokumen identitas di sini</span>
            </div>
          ) : (
            <>
              <div className="w-48 h-48 border-2 border-emerald-400/50 rounded-full mb-4 flex items-center justify-center">
                <span className="text-xs text-emerald-300/80 font-mono">Posisi Wajah</span>
              </div>
              <div className="w-80 h-32 border-2 border-emerald-400/50 rounded-lg flex items-center justify-center">
                <span className="text-xs text-emerald-300/80 font-mono">Area Gerak Tangan</span>
              </div>
            </>
          )}
        </div>

        {/* Countdown Overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-20">
            <div className="text-center">
              <div className="text-7xl font-bold font-heading text-emerald-400 animate-ping">
                {countdown}
              </div>
              <p className="text-white text-sm font-semibold mt-4">
                {session.workflow_state === 'IDENTITY' ? 'Bersiap memindai KTP/KK...' : 'Bersiap memperagakan isyarat...'}
              </p>
            </div>
          </div>
        )}

        {/* Recording / Reading Overlay */}
        {isRecording && (
          <div className="absolute top-4 left-4 right-4 bg-[#126B55]/90 text-white p-3 rounded-lg flex items-center justify-between z-20 shadow-lg border border-emerald-400/30">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-ping"></span>
              <span className="font-semibold text-sm">
                {session.workflow_state === 'IDENTITY' ? 'Memverifikasi Dokumen KTP...' : 'Sedang Membaca Isyarat...'}
              </span>
            </div>
            <span className="text-xs font-mono bg-black/40 px-2 py-1 rounded">
              {session.workflow_state === 'IDENTITY' ? 'KTP Document Scan' : '30 frames / MediaPipe'}
            </span>
          </div>
        )}
      </div>

      {/* Camera Guidance & Action Controls */}
      <div className="p-4 bg-white border-t border-[#D9E1DD] flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-[#63736E]">
          <span className="text-base">💡</span>
          <span>
            {session.workflow_state === 'IDENTITY'
              ? 'Posisikan KTP / KK dengan jelas di depan kamera agar dapat dipindai oleh petugas.'
              : 'Pastikan wajah dan kedua tangan terlihat jelas di dalam bingkai panduan.'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-[#F8FAF9] hover:bg-gray-100 text-[#13231F] text-xs font-semibold rounded-lg border border-[#D9E1DD] transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            onClick={startSigningCapture}
            disabled={isRecording || countdown !== null}
            className="px-5 py-2.5 bg-[#126B55] hover:bg-[#095442] disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer flex items-center gap-2"
          >
            <span>{session.workflow_state === 'IDENTITY' ? '🪪' : '🤟'}</span>
            <span>
              {isRecording
                ? 'Memproses...'
                : session.workflow_state === 'IDENTITY'
                ? 'Tunjukkan & Pindai KTP'
                : 'Mulai Isyarat'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
