'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import {
  BadgePercent,
  Send,
  Flame,
  RefreshCw,
  Check,
  Wallet,
  AlertCircle,
  ExternalLink,
  Loader2,
  User,
  CheckCircle2,
  Globe,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from './cn';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './Select';
import { useAccount, useSwitchChain } from 'wagmi';
import { arbitrum, arbitrumSepolia } from 'viem/chains';
import type { Chain } from 'viem';
import { EIP2981_ABI, DEFAULT_EIP2981_ADDRESSES } from './constants';

const superposition: Chain = {
  id: 55244,
  name: 'Superposition',
  nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
  rpcUrls: { default: { http: ['https://rpc.superposition.so'] } },
  blockExplorers: { default: { name: 'Explorer', url: 'https://explorer.superposition.so' } },
};

const superpositionTestnet: Chain = {
  id: 98985,
  name: 'Superposition Testnet',
  nativeCurrency: { decimals: 18, name: 'SPN', symbol: 'SPN' },
  rpcUrls: { default: { http: ['https://testnet-rpc.superposition.so'] } },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://testnet-explorer.superposition.so' },
  },
  testnet: true,
};

const robinhoodTestnet: Chain = {
  id: 46630,
  name: 'Robinhood Chain Testnet',
  nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
  rpcUrls: { default: { http: ['https://rpc.testnet.chain.robinhood.com'] } },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://explorer.testnet.chain.robinhood.com' },
  },
  testnet: true,
};

const NETWORKS = {
  'arbitrum-sepolia': {
    name: 'Arbitrum Sepolia',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    explorerUrl: 'https://sepolia.arbiscan.io',
    chainId: arbitrumSepolia.id,
    chain: arbitrumSepolia,
  },
  arbitrum: {
    name: 'Arbitrum One',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
    chainId: arbitrum.id,
    chain: arbitrum,
  },
  superposition: {
    name: 'Superposition',
    rpcUrl: 'https://rpc.superposition.so',
    explorerUrl: 'https://explorer.superposition.so',
    chainId: 55244,
    chain: superposition,
  },
  'superposition-testnet': {
    name: 'Superposition Testnet',
    rpcUrl: 'https://testnet-rpc.superposition.so',
    explorerUrl: 'https://testnet-explorer.superposition.so',
    chainId: 98985,
    chain: superpositionTestnet,
  },
  'robinhood-testnet': {
    name: 'Robinhood Chain Testnet',
    rpcUrl: 'https://rpc.testnet.chain.robinhood.com',
    explorerUrl: 'https://explorer.testnet.chain.robinhood.com',
    chainId: 46630,
    chain: robinhoodTestnet,
  },
} as const;

interface ChainLogos {
  arbitrum?: string;
  superposition?: string;
  robinhood?: string;
}

export interface EIP2981InteractionPanelProps {
  contractAddress?: string;
  network?: keyof typeof NETWORKS;
  logos?: ChainLogos;
}

const NETWORK_IDS = [
  'arbitrum',
  'arbitrum-sepolia',
  'superposition',
  'superposition-testnet',
  'robinhood-testnet',
] as const;

function getLogoForNetwork(net: (typeof NETWORK_IDS)[number], logos?: ChainLogos): string | undefined {
  if (!logos) return undefined;
  if (net.includes('arbitrum')) return logos.arbitrum;
  if (net.includes('superposition')) return logos.superposition;
  if (net.includes('robinhood')) return logos.robinhood;
  return undefined;
}

interface TxStatus {
  status: 'idle' | 'pending' | 'success' | 'error';
  message: string;
  hash?: string;
}

const BOX =
  'rounded-xl border border-brandBlue-300 bg-white p-4 shadow-md shadow-brandBlue-900/10';
const INPUT =
  'w-full rounded-lg border border-brandBlue-300 bg-brandBlue-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-brandBlue-600 focus:outline-none focus:ring-2 focus:ring-brandBlue-400/35';
const BTN =
  'w-full rounded-lg py-2.5 text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-50';
