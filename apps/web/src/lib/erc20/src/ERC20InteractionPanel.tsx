'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import {
  Coins,
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
import { ERC20_ABI, DEFAULT_ERC20_ADDRESSES } from './constants';

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

export interface ERC20InteractionPanelProps {
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

export function ERC20InteractionPanel({
  contractAddress: initialAddress,
  network: initialNetwork = 'arbitrum-sepolia',
  logos,
}: ERC20InteractionPanelProps) {
  const [selectedNetwork, setSelectedNetwork] = useState<keyof typeof NETWORKS>(initialNetwork);
  const [contractAddress, setContractAddress] = useState(
    initialAddress || DEFAULT_ERC20_ADDRESSES[initialNetwork] || ''
  );
  const [showCustomContract, setShowCustomContract] = useState(false);
  const [customAddress, setCustomAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [tokenName, setTokenName] = useState<string | null>(null);
  const [tokenSymbol, setTokenSymbol] = useState<string | null>(null);
  const [tokenDecimals, setTokenDecimals] = useState(18);
  const [totalSupplyStr, setTotalSupplyStr] = useState<string | null>(null);
  const [userTokenBalance, setUserTokenBalance] = useState<string | null>(null);
  const [isPausedState, setIsPausedState] = useState<boolean | null>(null);
  const [txStatus, setTxStatus] = useState<TxStatus>({ status: 'idle', message: '' });
  const [customAddressError, setCustomAddressError] = useState<string | null>(null);
  const [isValidatingContract, setIsValidatingContract] = useState(false);

  const [xferTo, setXferTo] = useState('');
  const [xferAmt, setXferAmt] = useState('');
  const [apprSpender, setApprSpender] = useState('');
  const [apprAmt, setApprAmt] = useState('');
  const [tfFrom, setTfFrom] = useState('');
  const [tfTo, setTfTo] = useState('');
  const [tfAmt, setTfAmt] = useState('');
  const [mintTo, setMintTo] = useState('');
  const [mintAmt, setMintAmt] = useState('');
  const [burnAmt, setBurnAmt] = useState('');

  const [readBalAddr, setReadBalAddr] = useState('');
  const [readBalResult, setReadBalResult] = useState<string | null>(null);
  const [allowOwner, setAllowOwner] = useState('');
  const [allowSpender, setAllowSpender] = useState('');
  const [allowResult, setAllowResult] = useState<string | null>(null);
  const [tsResult, setTsResult] = useState<string | null>(null);
  const [infoSummary, setInfoSummary] = useState<string | null>(null);

  const networkConfig = NETWORKS[selectedNetwork];
  const rpcUrl = networkConfig.rpcUrl;
  const explorerUrl = networkConfig.explorerUrl;

  const { address: userAddress, isConnected: walletConnected, chain: currentChain } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  const defaultAddress = DEFAULT_ERC20_ADDRESSES[selectedNetwork];
  const isUsingDefaultContract = defaultAddress && contractAddress === defaultAddress;
  const hasDefaultContract = !!defaultAddress;

  useEffect(() => {
    const d = DEFAULT_ERC20_ADDRESSES[selectedNetwork];
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
    setContractAddress(DEFAULT_ERC20_ADDRESSES[selectedNetwork] || '');
    setCustomAddress('');
    setCustomAddressError(null);
    setShowCustomContract(false);
  };

  const getReadContract = useCallback(() => {
    if (!contractAddress || !rpcUrl) return null;
    return new ethers.Contract(contractAddress, ERC20_ABI, new ethers.JsonRpcProvider(rpcUrl));
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
    return new ethers.Contract(contractAddress, ERC20_ABI, signer);
  }, [contractAddress, walletConnected, currentChain?.id, networkConfig]);

  const parseContractError = useCallback(
    (error: { message?: string; reason?: string; shortMessage?: string }): string => {
      const errorMessage = error?.message || error?.reason || String(error);
      if (errorMessage.includes('BAD_DATA') || errorMessage.includes('could not decode result data')) {
        return `Contract not found or not deployed on ${networkConfig.name}.`;
      }
      if (errorMessage.includes('call revert exception')) {
        return `Contract call failed on ${networkConfig.name}.`;
      }
      if (errorMessage.includes('network') || errorMessage.includes('connection')) {
        return 'Network connection error.';
      }
      if (errorMessage.includes('execution reverted')) {
        return `Transaction reverted: ${error?.reason || 'Unknown reason'}`;
      }
      return `Error: ${error?.reason || error?.shortMessage || errorMessage.slice(0, 100)}`;
    },
    [networkConfig.name]
  );

  const fetchContractInfo = useCallback(async () => {
    const c = getReadContract();
    if (!c) return;
    try {
      const [name, symbol, dec, ts, paused] = await Promise.all([
        c.name().catch(() => null),
        c.symbol().catch(() => null),
        c.decimals().catch(() => null),
        c.totalSupply().catch(() => null),
        c.isPaused().catch(() => null),
      ]);
      if (name === null && symbol === null && ts === null) {
        setIsConnected(false);
        return;
      }
      setTokenName(name);
      setTokenSymbol(symbol);
      const d = dec != null ? Number(dec) : 18;
      setTokenDecimals(Number.isFinite(d) ? d : 18);
      if (ts != null) {
        setTotalSupplyStr(ethers.formatUnits(ts, Number.isFinite(d) ? d : 18));
      }
      setIsPausedState(typeof paused === 'boolean' ? paused : null);
      if (userAddress) {
        try {
          const bal = await c.balanceOf(userAddress);
          setUserTokenBalance(ethers.formatUnits(bal, Number.isFinite(d) ? d : 18));
        } catch {
          setUserTokenBalance(null);
        }
      } else {
        setUserTokenBalance(null);
      }
      setIsConnected(true);
    } catch {
      setIsConnected(false);
    }
  }, [getReadContract, userAddress]);

  useEffect(() => {
    if (contractAddress && rpcUrl) void fetchContractInfo();
  }, [contractAddress, rpcUrl, fetchContractInfo]);

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
      void fetchContractInfo();
    } catch (error: unknown) {
      const err = error as { reason?: string; message?: string; shortMessage?: string };
      setTxStatus({
        status: 'error',
        message: err.reason || err.message || err.shortMessage || 'Transaction failed',
      });
    }
    setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
  };

  const dec = tokenDecimals;

  return (
    <div className="w-full space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className={cn(BOX, 'sm:col-span-1')}>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Token</p>
          <div className="flex items-start gap-2">
            <Coins className="mt-0.5 h-5 w-5 shrink-0 text-brandBlue-700" />
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {isConnected && tokenName && tokenSymbol
                  ? `${tokenName} (${tokenSymbol})`
                  : 'ERC-20 Token'}
              </p>
              {isConnected && (
                <p className="mt-1 text-xs text-slate-600">
                  Decimals: {tokenDecimals}
                  {totalSupplyStr != null && (
                    <>
                      {' '}
                      · Total supply: <span className="font-mono">{totalSupplyStr}</span>
                    </>
                  )}
                </p>
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
            <div className="min-w-0 text-sm text-slate-800">
              {walletConnected ? (
                <>
                  <code className="font-mono text-emerald-800">
                    {userAddress?.slice(0, 6)}...{userAddress?.slice(-4)}
                  </code>
                  {userTokenBalance != null && (
                    <p className="mt-1 text-xs text-slate-600">
                      Balance:{' '}
                      <span className="font-semibold text-brandBlue-900">{userTokenBalance}</span>{' '}
                      {tokenSymbol ?? ''}
                    </p>
                  )}
                </>
              ) : (
                <span>Connect your wallet for balances and writes.</span>
              )}
            </div>
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
          <span className="text-xs text-slate-600">Contract</span>
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
            {customAddressError && (
              <p className="text-xs text-red-600">{customAddressError}</p>
            )}
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
          onClick={() => void fetchContractInfo()}
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

      {walletConnected && (
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 border-b border-brandBlue-400 pb-2 text-lg font-bold text-brandBlue-900">
            <Send className="h-5 w-5 text-brandBlue-800" />
            Write operations
          </h2>
          <div className={GRID_WRITE}>
            <div className={cn(BOX, OP_CARD)}>
              <span className="text-base font-semibold text-slate-900">Transfer</span>
              <div className={OP_MAIN}>
                <input type="text" value={xferTo} onChange={(e) => setXferTo(e.target.value)} placeholder="To address" className={INPUT} />
                <input type="text" value={xferAmt} onChange={(e) => setXferAmt(e.target.value)} placeholder="Amount (token units)" className={INPUT} />
              </div>
              <div className={OP_FOOTER}>
                <button
                  type="button"
                  disabled={!contractAddress || txStatus.status === 'pending'}
                  onClick={async () => {
                    try {
                      const c = await getWriteContract();
                      const amt = ethers.parseUnits(xferAmt || '0', dec);
                      await handleTransaction(() => c.transfer(xferTo, amt), 'Transfer sent');
                    } catch (e: unknown) {
                      setTxStatus({ status: 'error', message: e instanceof Error ? e.message : 'Failed' });
                      setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
                    }
                  }}
                  className={cn(BTN, 'bg-brandBlue-700 hover:bg-brandBlue-600')}
                >
                  Transfer
                </button>
              </div>
            </div>

            <div className={cn(BOX, OP_CARD)}>
              <span className="text-base font-semibold text-slate-900">Approve spender</span>
              <div className={OP_MAIN}>
                <input type="text" value={apprSpender} onChange={(e) => setApprSpender(e.target.value)} placeholder="Spender" className={INPUT} />
                <input type="text" value={apprAmt} onChange={(e) => setApprAmt(e.target.value)} placeholder="Amount" className={INPUT} />
              </div>
              <div className={OP_FOOTER}>
                <button
                  type="button"
                  disabled={!contractAddress || txStatus.status === 'pending'}
                  onClick={async () => {
                    try {
                      const c = await getWriteContract();
                      const amt = ethers.parseUnits(apprAmt || '0', dec);
                      await handleTransaction(() => c.approve(apprSpender, amt), 'Approved');
                    } catch (e: unknown) {
                      setTxStatus({ status: 'error', message: e instanceof Error ? e.message : 'Failed' });
                      setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
                    }
                  }}
                  className={cn(BTN, 'bg-brandBlue-600 hover:bg-brandBlue-500')}
                >
                  Approve
                </button>
              </div>
            </div>

            <div className={cn(BOX, OP_CARD)}>
              <span className="text-base font-semibold text-slate-900">Transfer from</span>
              <div className={OP_MAIN}>
                <input type="text" value={tfFrom} onChange={(e) => setTfFrom(e.target.value)} placeholder="From" className={INPUT} />
                <input type="text" value={tfTo} onChange={(e) => setTfTo(e.target.value)} placeholder="To" className={INPUT} />
                <input type="text" value={tfAmt} onChange={(e) => setTfAmt(e.target.value)} placeholder="Amount" className={INPUT} />
              </div>
              <div className={OP_FOOTER}>
                <button
                  type="button"
                  disabled={!contractAddress || txStatus.status === 'pending'}
                  onClick={async () => {
                    try {
                      const c = await getWriteContract();
                      const amt = ethers.parseUnits(tfAmt || '0', dec);
                      await handleTransaction(() => c.transferFrom(tfFrom, tfTo, amt), 'Transfer from complete');
                    } catch (e: unknown) {
                      setTxStatus({ status: 'error', message: e instanceof Error ? e.message : 'Failed' });
                      setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
                    }
                  }}
                  className={cn(BTN, 'bg-brandBlue-800 hover:bg-brandBlue-700')}
                >
                  Transfer from
                </button>
              </div>
            </div>

            <div className={cn(BOX, OP_CARD)}>
              <span className="text-base font-semibold text-slate-900">Mint</span>
              <div className={OP_MAIN}>
                <p className="text-xs text-slate-600">Owner only on contract.</p>
                <input type="text" value={mintTo} onChange={(e) => setMintTo(e.target.value)} placeholder="To address" className={INPUT} />
                <input type="text" value={mintAmt} onChange={(e) => setMintAmt(e.target.value)} placeholder="Amount" className={INPUT} />
              </div>
              <div className={OP_FOOTER}>
                <button
                  type="button"
                  disabled={!contractAddress || txStatus.status === 'pending'}
                  onClick={async () => {
                    try {
                      const c = await getWriteContract();
                      const amt = ethers.parseUnits(mintAmt || '0', dec);
                      await handleTransaction(() => c.mint(mintTo, amt), 'Minted');
                    } catch (e: unknown) {
                      setTxStatus({ status: 'error', message: e instanceof Error ? e.message : 'Failed' });
                      setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
                    }
                  }}
                  className={cn(BTN, 'bg-brandBlue-700 hover:bg-brandBlue-600')}
                >
                  Mint tokens
                </button>
              </div>
            </div>

            <div className={cn(BOX, OP_CARD, 'border-red-300/90 bg-red-50/40')}>
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-red-700" />
                <span className="text-base font-semibold text-slate-900">Burn</span>
              </div>
              <div className={OP_MAIN}>
                <input type="text" value={burnAmt} onChange={(e) => setBurnAmt(e.target.value)} placeholder="Amount" className={INPUT} />
              </div>
              <div className={OP_FOOTER}>
                <button
                  type="button"
                  disabled={!contractAddress || txStatus.status === 'pending'}
                  onClick={async () => {
                    try {
                      const c = await getWriteContract();
                      const amt = ethers.parseUnits(burnAmt || '0', dec);
                      await handleTransaction(() => c.burn(amt), 'Burned');
                    } catch (e: unknown) {
                      setTxStatus({ status: 'error', message: e instanceof Error ? e.message : 'Failed' });
                      setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
                    }
                  }}
                  className={cn(BTN, 'bg-red-600 hover:bg-red-500')}
                >
                  Burn tokens
                </button>
              </div>
            </div>

            <div className={cn(BOX, OP_CARD)}>
              <span className="text-base font-semibold text-slate-900">Pause</span>
              <div className={OP_MAIN}>
                <p className="text-xs text-slate-600">Owner only.</p>
                {isPausedState !== null && (
                  <div
                    className={cn(
                      'rounded-lg border px-3 py-2 text-xs font-semibold',
                      isPausedState ? 'border-red-300 bg-red-50 text-red-800' : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    )}
                  >
                    {isPausedState ? 'Paused' : 'Active'}
                  </div>
                )}
              </div>
              <div className={cn(OP_FOOTER, 'flex gap-2')}>
                <button
                  type="button"
                  disabled={!contractAddress || txStatus.status === 'pending'}
                  onClick={async () => {
                    try {
                      const c = await getWriteContract();
                      if (c) await handleTransaction(() => c.setPaused(true), 'Paused');
                    } catch (e: unknown) {
                      setTxStatus({ status: 'error', message: e instanceof Error ? e.message : 'Failed' });
                      setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
                    }
                  }}
                  className={cn(BTN, 'flex-1 bg-red-600 hover:bg-red-500')}
                >
                  Pause
                </button>
                <button
                  type="button"
                  disabled={!contractAddress || txStatus.status === 'pending'}
                  onClick={async () => {
                    try {
                      const c = await getWriteContract();
                      if (c) await handleTransaction(() => c.setPaused(false), 'Unpaused');
                    } catch (e: unknown) {
                      setTxStatus({ status: 'error', message: e instanceof Error ? e.message : 'Failed' });
                      setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
                    }
                  }}
                  className={cn(BTN, 'flex-1 bg-emerald-600 hover:bg-emerald-500')}
                >
                  Unpause
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
          <h2 className="flex items-center gap-2 border-b border-brandBlue-400 pb-2 text-lg font-bold text-brandBlue-900">
            <User className="h-5 w-5 text-brandBlue-800" />
            Read operations
          </h2>
          <div className={GRID_READ}>
            <div className={cn(BOX, OP_CARD)}>
              <span className="text-base font-semibold text-slate-900">Balance of</span>
              <div className={OP_MAIN}>
                <input type="text" value={readBalAddr} onChange={(e) => setReadBalAddr(e.target.value)} placeholder="Address" className={INPUT} />
                {readBalResult != null && <p className="text-sm font-semibold text-brandBlue-900">{readBalResult}</p>}
              </div>
              <div className={OP_FOOTER}>
                <button
                  type="button"
                  disabled={!contractAddress}
                  onClick={async () => {
                    const c = getReadContract();
                    if (!c || !readBalAddr) return;
                    try {
                      const b = await c.balanceOf(readBalAddr);
                      setReadBalResult(ethers.formatUnits(b, dec));
                    } catch {
                      setReadBalResult(null);
                    }
                  }}
                  className={cn(BTN, 'bg-brandBlue-600 hover:bg-brandBlue-500')}
                >
                  Check balance
                </button>
              </div>
            </div>

            <div className={cn(BOX, OP_CARD)}>
              <span className="text-base font-semibold text-slate-900">Allowance</span>
              <div className={OP_MAIN}>
                <input type="text" value={allowOwner} onChange={(e) => setAllowOwner(e.target.value)} placeholder="Owner" className={INPUT} />
                <input type="text" value={allowSpender} onChange={(e) => setAllowSpender(e.target.value)} placeholder="Spender" className={INPUT} />
                {allowResult != null && <p className="text-sm font-semibold">{allowResult}</p>}
              </div>
              <div className={OP_FOOTER}>
                <button
                  type="button"
                  disabled={!contractAddress}
                  onClick={async () => {
                    const c = getReadContract();
                    if (!c) return;
                    try {
                      const a = await c.allowance(allowOwner, allowSpender);
                      setAllowResult(ethers.formatUnits(a, dec));
                    } catch {
                      setAllowResult(null);
                    }
                  }}
                  className={cn(BTN, 'bg-brandBlue-600 hover:bg-brandBlue-500')}
                >
                  Check allowance
                </button>
              </div>
            </div>

            <div className={cn(BOX, OP_CARD)}>
              <span className="text-base font-semibold text-slate-900">Total supply</span>
              <div className={OP_MAIN}>
                {tsResult != null && <p className="text-sm font-semibold">{tsResult}</p>}
              </div>
              <div className={OP_FOOTER}>
                <button
                  type="button"
                  disabled={!contractAddress}
                  onClick={async () => {
                    const c = getReadContract();
                    if (!c) return;
                    try {
                      const t = await c.totalSupply();
                      setTsResult(ethers.formatUnits(t, dec));
                    } catch {
                      setTsResult(null);
                    }
                  }}
                  className={cn(BTN, 'bg-brandBlue-600 hover:bg-brandBlue-500')}
                >
                  Get total supply
                </button>
              </div>
            </div>

            <div className={cn(BOX, OP_CARD)}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-brandBlue-800" />
                <span className="text-base font-semibold text-slate-900">Token info</span>
              </div>
              <div className={OP_MAIN}>
                {infoSummary && (
                  <pre className="max-h-40 overflow-auto rounded border border-brandBlue-200 bg-white p-2 text-xs">{infoSummary}</pre>
                )}
              </div>
              <div className={OP_FOOTER}>
                <button
                  type="button"
                  disabled={!contractAddress}
                  onClick={async () => {
                    const c = getReadContract();
                    if (!c) return;
                    try {
                      const [n, s, d, t] = await Promise.all([
                        c.name(),
                        c.symbol(),
                        c.decimals(),
                        c.totalSupply(),
                      ]);
                      const dd = Number(d);
                      setInfoSummary(
                        `Name: ${n}\nSymbol: ${s}\nDecimals: ${d}\nTotal supply: ${ethers.formatUnits(t, dd)}`
                      );
                    } catch (e: unknown) {
                      setInfoSummary(parseContractError(e as { message?: string }));
                    }
                  }}
                  className={cn(BTN, 'bg-brandBlue-700 hover:bg-brandBlue-600')}
                >
                  Load token info
                </button>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}
