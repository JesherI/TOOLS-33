import { RefObject } from "react";

interface AddFilesButtonProps {
  fileInputRef: RefObject<HTMLInputElement | null>;
  variant?: "primary" | "secondary";
}

export function AddFilesButton({ fileInputRef, variant = "secondary" }: AddFilesButtonProps) {
  const baseClasses = "w-full py-3 border rounded-xl transition-all duration-200";
  const variantClasses = variant === "primary" 
    ? "border-orange-500 bg-orange-500 text-black hover:bg-orange-600"
    : "border-orange-500/30 text-orange-400 hover:bg-orange-500/10";

  return (
    <button
      onClick={() => fileInputRef.current?.click()}
      className={`${baseClasses} ${variantClasses}`}
    >
      + Agregar más archivos
    </button>
  );
}