const GRID_WRITE =
  'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 xl:items-stretch';
const GRID_READ =
  'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 xl:items-stretch';
const OP_CARD = 'flex h-full min-h-[19rem] flex-col gap-3 xl:min-h-[21rem]';
const OP_MAIN = 'flex min-h-0 flex-1 flex-col gap-3';
const OP_FOOTER = 'mt-auto shrink-0 pt-0.5';

/** Normalize user input to 0x-prefixed 4-byte hex for supportsInterface */
function toBytes4Hex(id: string): string {
  const t = id.trim().toLowerCase().replace(/^0x/, '');
  const padded = t.padStart(8, '0').slice(0, 8);
  return `0x${padded}`;
}

export function EIP2981InteractionPanel({
  contractAddress: initialAddress,
  network: initialNetwork = 'arbitrum-sepolia',
  logos,
}: EIP2981InteractionPanelProps) {
  const [selectedNetwork, setSelectedNetwork] = useState<keyof typeof NETWORKS>(initialNetwork);
  const [contractAddress, setContractAddress] = useState(
    initialAddress || DEFAULT_EIP2981_ADDRESSES[initialNetwork] || ''
  );
  const [showCustomContract, setShowCustomContract] = useState(false);
  const [customAddress, setCustomAddress] = useState('');
  const [defaultRoyaltyLabel, setDefaultRoyaltyLabel] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<TxStatus>({ status: 'idle', message: '' });
  const [customAddressError, setCustomAddressError] = useState<string | null>(null);
  const [isValidatingContract, setIsValidatingContract] = useState(false);

  const [lookupNft, setLookupNft] = useState('');
  const [lookupSaleEth, setLookupSaleEth] = useState('');
  const [lookupResult, setLookupResult] = useState<string | null>(null);

  const [setRoyNft, setSetRoyNft] = useState('');
  const [setRoyRecv, setSetRoyRecv] = useState('');
  const [setRoyBps, setSetRoyBps] = useState('');
  const [defRecv, setDefRecv] = useState('');
  const [defBps, setDefBps] = useState('');
  const [removeNft, setRemoveNft] = useState('');
  const [ifaceId, setIfaceId] = useState('0x2a55205a');
  const [ifaceResult, setIfaceResult] = useState<boolean | null>(null);

  const [readRoyNft, setReadRoyNft] = useState('');
  const [readRoyResult, setReadRoyResult] = useState<string | null>(null);
  const [riNft, setRiNft] = useState('');
  const [riSale, setRiSale] = useState('');
  const [riResult, setRiResult] = useState<string | null>(null);

  const networkConfig = NETWORKS[selectedNetwork];
  const rpcUrl = networkConfig.rpcUrl;
  const explorerUrl = networkConfig.explorerUrl;

  const { address: userAddress, isConnected: walletConnected, chain: currentChain } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  const defaultAddr = DEFAULT_EIP2981_ADDRESSES[selectedNetwork];
  const isUsingDefaultContract = defaultAddr && contractAddress === defaultAddr;
  const hasDefaultContract = !!defaultAddr;

  useEffect(() => {
    const d = DEFAULT_EIP2981_ADDRESSES[selectedNetwork];
    if (d && (isUsingDefaultContract || !initialAddress)) {
      setContractAddress(d);
    } else if (!d && !initialAddress) {
      setContractAddress('');
    }
  }, [selectedNetwork]);

  const validateContract = async (address: string): Promise<boolean> => {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const code = await provider.getCode(address);
      return code !== '0x' && code.length > 2;
    } catch {
      return false;
    }
  };

  const handleUseCustomContract = async () => {
    if (!customAddress || !ethers.isAddress(customAddress)) {
      setCustomAddressError('Invalid address format');
      return;
    }
    setIsValidatingContract(true);
    setCustomAddressError(null);
    const ok = await validateContract(customAddress);
    if (!ok) {
      setCustomAddressError('Address is not a contract');
      setIsValidatingContract(false);
      return;
    }
    setContractAddress(customAddress);
    setIsValidatingContract(false);
  };

  const handleUseDefaultContract = () => {
    setContractAddress(DEFAULT_EIP2981_ADDRESSES[selectedNetwork] || '');
    setCustomAddress('');
    setCustomAddressError(null);
    setShowCustomContract(false);
  };

  const getReadContract = useCallback(() => {
    if (!contractAddress || !rpcUrl) return null;
    return new ethers.Contract(contractAddress, EIP2981_ABI, new ethers.JsonRpcProvider(rpcUrl));
  }, [contractAddress, rpcUrl]);

  const getWriteContract = useCallback(async () => {
    if (!contractAddress) throw new Error('No contract address specified');
    if (!walletConnected) throw new Error('Please connect your wallet first');
    const ethereum = (window as unknown as { ethereum?: ethers.Eip1193Provider }).ethereum;
    if (!ethereum) throw new Error('No wallet detected. Please install MetaMask.');

    const targetChainIdHex = `0x${networkConfig.chainId.toString(16)}`;
    if (currentChain?.id !== networkConfig.chainId) {
      try {
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: targetChainIdHex }],
        });
      } catch (switchError: unknown) {
        const err = switchError as { code?: number; message?: string };
        if (
          err.code === 4902 ||
          err.message?.includes('Unrecognized chain') ||
          err.message?.includes('wallet_addEthereumChain')
        ) {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: targetChainIdHex,
                chainName: networkConfig.name,
                nativeCurrency: networkConfig.chain.nativeCurrency,
                rpcUrls: [networkConfig.rpcUrl],
                blockExplorerUrls: [networkConfig.explorerUrl],
              },
            ],
          });
        } else if (err.code === 4001) {
          throw new Error('User rejected chain switch');
        } else {
          throw switchError;
        }
      }
    }

    const provider = new ethers.BrowserProvider(ethereum);
    const signer = await provider.getSigner();
    return new ethers.Contract(contractAddress, EIP2981_ABI, signer);
  }, [contractAddress, walletConnected, currentChain?.id, networkConfig]);

  const fetchRegistryInfo = useCallback(async () => {
    const c = getReadContract();
    if (!c) return;
    try {
      const [recv, bps] = await c.getRoyaltyInfo(ethers.ZeroAddress);
      const b = BigInt(bps.toString());
      if (b === 0n && recv === ethers.ZeroAddress) {
        setDefaultRoyaltyLabel('No default set');
      } else {
        const pct = Number(b) / 100;
        setDefaultRoyaltyLabel(
          `${pct.toFixed(2)}% · receiver ${String(recv).slice(0, 6)}…${String(recv).slice(-4)}`
        );
      }
    } catch {
      setDefaultRoyaltyLabel(null);
    }
  }, [getReadContract]);

  useEffect(() => {
    if (contractAddress && rpcUrl) void fetchRegistryInfo();
  }, [contractAddress, rpcUrl, fetchRegistryInfo]);

  const handleTransaction = async (
    operation: () => Promise<ethers.TransactionResponse>,
    successMessage: string
  ) => {
    if (txStatus.status === 'pending') return;
    if (!walletConnected) {
      setTxStatus({ status: 'error', message: 'Please connect your wallet first' });
      setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
      return;
    }
    try {
      setTxStatus({ status: 'pending', message: 'Confirming...' });
      const tx = await operation();
      setTxStatus({ status: 'pending', message: 'Waiting for confirmation...', hash: tx.hash });
      await tx.wait();
      setTxStatus({ status: 'success', message: successMessage, hash: tx.hash });
      void fetchRegistryInfo();
    } catch (error: unknown) {
      const err = error as { reason?: string; message?: string; shortMessage?: string };
      setTxStatus({
        status: 'error',
        message: err.reason || err.message || err.shortMessage || 'Transaction failed',
      });
    }
    setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
  };

  return (
    <div className="w-full space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div
          className={cn(
            BOX,
            'border-purple-300 bg-gradient-to-br from-purple-50 via-white to-purple-50/80 shadow-purple-900/10'
          )}
        >
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-purple-700">Registry</p>
          <div className="flex items-start gap-2">
            <BadgePercent className="mt-0.5 h-5 w-5 shrink-0 text-purple-600" />
            <div>
              <p className="text-sm font-semibold text-purple-900">Royalty Registry (EIP-2981)</p>
              {defaultRoyaltyLabel && (
                <p className="mt-1 text-xs text-purple-800">Default: {defaultRoyaltyLabel}</p>
              )}
            </div>
          </div>
        </div>

        <div
          className={cn(
            BOX,
            walletConnected
              ? 'border-emerald-400/80 bg-emerald-50/50'
              : 'border-amber-400/80 bg-amber-50/50'
          )}
        >
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Wallet</p>
          <div className="flex items-start gap-2">
            <Wallet
              className={cn('mt-0.5 h-5 w-5 shrink-0', walletConnected ? 'text-emerald-700' : 'text-amber-700')}
            />
            {walletConnected ? (
              <span className="text-sm text-slate-800">
                Connected{' '}
                <code className="font-mono text-emerald-800">
                  {userAddress?.slice(0, 6)}...{userAddress?.slice(-4)}
                </code>
              </span>
            ) : (
              <span className="text-sm text-slate-700">Connect your wallet for writes.</span>
            )}
          </div>
        </div>

        <div className={cn(BOX, 'sm:col-span-2 xl:col-span-1')}>
          <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <Globe className="h-4 w-4 text-brandBlue-700" /> Network
          </label>
          <Select
            value={selectedNetwork}
            onValueChange={(v) => setSelectedNetwork(v as keyof typeof NETWORKS)}
          >
            <SelectTrigger className="h-10 w-full text-sm">
              <SelectValue>
                <div className="flex items-center gap-2">
                  {getLogoForNetwork(selectedNetwork, logos) && (
                    <img
                      src={getLogoForNetwork(selectedNetwork, logos)}
                      alt=""
                      width={16}
                      height={16}
                      className="rounded"
                    />
                  )}
                  <span>{NETWORKS[selectedNetwork].name}</span>
                  {NETWORKS[selectedNetwork].chain.testnet && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">
                      Testnet
                    </span>
                  )}
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {NETWORK_IDS.map((net) => (
                <SelectItem key={net} value={net}>
                  <div className="flex items-center gap-2">
                    {getLogoForNetwork(net, logos) && (
                      <img src={getLogoForNetwork(net, logos)} alt="" width={16} height={16} className="rounded" />
                    )}
                    <span>{NETWORKS[net].name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className={cn(BOX, 'space-y-3')}>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Contract</p>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brandBlue-300 bg-brandBlue-100/50 px-3 py-2">
          {contractAddress && (
            <a
              href={`${explorerUrl}/address/${contractAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-mono font-medium text-brandBlue-800 hover:underline"
            >
              {contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowCustomContract(!showCustomContract)}
          className="flex w-full items-center justify-between rounded-lg border border-brandBlue-300 bg-brandBlue-50 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-brandBlue-100"
        >
          <span>Use custom contract</span>
          {showCustomContract ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showCustomContract && (
          <div className="space-y-2 rounded-lg border border-brandBlue-300 bg-brandBlue-50/70 p-3">
            <input
              type="text"
              value={customAddress}
              onChange={(e) => {
                setCustomAddress(e.target.value);
                setCustomAddressError(null);
              }}
              placeholder="0x..."
              className={cn(INPUT, customAddressError && 'border-red-400')}
            />
            {customAddressError && <p className="text-xs text-red-600">{customAddressError}</p>}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleUseCustomContract()}
                disabled={!customAddress || isValidatingContract}
                className={cn(BTN, 'flex-1 bg-brandBlue-700 hover:bg-brandBlue-600')}
              >
                {isValidatingContract ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Use custom'}
              </button>
              {hasDefaultContract && (
                <button
                  type="button"
                  onClick={handleUseDefaultContract}
                  className={cn(BTN, 'flex-1 bg-slate-500 hover:bg-slate-600')}
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => void fetchRegistryInfo()}
          className={cn(BTN, 'flex items-center justify-center gap-1.5 bg-brandBlue-700 hover:bg-brandBlue-600')}
        >
          <RefreshCw className="h-4 w-4" /> Refresh contract data
        </button>
      </div>

      {!contractAddress && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
          <span>
            <span className="font-semibold">No contract address set.</span> Paste a deployed contract address
            using &quot;Use custom contract&quot; above to interact with it, or deploy a new one first.
          </span>
        </div>
      )}

      {walletConnected && currentChain?.id !== networkConfig.chainId && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-400 bg-amber-50 px-4 py-3 shadow-sm">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
          <div className="flex-1 text-sm text-amber-900">
            <span className="font-semibold">Wrong network.</span> Switch to{' '}
            <span className="font-mono">{networkConfig.name}</span>.
          </div>
          <button
            type="button"
            onClick={async () => {
              if (!switchChainAsync) return;
              try {
                await switchChainAsync({ chainId: networkConfig.chainId });
              } catch {
                /* noop */
              }
            }}
            className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-400"
          >
            Switch network
          </button>
        </div>
      )}

      {txStatus.status !== 'idle' && (
        <div
          className={cn(
            'fixed bottom-6 right-6 z-50 flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-xl transition-all',
            txStatus.status === 'pending' && 'border-brandBlue-400 bg-brandBlue-900 text-white',
            txStatus.status === 'success' && 'border-emerald-400 bg-emerald-900 text-white',
            txStatus.status === 'error' && 'border-red-400 bg-red-900 text-white'
          )}
        >
          {txStatus.status === 'pending' && (
            <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-brandBlue-300" />
          )}
          {txStatus.status === 'success' && <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />}
          {txStatus.status === 'error' && <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{txStatus.message}</p>
            {txStatus.hash && (
              <a
                href={`${explorerUrl}/tx/${txStatus.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 flex items-center gap-1 text-xs opacity-80 hover:underline"
              >
                View on explorer <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      )}

      <div className={cn(BOX, 'space-y-3')}>
          <h2 className="flex items-center gap-2 border-b border-purple-300 pb-2 text-lg font-bold text-purple-900">
            <BadgePercent className="h-5 w-5 text-purple-600" />
            Royalty lookup
          </h2>
          <input
            type="text"
            value={lookupNft}
            onChange={(e) => setLookupNft(e.target.value)}
            placeholder="NFT contract address"
            className={INPUT}
          />
          <input
            type="text"
            value={lookupSaleEth}
            onChange={(e) => setLookupSaleEth(e.target.value)}
            placeholder="Sale price (ETH)"
            className={INPUT}
          />
          <button
            type="button"
            disabled={!contractAddress}
            onClick={async () => {
              const c = getReadContract();
              if (!c || !lookupNft) return;
              try {
                const wei = ethers.parseEther(lookupSaleEth || '0');
                const [recv, amt] = await c.royaltyInfo(lookupNft, wei);
                const pct =
                  lookupSaleEth && parseFloat(lookupSaleEth) > 0
                    ? ((100 * Number(ethers.formatEther(amt))) / parseFloat(lookupSaleEth)).toFixed(2)
                    : '—';
                setLookupResult(
                  `Receiver: ${recv}\nRoyalty: ${ethers.formatEther(amt)} ETH\n≈ ${pct}% of sale`
                );
              } catch {
                setLookupResult(null);
              }
            }}
            className={cn(BTN, 'bg-brandBlue-700 hover:bg-brandBlue-600')}
          >
            Calculate royalty
          </button>
          {lookupResult && (
            <pre className="whitespace-pre-wrap rounded-lg border border-brandBlue-200 bg-brandBlue-50/80 p-3 text-xs text-slate-900">
              {lookupResult}
            </pre>
          )}
        </div>

      {walletConnected && (
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 border-b border-purple-300 pb-2 text-lg font-bold text-purple-900">
            <Send className="h-5 w-5 text-purple-600" />
            Write operations
          </h2>
          <div className={GRID_WRITE}>
            <div className={cn(BOX, OP_CARD)}>
              <span className="text-base font-semibold text-slate-900">Set royalty for contract</span>
              <div className={OP_MAIN}>
                <p className="text-xs text-slate-600">100 bps = 1%. Owner only.</p>
                <input type="text" value={setRoyNft} onChange={(e) => setSetRoyNft(e.target.value)} placeholder="NFT contract" className={INPUT} />
                <input type="text" value={setRoyRecv} onChange={(e) => setSetRoyRecv(e.target.value)} placeholder="Receiver" className={INPUT} />
                <input type="text" value={setRoyBps} onChange={(e) => setSetRoyBps(e.target.value)} placeholder="Basis points (0–10000)" className={INPUT} />
              </div>
              <div className={OP_FOOTER}>
                <button
                  type="button"
                  disabled={!contractAddress || txStatus.status === 'pending'}
                  onClick={async () => {
                    try {
                      const c = await getWriteContract();
                      await handleTransaction(
                        () => c.setRoyalty(setRoyNft, setRoyRecv, BigInt(setRoyBps || '0')),
                        'Royalty set'
                      );
                    } catch (e: unknown) {
                      setTxStatus({ status: 'error', message: e instanceof Error ? e.message : 'Failed' });
                      setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
                    }
                  }}
                  className={cn(BTN, 'bg-brandBlue-700 hover:bg-brandBlue-600')}
                >
                  Set royalty
                </button>
              </div>
            </div>

            <div className={cn(BOX, OP_CARD)}>
              <span className="text-base font-semibold text-slate-900">Set default royalty</span>
              <div className={OP_MAIN}>
                <input type="text" value={defRecv} onChange={(e) => setDefRecv(e.target.value)} placeholder="Receiver" className={INPUT} />
                <input type="text" value={defBps} onChange={(e) => setDefBps(e.target.value)} placeholder="Basis points" className={INPUT} />
              </div>
              <div className={OP_FOOTER}>
                <button
                  type="button"
                  disabled={!contractAddress || txStatus.status === 'pending'}
                  onClick={async () => {
                    try {
                      const c = await getWriteContract();
                      await handleTransaction(
                        () => c.setDefaultRoyalty(defRecv, BigInt(defBps || '0')),
                        'Default royalty set'
                      );
                    } catch (e: unknown) {
                      setTxStatus({ status: 'error', message: e instanceof Error ? e.message : 'Failed' });
                      setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
                    }
                  }}
                  className={cn(BTN, 'bg-brandBlue-700 hover:bg-brandBlue-600')}
                >
                  Set default
                </button>
              </div>
            </div>

            <div className={cn(BOX, OP_CARD, 'border-red-300/90 bg-red-50/40')}>
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-red-700" />
                <span className="text-base font-semibold text-slate-900">Remove royalty</span>
              </div>
              <div className={OP_MAIN}>
                <input type="text" value={removeNft} onChange={(e) => setRemoveNft(e.target.value)} placeholder="NFT contract" className={INPUT} />
              </div>
              <div className={OP_FOOTER}>
                <button
                  type="button"
                  disabled={!contractAddress || txStatus.status === 'pending'}
                  onClick={async () => {
                    try {
                      const c = await getWriteContract();
                      await handleTransaction(() => c.removeRoyalty(removeNft), 'Removed');
                    } catch (e: unknown) {
                      setTxStatus({ status: 'error', message: e instanceof Error ? e.message : 'Failed' });
                      setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
                    }
                  }}
                  className={cn(BTN, 'bg-red-600 hover:bg-red-500')}
                >
                  Remove
                </button>
              </div>
            </div>

            <div className={cn(BOX, OP_CARD)}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-brandBlue-800" />
                <span className="text-base font-semibold text-slate-900">Check interface support</span>
              </div>
              <div className={OP_MAIN}>
                <input type="text" value={ifaceId} onChange={(e) => setIfaceId(e.target.value)} placeholder="0x2a55205a" className={INPUT} />
                {ifaceResult !== null && (
                  <p className="text-sm font-semibold text-slate-900">{ifaceResult ? 'true' : 'false'}</p>
                )}
              </div>
              <div className={OP_FOOTER}>
                <button
                  type="button"
                  disabled={!contractAddress || txStatus.status === 'pending'}
                  onClick={async () => {
                    const c = getReadContract();
                    if (!c) return;
                    try {
                      const b4 = toBytes4Hex(ifaceId);
                      const r = await c.supportsInterface(b4);
                      setIfaceResult(Boolean(r));
                    } catch {
                      setIfaceResult(null);
                    }
                  }}
                  className={cn(BTN, 'bg-brandBlue-700 hover:bg-brandBlue-600')}
                >
                  Check
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
          <h2 className="flex items-center gap-2 border-b border-purple-300 pb-2 text-lg font-bold text-purple-900">
            <User className="h-5 w-5 text-purple-600" />
            Read operations
          </h2>
          <div className={GRID_READ}>
            <div className={cn(BOX, OP_CARD)}>
              <span className="text-base font-semibold text-slate-900">Get royalty config</span>
              <div className={OP_MAIN}>
                <input type="text" value={readRoyNft} onChange={(e) => setReadRoyNft(e.target.value)} placeholder="NFT contract" className={INPUT} />
                {readRoyResult && (
                  <pre className="max-h-40 overflow-auto rounded border border-brandBlue-200 bg-brandBlue-50/60 p-2 text-xs text-slate-900">
                    {readRoyResult}
                  </pre>
                )}
              </div>
              <div className={OP_FOOTER}>
                <button
                  type="button"
                  disabled={!contractAddress}
                  onClick={async () => {
                    const c = getReadContract();
                    if (!c || !readRoyNft) return;
                    try {
                      const [recv, bps] = await c.getRoyaltyInfo(readRoyNft);
                      const b = BigInt(bps.toString());
                      setReadRoyResult(
                        `Receiver: ${recv}\nBps: ${b.toString()}\nPercent: ${(Number(b) / 100).toFixed(2)}%`
                      );
                    } catch {
                      setReadRoyResult(null);
                    }
                  }}
                  className={cn(BTN, 'bg-brandBlue-600 hover:bg-brandBlue-500')}
                >
                  Read config
                </button>
              </div>
            </div>

            <div className={cn(BOX, OP_CARD)}>
              <span className="text-base font-semibold text-slate-900">Royalty info</span>
              <div className={OP_MAIN}>
                <input type="text" value={riNft} onChange={(e) => setRiNft(e.target.value)} placeholder="NFT contract" className={INPUT} />
                <input type="text" value={riSale} onChange={(e) => setRiSale(e.target.value)} placeholder="Sale price (ETH)" className={INPUT} />
                {riResult && (
                  <pre className="max-h-40 overflow-auto rounded border border-brandBlue-200 bg-brandBlue-50/60 p-2 text-xs text-slate-900">
                    {riResult}
                  </pre>
                )}
              </div>
              <div className={OP_FOOTER}>
                <button
                  type="button"
                  disabled={!contractAddress}
                  onClick={async () => {
                    const c = getReadContract();
                    if (!c || !riNft) return;
                    try {
                      const wei = ethers.parseEther(riSale || '0');
                      const [recv, amt] = await c.royaltyInfo(riNft, wei);
                      setRiResult(`Receiver: ${recv}\nAmount: ${ethers.formatEther(amt)} ETH`);
                    } catch {
                      setRiResult(null);
                    }
                  }}
                  className={cn(BTN, 'bg-brandBlue-600 hover:bg-brandBlue-500')}
                >
                  Query royaltyInfo
                </button>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}
