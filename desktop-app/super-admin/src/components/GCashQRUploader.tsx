import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { supabase } from '../lib/supabase';
import { UploadCloud, Check } from 'lucide-react';

interface Props {
  value: string;
  onChange: (url: string) => void;
}

export const GCashQRUploader: React.FC<Props> = ({ value, onChange }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => setImageSrc(reader.result as string));
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createCroppedImage = async (): Promise<Blob> => {
    const image = new Image();
    image.src = imageSrc!;
    await new Promise((resolve) => (image.onload = resolve));
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = croppedAreaPixels.width;
    canvas.height = croppedAreaPixels.height;
    ctx.drawImage(
      image,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      croppedAreaPixels.width,
      croppedAreaPixels.height
    );
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas is empty'));
      }, 'image/jpeg', 0.95);
    });
  };

  const handleSaveCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
      setUploading(true);
      const blob = await createCroppedImage();
      const fileName = "gcash-qr-" + Date.now() + ".jpg";
      
      const { error } = await supabase.storage
        .from('system-assets')
        .upload(fileName, blob, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from('system-assets')
        .getPublicUrl(fileName);
        
      onChange(publicUrl);
      setImageSrc(null);
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  if (imageSrc) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Crop GCash QR Code</h3>
          </div>
          <div className="relative h-96 w-full bg-black">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>
          <div className="p-4 flex items-center gap-4 bg-gray-50 border-t border-gray-200">
            <span className="text-sm font-medium text-gray-600">Zoom</span>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-blue-600"
            />
          </div>
          <div className="p-4 flex justify-end gap-3 border-t border-gray-200">
            <button
              onClick={() => setImageSrc(null)}
              disabled={uploading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveCrop}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : <><Check className="w-4 h-4" /> Save QR Code</>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {value ? (
        <div className="flex flex-col items-start gap-3">
          <div className="p-3 bg-white border border-gray-200 rounded-xl">
            <img src={value} alt="GCash QR" className="w-40 h-40 object-contain" />
          </div>
          <label className="cursor-pointer flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
            <UploadCloud className="w-4 h-4" />
            <span>Change QR Code</span>
            <input type="file" accept="image/*" onChange={onFileChange} className="hidden" />
          </label>
        </div>
      ) : (
        <label className="cursor-pointer flex flex-col items-center justify-center w-48 h-48 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
          <UploadCloud className="w-8 h-8 text-gray-400 mb-2" />
          <span className="text-sm font-medium text-gray-600">Upload QR Image</span>
          <input type="file" accept="image/*" onChange={onFileChange} className="hidden" />
        </label>
      )}
    </div>
  );
};


