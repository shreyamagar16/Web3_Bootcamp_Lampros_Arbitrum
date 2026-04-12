import { WalletButton } from '@/components/wallet-button';
import { ERC721InteractionPanel } from '@/lib/erc721-stylus/src';

export default function Home() {
  return (
    <main className="min-h-screen w-full max-w-none px-3 py-4 sm:px-5 lg:px-6 xl:px-8 2xl:px-10">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5">
        <header className="rounded-xl border border-brandBlue-400 bg-white/85 px-4 py-3 shadow-md shadow-brandBlue-900/10 sm:flex sm:items-center sm:justify-between sm:gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-brandBlue-900 sm:text-3xl">
              My DApp
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              A Web3 application built with Cradle
            </p>
          </div>
          <div className="mt-3 flex shrink-0 justify-start sm:mt-0 sm:justify-end">
            <WalletButton />
          </div>
        </header>

        <section className="w-full max-w-none text-left">
          <ERC721InteractionPanel />
        </section>
      </div>
    </main>
  );
}