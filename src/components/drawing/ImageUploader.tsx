import { Upload } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';

interface ImageUploaderProps {
  onImageUpload: (imageUrl: string) => void;
  hasImage: boolean;
}

export const ImageUploader = ({ onImageUpload, hasImage }: ImageUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        onImageUpload(result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-toolbar-foreground/70 uppercase tracking-wider mb-3">
        圖片
      </h3>
      <input
        type="file"
        ref={inputRef}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <Button
        variant="outline"
        size="sm"
        className="w-full bg-white/5 border-white/20 hover:bg-white/10 text-toolbar-foreground"
        onClick={() => inputRef.current?.click()}
      >
        <Upload size={16} className="mr-2" />
        {hasImage ? '更換圖片' : '上傳圖片'}
      </Button>
    </div>
  );
};
