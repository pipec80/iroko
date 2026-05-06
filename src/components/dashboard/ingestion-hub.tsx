import React from 'react';

export function IngestionHub() {
  return (
    <div className="bg-surface-container-highest border-primary-container/40 hover:bg-surface-container-low hover:border-primary-container group flex cursor-pointer flex-col items-center justify-center space-y-6 rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-300">
      <div className="bg-primary/5 rounded-full p-6 transition-transform duration-500 group-hover:scale-110">
        <span className="material-symbols-outlined text-primary/80 text-6xl">cloud_upload</span>
      </div>
      <div>
        <h3 className="text-on-surface text-xl font-bold tracking-tight">
          Carga Masiva de Productos
        </h3>
        <p className="text-on-surface-variant mx-auto mt-2 max-w-xs text-sm opacity-70">
          Optimiza tu flujo de trabajo. Arrastra y suelta tu archivo CSV o Excel aquí para
          sincronizar el inventario.
        </p>
      </div>
      <button className="bg-surface-container-lowest border-outline-variant/20 text-primary hover:border-primary rounded-lg border px-8 py-2.5 text-sm font-bold transition-all hover:shadow-sm active:scale-95">
        Explorar archivos
      </button>
    </div>
  );
}
