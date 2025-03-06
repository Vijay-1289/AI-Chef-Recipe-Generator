
import React, { useState, useRef } from "react";
import { Upload, ImageIcon, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ImageUploaderProps {
  onImageUpload: (file: File, previewUrl: string) => void;
  isProcessing: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, isProcessing }) => {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFile = (file: File) => {
    // Check if file is an image
    if (!file.type.match('image.*')) {
      toast.error("Please upload an image file");
      return;
    }

    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File is too large. Please upload an image less than 10MB");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    onImageUpload(file, previewUrl);
  };

  return (
    <div 
      className={`w-full max-w-2xl mx-auto transition-all duration-300 ease-in-out ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
      onDragEnter={handleDrag}
    >
      <input 
        ref={fileInputRef}
        type="file" 
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
      
      <div 
        className={`image-upload-area flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl
          ${dragActive ? 'border-primary bg-primary/5' : 'border-border'}
          hover:border-primary/50 hover:bg-secondary/50 transition-all duration-300`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center animate-float">
            <ImageIcon className="w-8 h-8 text-primary/80" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-serif font-semibold tracking-tight">
              Upload a Food Image
            </h3>
            <p className="text-muted-foreground max-w-xs">
              Drop an image of a dish you'd like to cook, and our AI will generate a recipe for you
            </p>
          </div>
          
          <Button 
            onClick={handleButtonClick} 
            className="mt-4 relative overflow-hidden group"
            disabled={isProcessing}
          >
            <span className="relative z-10 flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Select Image
            </span>
            <span className="absolute inset-0 bg-primary/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></span>
          </Button>
          
          {isProcessing && (
            <div className="flex items-center gap-2 mt-2 text-muted-foreground animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Processing image...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageUploader;
