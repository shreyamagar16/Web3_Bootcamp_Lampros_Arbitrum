'use client';

import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  BadgePercent,
  Coins,
  Image,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type TokenStandard = 'erc20' | 'erc721' | 'erc1155' | 'eip2981';

interface TokenStudioLandingProps {
  onSelect: (standard: TokenStandard) => void;
}

const CARDS: {
  standard: TokenStandard;
  icon: LucideIcon;
  title: string;
  description: string;
  tags: string[];
  live: boolean;
}[] = [
  {
    standard: 'erc20',
    icon: Coins,
    title: 'ERC-20 Fungible Token',
    description:
      'Deploy and interact with fungible tokens. Transfer, approve, and check allowances.',
    tags: ['#FUNGIBLE', '#TOKEN', '#TRANSFER'],
    live: false,
  },
  {
    standard: 'erc721',
    icon: Image,
    title: 'ERC-721 NFT',
    description:
      'Mint, transfer, and manage unique non-fungible tokens on Arbitrum.',
    tags: ['#NFT', '#MINT', '#UNIQUE'],
    live: true,
  },
  {
    standard: 'erc1155',
    icon: Layers,
    title: 'ERC-1155 Multi-Token',
    description:
      'Mixed fungible and non-fungible tokens in a single contract with batch operations.',
    tags: ['#MULTI', '#BATCH', '#MIXED'],
    live: false,
  },
  {
    standard: 'eip2981',
    icon: BadgePercent,
    title: 'EIP-2981 Royalties',
    description:
      'Configure on-chain royalty info for NFT secondary sales. Wraps ERC-721 or ERC-1155.',
    tags: ['#ROYALTY', '#CREATOR', '#SECONDARY'],
    live: false,
  },
];

export function TokenStudioLanding({ onSelect }: TokenStudioLandingProps) {
  return (
    <div className="w-full">
      <div className="mb-6 text-center sm:text-left">
        <h2 className="text-2xl font-bold tracking-tight text-brandBlue-900 sm:text-3xl">
          Token Studio
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Choose a token standard to get started
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {CARDS.map(
          ({ standard, icon: Icon, title, description, tags, live }) => (
            <button
              key={standard}
              type="button"
              onClick={() => onSelect(standard)}
              className={cn(
                'group relative flex w-full flex-col rounded-xl border bg-white/85 p-5 text-left shadow-md shadow-brandBlue-900/10 transition-all duration-200',
                'border-brandBlue-400 hover:-translate-y-0.5 hover:border-brandBlue-600 hover:shadow-lg',
                live && 'border-emerald-400 ring-1 ring-emerald-400/40 hover:border-emerald-500'
              )}
            >
              <span
                className={cn(
                  'absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                  live
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-900'
                )}
              >
                {live ? 'Live' : 'Coming soon'}
              </span>

              <div className="mb-4 mt-1 flex h-11 w-11 items-center justify-center rounded-lg bg-brandBlue-100 text-brandBlue-800 transition-colors group-hover:bg-brandBlue-200">
                <Icon className="h-6 w-6" aria-hidden />
              </div>

              <h3 className="pr-16 text-base font-semibold text-slate-900">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {description}
              </p>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-brandBlue-100/80 px-2 py-0.5 text-[10px] font-medium text-brandBlue-900"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <ArrowRight
                className="absolute bottom-4 right-4 h-5 w-5 text-brandBlue-600 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </button>
          )
        )}
      </div>
    </div>
  );
}
