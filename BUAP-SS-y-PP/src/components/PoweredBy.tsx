import React from 'react';

export function PoweredBy() {
  return (
    <div className="fixed bottom-6 right-8 flex items-center gap-2 pointer-events-none select-none z-50">
      <span className="text-[10px] uppercase tracking-[0.15em] font-medium text-black/40">
        Powered by
      </span>
      <div className="flex items-center gap-1.5 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300 pointer-events-auto">
        <img 
          src="/logo-evangelista.png" 
          alt="Evangelista & Co Logo" 
          className="h-5 w-auto object-contain"
        />
        <span className="text-xs font-semibold tracking-tight text-black">
          Evangelista <span className="font-light">&</span> Co
        </span>
      </div>
    </div>
  );
}
