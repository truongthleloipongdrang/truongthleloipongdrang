import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Image as ImageIcon, Loader2 } from 'lucide-react';
import { validateHttpsImageUrl } from '../mediaHelpers';

interface ImageUrlPreviewProps {
  url: string;
  alt?: string;
  aspectClass?: string;
  compact?: boolean;
  onStatusChange?: (status: 'empty' | 'invalid' | 'loading' | 'loaded' | 'error') => void;
}

export const ImageUrlPreview: React.FC<ImageUrlPreviewProps> = ({
  url,
  alt = 'Xem trước hình ảnh',
  aspectClass = 'h-44',
  compact = false,
  onStatusChange,
}) => {
  const trimmed = (url || '').trim();
  const validation = trimmed ? validateHttpsImageUrl(trimmed) : null;
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');

  useEffect(() => {
    if (!trimmed) {
      setLoadState('idle');
      onStatusChange?.('empty');
      return;
    }
    if (!validation?.valid) {
      setLoadState('idle');
      onStatusChange?.('invalid');
      return;
    }
    setLoadState('loading');
    onStatusChange?.('loading');
  }, [trimmed, validation?.valid]);

  if (!trimmed) {
    return (
      <div
        className={`${aspectClass} w-full rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-center p-3 text-slate-400`}
      >
        <ImageIcon className={compact ? 'w-5 h-5 mb-1' : 'w-7 h-7 mb-1.5'} />
        <span className="text-[11px] font-medium">
          Dán URL ảnh HTTPS từ ImageKit.io để xem trước tự động
        </span>
      </div>
    );
  }

  if (!validation?.valid) {
    return (
      <div
        className={`${compact ? 'p-2.5' : 'p-3.5'} w-full rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs flex items-start gap-2`}
      >
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
        <div>
          <div className="font-bold">URL hình ảnh không hợp lệ</div>
          <div className="text-[11px] mt-0.5">{validation?.error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div
        className={`${aspectClass} w-full rounded-xl border overflow-hidden relative bg-slate-100 flex items-center justify-center ${
          loadState === 'error' ? 'border-red-300 bg-red-50' : 'border-slate-200'
        }`}
      >
        {loadState === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 z-10 text-slate-500 text-xs gap-1.5">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
            <span>Đang tải ảnh xem trước...</span>
          </div>
        )}

        {loadState === 'error' ? (
          <div className="p-3 text-center text-red-700 space-y-1">
            <AlertCircle className="w-6 h-6 mx-auto text-red-600" />
            <div className="text-xs font-bold">Không tải được hình ảnh từ URL này</div>
            <p className="text-[11px] text-red-600 leading-relaxed">
              Vui lòng kiểm tra lại liên kết ImageKit.io, đảm bảo URL chính xác và ảnh đang mở công khai.
            </p>
          </div>
        ) : (
          <img
            key={validation.normalizedUrl}
            src={validation.normalizedUrl}
            alt={alt}
            onLoad={() => {
              setLoadState('loaded');
              onStatusChange?.('loaded');
            }}
            onError={() => {
              setLoadState('error');
              onStatusChange?.('error');
            }}
            className="w-full h-full object-cover"
          />
        )}

        {loadState === 'loaded' && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 bg-emerald-900/85 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-xs">
              <CheckCircle2 className="w-3 h-3 text-emerald-300" />
              {validation.isImageKit ? 'ImageKit.io HTTPS' : `HTTPS (${validation.host})`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
