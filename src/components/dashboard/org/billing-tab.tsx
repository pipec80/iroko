'use client';

import React from 'react';

export function BillingTab() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 grid grid-cols-1 items-start gap-8 duration-500 lg:grid-cols-12">
      {/* Left Column: Plans & Payment (Bento Style) */}
      <div className="flex flex-col gap-8 lg:col-span-8">
        {/* Section: Plan Comparison */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-headline text-on-surface text-xl font-bold">Current Plan</h2>
            <span className="bg-surface-container-highest text-on-surface-variant rounded-full px-3 py-1 text-[10px] font-bold tracking-wider uppercase">
              Annual Billing
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Basic Plan */}
            <div className="bg-surface-container-highest hover:bg-surface-dim group ambient-shadow hover:border-outline-variant/20 relative cursor-pointer rounded-xl border border-transparent p-6 transition-colors">
              <h3 className="text-on-surface mb-1 text-lg font-bold">Basic</h3>
              <p className="text-on-surface-variant mb-4 text-sm">Single store analytics.</p>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-on-surface font-mono text-2xl font-bold">$49</span>
                <span className="text-on-surface-variant text-sm">/mo</span>
              </div>
              <ul className="text-on-surface-variant mb-6 space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-outline text-sm">check</span> 1
                  Location
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-outline text-sm">check</span>{' '}
                  Standard Reports
                </li>
              </ul>
              <button className="border-outline-variant/30 text-primary group-hover:border-primary/50 w-full rounded-md border py-2 text-sm font-bold tracking-wider uppercase transition-colors">
                Select Basic
              </button>
            </div>

            {/* Multi-store Plan (Active) */}
            <div className="bg-primary-container border-primary/20 relative rounded-xl border p-6 shadow-[0_8px_24px_rgba(49,102,109,0.12)]">
              <div className="bg-primary text-on-primary absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-black tracking-widest whitespace-nowrap uppercase">
                Current Plan
              </div>
              <h3 className="text-on-primary-container mb-1 text-lg font-bold">Multi-store</h3>
              <p className="text-on-primary-container/80 mb-4 text-sm">Regional retail chains.</p>
              <div className="text-on-primary-container mb-6 flex items-baseline gap-1">
                <span className="font-mono text-2xl font-bold">$199</span>
                <span className="text-sm opacity-80">/mo</span>
              </div>
              <ul className="text-on-primary-container/90 mb-6 space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span
                    className="material-symbols-outlined text-sm"
                    style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                  Up to 10 Locations
                </li>
                <li className="flex items-center gap-2">
                  <span
                    className="material-symbols-outlined text-sm"
                    style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                  Custom Dashboards
                </li>
                <li className="flex items-center gap-2">
                  <span
                    className="material-symbols-outlined text-sm"
                    style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                  API Access
                </li>
              </ul>
              <button className="from-primary text-on-primary w-full rounded-md bg-linear-to-r to-[#4a858d] py-2.5 text-sm font-bold tracking-widest uppercase shadow-md transition-all hover:shadow-lg active:scale-[0.98]">
                Manage Plan
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-surface-container-highest hover:bg-surface-dim group ambient-shadow hover:border-outline-variant/20 relative cursor-pointer rounded-xl border border-transparent p-6 transition-colors">
              <h3 className="text-on-surface mb-1 text-lg font-bold">Enterprise</h3>
              <p className="text-on-surface-variant mb-4 text-sm">National network scale.</p>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-on-surface font-mono text-2xl font-bold">Custom</span>
              </div>
              <ul className="text-on-surface-variant mb-6 space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-outline text-sm">check</span>{' '}
                  Unlimited Locations
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-outline text-sm">check</span>{' '}
                  Dedicated Success Mgr
                </li>
              </ul>
              <button className="border-outline-variant/30 text-primary group-hover:border-primary/50 w-full rounded-md border py-2 text-sm font-bold tracking-wider uppercase transition-colors">
                Contact Sales
              </button>
            </div>
          </div>
        </section>

        {/* Section: Payment Method */}
        <section className="bg-surface-container-highest ambient-shadow rounded-xl p-6 lg:p-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-headline text-on-surface text-xl font-bold">Payment Method</h2>
            <span className="material-symbols-outlined text-outline">lock</span>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Current Card Display */}
            <div className="bg-surface-container-lowest border-outline-variant/20 group relative overflow-hidden rounded-xl border p-5">
              <div className="bg-primary-container/20 absolute top-0 right-0 -mt-10 -mr-10 h-32 w-32 rounded-full blur-3xl transition-transform duration-700 group-hover:scale-110"></div>
              <div className="relative z-10 mb-6 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-surface-dim flex h-6 w-10 items-center justify-center rounded">
                    <span className="text-on-surface-variant text-[10px] font-black tracking-tighter uppercase">
                      Visa
                    </span>
                  </div>
                  <span className="text-on-surface text-sm font-bold">Primary Card</span>
                </div>
                <button className="text-primary text-[10px] font-black tracking-widest uppercase hover:underline active:scale-95">
                  Edit
                </button>
              </div>
              <div className="text-on-surface relative z-10 mb-2 font-mono text-xl tracking-widest">
                •••• •••• •••• 4242
              </div>
              <div className="text-on-surface-variant relative z-10 flex justify-between text-[10px] font-bold tracking-widest uppercase">
                <span>Expires 12/25</span>
                <span>Corporate Card</span>
              </div>
            </div>

            {/* Add New Card Button/Minimal Form Area */}
            <div className="flex flex-col justify-center">
              <h3 className="text-on-surface-variant mb-4 text-xs font-black tracking-widest uppercase">
                Add New Payment Method
              </h3>
              <form className="space-y-3">
                <div className="relative">
                  <span className="material-symbols-outlined text-outline-variant absolute top-1/2 left-3 -translate-y-1/2 text-[18px]">
                    credit_card
                  </span>
                  <input
                    className="bg-surface-container-lowest border-outline-variant/20 focus:border-primary focus:ring-primary placeholder:text-outline-variant/50 w-full rounded-md border py-2.5 pr-3 pl-10 font-mono text-sm transition-all outline-none focus:ring-1"
                    placeholder="0000 0000 0000 0000"
                    type="text"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className="bg-surface-container-lowest border-outline-variant/20 focus:border-primary focus:ring-primary placeholder:text-outline-variant/50 w-full rounded-md border px-3 py-2.5 font-mono text-sm transition-all outline-none focus:ring-1"
                    placeholder="MM/YY"
                    type="text"
                  />
                  <input
                    className="bg-surface-container-lowest border-outline-variant/20 focus:border-primary focus:ring-primary placeholder:text-outline-variant/50 w-full rounded-md border px-3 py-2.5 font-mono text-sm transition-all outline-none focus:ring-1"
                    placeholder="CVC"
                    type="text"
                  />
                </div>
                <button
                  className="border-outline-variant/30 text-on-surface hover:bg-surface-container-low flex w-full items-center justify-center gap-2 rounded-md border py-2.5 text-xs font-bold tracking-widest uppercase transition-all active:scale-[0.98]"
                  type="button">
                  <span className="material-symbols-outlined text-[18px]">add</span> Add Card
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>

      {/* Right Column: Billing History */}
      <div className="flex flex-col gap-6 lg:col-span-4">
        <section className="bg-surface-container-highest ambient-shadow flex flex-1 flex-col rounded-xl p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-headline text-on-surface text-xl font-bold">History</h2>
            <button className="material-symbols-outlined text-on-surface-variant hover:text-primary text-[20px] transition-colors">
              download
            </button>
          </div>

          <div className="-mx-6 flex-1 overflow-x-auto px-6">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-surface-container-high border-outline-variant/15 border-b">
                  <th className="text-on-surface-variant px-2 py-3 text-[10px] font-black tracking-widest uppercase">
                    Date
                  </th>
                  <th className="text-on-surface-variant px-2 py-3 text-right text-[10px] font-black tracking-widest uppercase">
                    Amount
                  </th>
                  <th className="text-on-surface-variant px-2 py-3 text-right text-[10px] font-black tracking-widest uppercase">
                    Invoice
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[
                  { date: '2023-10-01', amount: '199.00', status: 'Paid' },
                  { date: '2023-09-01', amount: '199.00', status: 'Paid' },
                  { date: '2023-08-01', amount: '199.00', status: 'Paid' },
                  { date: '2023-07-01', amount: '199.00', status: 'Paid' },
                  { date: '2023-06-01', amount: '49.00', status: 'Paid' },
                ].map((item, idx) => (
                  <tr
                    key={idx}
                    className={`border-outline-variant/5 hover:bg-surface-dim border-b transition-colors ${idx % 2 !== 0 ? 'bg-surface-container-low/50' : ''}`}>
                    <td className="text-on-surface-variant px-2 py-3 font-mono text-[11px]">
                      {item.date}
                    </td>
                    <td className="text-on-surface px-2 py-3 text-right font-mono text-xs font-bold">
                      ${item.amount}
                    </td>
                    <td className="px-2 py-3 text-right">
                      <button className="text-primary text-[10px] font-black tracking-widest uppercase hover:underline">
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-outline-variant/15 mt-6 border-t pt-4">
            <button className="text-primary hover:text-primary-container group flex w-full items-center justify-center gap-2 text-xs font-black tracking-widest uppercase transition-colors">
              View All Transactions
              <span className="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-1">
                arrow_forward
              </span>
            </button>
          </div>
        </section>

        {/* Help Snippet */}
        <section className="bg-surface-container-low border-outline-variant/10 ambient-shadow flex items-start gap-4 rounded-xl border p-5">
          <div className="bg-primary-container/30 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
            <span className="material-symbols-outlined text-primary text-[20px]">live_help</span>
          </div>
          <div>
            <h3 className="text-on-surface mb-1 text-sm font-bold">Billing Questions?</h3>
            <p className="text-on-surface-variant mb-3 text-[11px] leading-relaxed">
              Our support team is available 24/7 for account upgrades or inquiries.
            </p>
            <button className="text-primary text-[10px] font-black tracking-widest uppercase hover:underline active:scale-95">
              Contact Support
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
