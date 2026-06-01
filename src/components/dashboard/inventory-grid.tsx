import React from 'react';
import { cn } from '@/lib/utils';

const inventoryData = [
  {
    name: 'Arroz Blanco Grano Largo 1kg',
    sku: 'ABA-102-ARR',
    category: 'Abarrotes',
    price: '$34.50',
    stock: 450,
  },
  {
    name: 'Detergente Líquido 3L',
    sku: 'LIM-405-DET',
    category: 'Limpieza',
    price: '$185.00',
    stock: 82,
  },
  {
    name: 'Leche Deslactosada 1L',
    sku: 'LAC-002-DES',
    category: 'Lácteos',
    price: '$28.00',
    stock: 12,
  },
  {
    name: 'Frijol Pinto 1kg',
    sku: 'ABA-105-FRI',
    category: 'Abarrotes',
    price: '$42.00',
    stock: 210,
  },
  {
    name: 'Aceite Vegetal 900ml',
    sku: 'ABA-201-ACE',
    category: 'Abarrotes',
    price: '$56.00',
    stock: 15,
  },
];

export function InventoryGrid() {
  return (
    <div className="bg-surface-container-lowest/80 ghost-border ambient-shadow glass border-outline-variant/10 flex flex-col overflow-hidden rounded-3xl border transition-all duration-500">
      <div className="bg-surface-container-lowest/50 border-outline-variant/5 flex flex-col gap-6 border-b p-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-primary font-headline text-2xl font-bold tracking-tight">
              Gestión de Inventario
            </h3>
            <p className="text-on-surface-variant mt-1 text-sm opacity-70">
              Visión general y control de existencias en tiempo real.
            </p>
          </div>
          <div className="flex gap-3">
            <button className="bg-surface-container-low text-on-surface-variant border-outline-variant/20 hover:bg-surface-container-high flex h-11 items-center gap-2 rounded-xl border px-5 text-sm font-bold transition-all">
              <span className="material-symbols-outlined text-[20px]">download</span>
              EXPORT CSV
            </button>
            <button className="bg-primary text-primary-foreground shadow-primary/20 hover:bg-primary/90 flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-bold shadow-lg transition-all">
              <span className="material-symbols-outlined text-[20px]">add</span>
              NUEVO SKU
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative max-w-md grow">
            <span className="material-symbols-outlined text-on-surface-variant absolute top-1/2 left-3 -translate-y-1/2 text-[20px]">
              search
            </span>
            <input
              type="text"
              placeholder="Buscar por SKU, nombre..."
              className="bg-surface-container-lowest border-outline-variant/20 focus:border-primary/50 focus:ring-primary/5 placeholder:text-on-surface-variant/40 h-11 w-full rounded-xl border pr-4 pl-10 text-sm transition-all focus:ring-2 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            {['Categoría', 'Ubicación', 'Estado'].map((filter) => (
              <div key={filter} className="group relative">
                <select className="bg-surface-container-lowest border-outline-variant/20 text-on-surface-variant focus:border-primary/50 hover:bg-surface-container-high h-11 cursor-pointer appearance-none rounded-xl border pr-10 pl-4 text-sm transition-all focus:outline-none">
                  <option>{filter}</option>
                </select>
                <span className="material-symbols-outlined text-on-surface-variant pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[18px]">
                  expand_more
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-surface-container-low/50 border-outline-variant/5 border-b">
              <th className="text-on-surface-variant px-6 py-5 text-[10px] font-black tracking-widest uppercase opacity-60">
                Product Details
              </th>
              <th className="text-on-surface-variant px-6 py-5 text-[10px] font-black tracking-widest uppercase opacity-60">
                SKU ID
              </th>
              <th className="text-on-surface-variant px-6 py-5 text-[10px] font-black tracking-widest uppercase opacity-60">
                Classification
              </th>
              <th className="text-on-surface-variant px-6 py-5 text-right text-[10px] font-black tracking-widest uppercase opacity-60">
                Unit Price
              </th>
              <th className="text-on-surface-variant px-6 py-5 text-center text-[10px] font-black tracking-widest uppercase opacity-60">
                Stock Status
              </th>
              <th className="text-on-surface-variant px-6 py-5 text-center text-[10px] font-black tracking-widest uppercase opacity-60">
                Operations
              </th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {inventoryData.map((item, idx) => {
              const isLowStock = item.stock < 20;
              return (
                <tr
                  key={idx}
                  className={cn(
                    'hover:bg-primary/3 group border-outline-variant/5 border-b transition-all duration-300',
                    idx % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low/20',
                  )}>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-on-surface font-bold">{item.name}</span>
                      <span className="text-on-surface-variant/40 text-[10px] font-medium">
                        Standard Retail Unit
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="bg-surface-container-high text-on-surface-variant border-outline-variant/10 rounded border px-2 py-0.5 font-mono text-[11px] font-bold tracking-tighter">
                      {item.sku}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="bg-primary/10 text-primary border-primary/20 rounded-full border px-3 py-1 text-[9px] font-black tracking-wider uppercase">
                      {item.category}
                    </span>
                  </td>
                  <td className="text-on-surface px-6 py-5 text-right font-mono text-sm font-bold">
                    {item.price}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center justify-center">
                      <div
                        className={cn(
                          'flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold',
                          isLowStock ?
                            'bg-error/10 text-error border-error/20'
                          : 'bg-success/10 text-success border-success/20',
                        )}>
                        <span
                          className={cn(
                            'h-1.5 w-1.5 animate-pulse rounded-full',
                            isLowStock ? 'bg-error' : 'bg-success',
                          )}
                        />
                        {isLowStock ? 'LOW STOCK' : 'IN STOCK'}
                        <span className="font-mono opacity-40">({item.stock})</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center justify-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <button className="hover:bg-primary/10 text-on-surface-variant hover:text-primary flex h-8 w-8 items-center justify-center rounded-lg transition-all">
                        <span className="material-symbols-outlined text-[18px]">edit_note</span>
                      </button>
                      <button className="hover:bg-error/10 text-on-surface-variant hover:text-error flex h-8 w-8 items-center justify-center rounded-lg transition-all">
                        <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="bg-surface-container-high/10 p-4 text-center">
        <button className="text-primary hover:bg-primary/5 rounded-full px-6 py-2 text-[10px] font-black tracking-[0.2em] uppercase transition-all hover:tracking-[0.25em]">
          Generate Comprehensive Analytics Report
        </button>
      </div>
    </div>
  );
}
