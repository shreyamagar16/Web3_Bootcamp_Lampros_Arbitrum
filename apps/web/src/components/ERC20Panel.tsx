'use client';

import { Clock, Coins, Construction } from 'lucide-react';
import { cn } from '@/lib/utils';

const BOX =
  'rounded-xl border border-brandBlue-300 bg-white p-4 shadow-md shadow-brandBlue-900/10';

export function ERC20Panel() {
  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brandBlue-100 text-brandBlue-800">
          <Coins className="h-5 w-5" aria-hidden />
        </div>
        <h2 className="text-lg font-bold text-brandBlue-900">
          ERC-20 Fungible Token
        </h2>
      </div>

      <div
        className={cn(
          BOX,
          'flex flex-col items-center gap-4 py-10 text-center sm:flex-row sm:text-left'
        )}
      >
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
          <Construction className="h-7 w-7" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center justify-center gap-2 text-sm font-medium text-slate-800 sm:justify-start">
            <Clock className="h-4 w-4 shrink-0 text-brandBlue-700" aria-hidden />
            ERC-20 interactions coming in the next update
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Transfer, approve, and allowance tooling will land here soon.
          </p>
        </div>
      </div>
    </div>
  );
}
