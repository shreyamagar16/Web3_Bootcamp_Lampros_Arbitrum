'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import {
  Layers,
  Send,
  Shield,
  Flame,
  RefreshCw,
  Check,
  Wallet,
  Image,
  AlertCircle,
  ExternalLink,
  Loader2,
  User,
  CheckCircle2,
  Globe,
  ChevronDown,
  ChevronUp,
  Coins,
  Upload,
  Copy,
} from 'lucide-react';
import { cn } from './cn';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './Select';
import { useAccount, useSwitchChain } from 'wagmi';
import { arbitrum, arbitrumSepolia } from 'viem/chains';
import type { Chain } from 'viem';
import { ERC1155_ABI, DEFAULT_ERC1155_ADDRESSES } from './constants';
import type { TokenInfo, TxStatus } from './types';

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

export interface ERC1155InteractionPanelProps {
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

const NFT_STORAGE_UPLOAD = 'https://api.nft.storage/upload';

export function ERC1155InteractionPanel({
  contractAddress: initialAddress,
  network: initialNetwork = 'arbitrum-sepolia',
  logos,
}: ERC1155InteractionPanelProps) {
  const [selectedNetwork, setSelectedNetwork] = useState<keyof typeof NETWORKS>(initialNetwork);
  const [contractAddress, setContractAddress] = useState(
    initialAddress || DEFAULT_ERC1155_ADDRESSES[initialNetwork] || ''
  );
  const [showCustomContract, setShowCustomContract] = useState(false);
  const [customAddress, setCustomAddress] = useState('');
  const [nextTokenId, setNextTokenId] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<TxStatus>({ status: 'idle', message: '' });
  const [customAddressError, setCustomAddressError] = useState<string | null>(null);
  const [isValidatingContract, setIsValidatingContract] = useState(false);

  const networkConfig = NETWORKS[selectedNetwork];
  const rpcUrl = networkConfig.rpcUrl;
  const explorerUrl = networkConfig.explorerUrl;

  const { address: userAddress, isConnected: walletConnected, chain: currentChain } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  const [exploreTokenId, setExploreTokenId] = useState('');
  const [loadedToken, setLoadedToken] = useState<TokenInfo | null>(null);

  const [fungibleSupply, setFungibleSupply] = useState('1');
  const [fungibleUri, setFungibleUri] = useState('');
  const [createNftUri, setCreateNftUri] = useState('');
  const [mintFungibleTo, setMintFungibleTo] = useState('');
  const [mintFungibleId, setMintFungibleId] = useState('');
  const [mintFungibleAmt, setMintFungibleAmt] = useState('');
  const [batchMintTo, setBatchMintTo] = useState('');
  const [batchMintIds, setBatchMintIds] = useState('');
  const [batchMintAmounts, setBatchMintAmounts] = useState('');
  const [xferFrom, setXferFrom] = useState('');
  const [xferTo, setXferTo] = useState('');
  const [xferId, setXferId] = useState('');
  const [xferAmt, setXferAmt] = useState('');
  const [approvalOperator, setApprovalOperator] = useState('');
  const [approvalGranted, setApprovalGranted] = useState(true);
  const [burnId, setBurnId] = useState('');
  const [burnAmt, setBurnAmt] = useState('');

  const [readBalAddr, setReadBalAddr] = useState('');
  const [readBalId, setReadBalId] = useState('');
  const [readBalResult, setReadBalResult] = useState<string | null>(null);
  const [batchBalAddr, setBatchBalAddr] = useState('');
  const [batchBalIds, setBatchBalIds] = useState('');
  const [batchBalResult, setBatchBalResult] = useState<string | null>(null);
  const [apprOwner, setApprOwner] = useState('');
  const [apprOp, setApprOp] = useState('');
  const [apprResult, setApprResult] = useState<boolean | null>(null);
  const [totalSupplyId, setTotalSupplyId] = useState('');
  const [totalSupplyResult, setTotalSupplyResult] = useState<string | null>(null);

  const [isPausedState, setIsPausedState] = useState<boolean | null>(null);
  const [adminCreatorAddr, setAdminCreatorAddr] = useState('');
  const [adminUriId, setAdminUriId] = useState('');
  const [adminUriVal, setAdminUriVal] = useState('');

  const [showIpfs, setShowIpfs] = useState(false);
  const [metaName, setMetaName] = useState('');
  const [metaDesc, setMetaDesc] = useState('');
  const [metaImage, setMetaImage] = useState('');
  const [metaAttrs, setMetaAttrs] = useState('');
  const [metaPreview, setMetaPreview] = useState<string | null>(null);
  const [nftStorageKey, setNftStorageKey] = useState('');
  const [ipfsUploadStatus, setIpfsUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [ipfsCid, setIpfsCid] = useState<string | null>(null);
  const [ipfsError, setIpfsError] = useState<string | null>(null);

  const defaultAddress = DEFAULT_ERC1155_ADDRESSES[selectedNetwork];
  const isUsingDefaultContract = defaultAddress && contractAddress === defaultAddress;
  const hasDefaultContract = !!defaultAddress;

  useEffect(() => {
    const d = DEFAULT_ERC1155_ADDRESSES[selectedNetwork];
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
    setContractAddress(DEFAULT_ERC1155_ADDRESSES[selectedNetwork] || '');
    setCustomAddress('');
    setCustomAddressError(null);
    setShowCustomContract(false);
  };

  const getReadContract = useCallback(() => {
    if (!contractAddress || !rpcUrl) return null;
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    return new ethers.Contract(contractAddress, ERC1155_ABI, provider);
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
    return new ethers.Contract(contractAddress, ERC1155_ABI, signer);
  }, [contractAddress, walletConnected, currentChain?.id, networkConfig]);

  const parseContractError = useCallback(
    (error: { message?: string; reason?: string; shortMessage?: string }): string => {
      const errorMessage = error?.message || error?.reason || String(error);
      if (errorMessage.includes('BAD_DATA') || errorMessage.includes('could not decode result data')) {
        return `Contract not found or not deployed on ${networkConfig.name}.`;
      }
      if (errorMessage.includes('call revert exception')) {
        return `Contract call failed. The contract may not support this function on ${networkConfig.name}.`;
      }
      if (errorMessage.includes('network') || errorMessage.includes('connection')) {
        return 'Network connection error. Please check your connection and try again.';
      }
      if (errorMessage.includes('execution reverted')) {
        return `Transaction reverted: ${error?.reason || 'Unknown reason'}`;
      }
      return `Error: ${error?.reason || error?.shortMessage || errorMessage.slice(0, 100)}`;
    },
    [networkConfig.name]
  );

  const fetchContractInfo = useCallback(async () => {
    const contract = getReadContract();
    if (!contract) return;
    try {
      const next = await contract.getNextTokenId();
      setNextTokenId(next.toString());
      const p = await contract.isPaused().catch(() => null);
      setIsPausedState(typeof p === 'boolean' ? p : null);
    } catch {
      setNextTokenId(null);
      setIsPausedState(null);
    }
  }, [getReadContract]);

  useEffect(() => {
    if (contractAddress && rpcUrl) {
      void fetchContractInfo();
    }
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
      const errorMsg = err.reason || err.message || err.shortMessage || 'Transaction failed';
      setTxStatus({ status: 'error', message: errorMsg });
    }
    setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
  };

  const loadToken = async () => {
    const contract = getReadContract();
    if (!contract || !exploreTokenId) return;
    try {
      const id = exploreTokenId;
      const [uri, isNft, total, bal] = await Promise.all([
        contract.uri(id),
        contract.isNftToken(id),
        contract.totalSupplyOf(id),
        userAddress
          ? contract.balanceOf(userAddress, id).catch(() => 0n)
          : Promise.resolve(0n),
      ]);
      setLoadedToken({
        id,
        isNft: Boolean(isNft),
        uri: String(uri || ''),
        totalSupply: total.toString(),
        userBalance: bal.toString(),
      });
    } catch {
      setLoadedToken(null);
    }
  };

  const buildMetadataObject = (): Record<string, unknown> => {
    let attributes: unknown[] = [];
    if (metaAttrs.trim()) {
      try {
        const parsed = JSON.parse(metaAttrs) as unknown;
        attributes = Array.isArray(parsed) ? parsed : [];
      } catch {
        attributes = [];
      }
    }
    return {
      name: metaName,
      description: metaDesc,
      image: metaImage,
      attributes,
    };
  };

  const handlePreviewJson = () => {
    try {
      const obj = buildMetadataObject();
      setMetaPreview(JSON.stringify(obj, null, 2));
    } catch {
      setMetaPreview('{}');
    }
  };

  const handleNftStorageUpload = async () => {
    setIpfsError(null);
    setIpfsCid(null);
    if (!nftStorageKey.trim()) {
      setIpfsUploadStatus('error');
      setIpfsError('Enter your NFT.Storage API key');
      return;
    }
    let body: string;
    try {
      body = JSON.stringify(buildMetadataObject());
    } catch {
      setIpfsUploadStatus('error');
      setIpfsError('Invalid metadata');
      return;
    }
    setIpfsUploadStatus('uploading');
    try {
      const res = await fetch(NFT_STORAGE_UPLOAD, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${nftStorageKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body,
      });
      const json = (await res.json()) as {
        ok?: boolean;
        value?: { cid?: string };
        cid?: string;
        error?: { message?: string };
      };
      if (!res.ok) {
        throw new Error(json?.error?.message || res.statusText || 'Upload failed');
      }
      const cid =
        json?.value?.cid ||
        json?.cid ||
        (typeof json === 'object' && json !== null && 'cid' in json ? String((json as { cid: string }).cid) : null);
      if (!cid) {
        throw new Error('No CID in response');
      }
      setIpfsCid(cid);
      setIpfsUploadStatus('success');
    } catch (e: unknown) {
      setIpfsUploadStatus('error');
      setIpfsError(e instanceof Error ? e.message : 'Upload failed');
    }
  };

  const applyCidToCreateNft = () => {
    if (!ipfsCid) return;
    setCreateNftUri(`ipfs://${ipfsCid}`);
  };

  const parseIds = (s: string) =>
    s
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => BigInt(x));

  return (
    <div className="w-full space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className={cn(BOX, 'sm:col-span-1 xl:col-span-1')}>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Contract</p>
          <div className="flex items-start gap-2">
            <Layers className="mt-0.5 h-5 w-5 shrink-0 text-brandBlue-700" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Multi-Token (ERC-1155)</p>
              <p className="text-xs text-slate-600">Stylus multi-token contract</p>
              {nextTokenId !== null && (
                <div className="mt-2 rounded-lg border border-brandBlue-200 bg-brandBlue-50/80 px-2 py-1.5">
                  <p className="text-[10px] font-semibold uppercase text-brandBlue-900">Token types created</p>
                  <p className="font-mono text-sm text-brandBlue-950">{nextTokenId}</p>
                </div>
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
              <span className="text-sm text-slate-700">Connect your wallet to run write operations.</span>
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
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-600">Contract:</span>
            {isUsingDefaultContract && (
              <span className="rounded bg-brandBlue-300 px-1.5 py-0.5 text-[10px] font-semibold text-brandBlue-900">
                Default
              </span>
            )}
          </div>
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
          className="flex w-full items-center justify-between rounded-lg border border-brandBlue-300 bg-brandBlue-50 px-3 py-2 text-sm font-medium text-slate-800 transition-colors hover:bg-brandBlue-100"
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
              <p className="flex items-center gap-1.5 text-xs text-red-600">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {customAddressError}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleUseCustomContract()}
                disabled={!customAddress || isValidatingContract}
                className={cn(BTN, 'flex flex-1 items-center justify-center gap-1.5 bg-brandBlue-700 hover:bg-brandBlue-600')}
              >
                {isValidatingContract ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Validating...
                  </>
                ) : (
                  'Use custom'
                )}
              </button>
              {hasDefaultContract && (
                <button
                  type="button"
                  onClick={handleUseDefaultContract}
                  className={cn(BTN, 'flex-1 bg-slate-500 hover:bg-slate-600')}
                >
                  Reset to default
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
            <span className="font-semibold">Wrong network.</span> Your wallet is on{' '}
            <span className="font-mono">{currentChain?.name ?? 'unknown'}</span> but this contract targets{' '}
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
            className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-400"
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
                className="mt-1 flex items-center gap-1 text-xs opacity-80 hover:opacity-100 hover:underline"
              >
                View on explorer <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      )}

      <div className={cn(BOX, 'space-y-3')}>
          <h2 className="flex items-center gap-2 border-b border-brandBlue-400 pb-2 text-lg font-bold text-brandBlue-900">
            <Layers className="h-5 w-5 text-brandBlue-800" />
            Token explorer
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-700">Token ID</label>
              <input
                type="text"
                value={exploreTokenId}
                onChange={(e) => setExploreTokenId(e.target.value)}
                placeholder="e.g. 0"
                className={INPUT}
              />
            </div>
            <button
              type="button"
              disabled={!contractAddress}
              onClick={() => void loadToken()}
              className={cn(BTN, 'shrink-0 bg-brandBlue-700 hover:bg-brandBlue-600 sm:w-40')}
            >
              Load token
            </button>
          </div>
          {loadedToken && (
            <div className="rounded-xl border border-brandBlue-200 bg-brandBlue-50/60 p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-xs font-bold',
                    loadedToken.isNft ? 'bg-purple-200 text-purple-900' : 'bg-brandBlue-200 text-brandBlue-900'
                  )}
                >
                  {loadedToken.isNft ? 'NFT' : 'Fungible'}
                </span>
                <span className="font-mono text-sm text-slate-800">ID #{loadedToken.id}</span>
              </div>
              <p className="text-xs text-slate-600">
                Total supply: <span className="font-semibold text-slate-900">{loadedToken.totalSupply}</span>
              </p>
              <p className="text-xs text-slate-600">
                Your balance: <span className="font-semibold text-slate-900">{loadedToken.userBalance}</span>
              </p>
              <div className="mt-2 flex items-start gap-2">
                <p className="min-w-0 flex-1 break-all font-mono text-[11px] text-slate-700">{loadedToken.uri}</p>
                <button
                  type="button"
                  onClick={() => void navigator.clipboard.writeText(loadedToken.uri)}
                  className="shrink-0 rounded border border-brandBlue-300 p-1.5 text-brandBlue-800 hover:bg-brandBlue-100"
                  title="Copy URI"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

      {walletConnected && (
        <>
          <div className="space-y-4">
            <h2 className="flex items-center gap-2 border-b border-brandBlue-400 pb-2 text-lg font-bold text-brandBlue-900">
              <Send className="h-5 w-5 text-brandBlue-800" />
              Write operations
            </h2>
            <div className={GRID_WRITE}>
              <div className={cn(BOX, OP_CARD)}>
                <div className="flex shrink-0 items-center gap-2">
                  <Coins className="h-5 w-5 text-brandBlue-700" />
                  <span className="text-base font-semibold text-slate-900">Create fungible token</span>
                </div>
                <div className={OP_MAIN}>
                  <input
                    type="text"
                    value={fungibleSupply}
                    onChange={(e) => setFungibleSupply(e.target.value)}
                    placeholder="Initial supply"
                    className={INPUT}
                  />
                  <input
                    type="text"
                    value={fungibleUri}
                    onChange={(e) => setFungibleUri(e.target.value)}
                    placeholder="URI (e.g. ipfs://...)"
                    className={INPUT}
                  />
                </div>
                <div className={OP_FOOTER}>
                  <button
                    type="button"
                    disabled={!contractAddress || txStatus.status === 'pending'}
                    onClick={async () => {
                      try {
                        const read = getReadContract();
                        const c = await getWriteContract();
                        if (!read || !c) return;
                        const planned = await read.getNextTokenId();
                        const supply = BigInt(fungibleSupply || '0');
                        await handleTransaction(
                          () => c.createFungibleToken(supply, fungibleUri),
                          `Fungible token #${planned.toString()} created`
                        );
                      } catch (e: unknown) {
                        const m = e instanceof Error ? e.message : 'Failed';
                        setTxStatus({ status: 'error', message: m });
                        setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
                      }
                    }}
                    className={cn(BTN, 'bg-brandBlue-700 hover:bg-brandBlue-600')}
                  >
                    Create token
                  </button>
                </div>
              </div>

              <div className={cn(BOX, OP_CARD)}>
                <div className="flex shrink-0 items-center gap-2">
                  <Image className="h-5 w-5 text-brandBlue-700" />
                  <span className="text-base font-semibold text-slate-900">Create NFT</span>
                </div>
                <div className={OP_MAIN}>
                  <input
                    type="text"
                    value={createNftUri}
                    onChange={(e) => setCreateNftUri(e.target.value)}
                    placeholder="URI (metadata)"
                    className={INPUT}
                  />
                </div>
                <div className={OP_FOOTER}>
                  <button
                    type="button"
                    disabled={!contractAddress || txStatus.status === 'pending'}
                    onClick={async () => {
                      try {
                        const read = getReadContract();
                        const c = await getWriteContract();
                        if (!read || !c || !createNftUri) return;
                        const planned = await read.getNextTokenId();
                        await handleTransaction(
                          () => c.createNft(createNftUri),
                          `NFT #${planned.toString()} created`
                        );
                      } catch (e: unknown) {
                        const m = e instanceof Error ? e.message : 'Failed';
                        setTxStatus({ status: 'error', message: m });
                        setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
                      }
                    }}
                    className={cn(BTN, 'bg-brandBlue-700 hover:bg-brandBlue-600')}
                  >
                    Create NFT
                  </button>
                </div>
              </div>

              <div className={cn(BOX, OP_CARD)}>
                <span className="text-base font-semibold text-slate-900">Mint fungible</span>
                <div className={OP_MAIN}>
                  <input
                    type="text"
                    value={mintFungibleTo}
                    onChange={(e) => setMintFungibleTo(e.target.value)}
                    placeholder="To address"
                    className={INPUT}
                  />
                  <input
                    type="text"
                    value={mintFungibleId}
                    onChange={(e) => setMintFungibleId(e.target.value)}
                    placeholder="Token ID"
                    className={INPUT}
                  />
                  <input
                    type="text"
                    value={mintFungibleAmt}
                    onChange={(e) => setMintFungibleAmt(e.target.value)}
                    placeholder="Amount"
                    className={INPUT}
                  />
                </div>
                <div className={OP_FOOTER}>
                  <button
                    type="button"
                    disabled={!contractAddress || txStatus.status === 'pending'}
                    onClick={async () => {
                      try {
                        const c = await getWriteContract();
                        if (!c || !mintFungibleTo) return;
                        await handleTransaction(
                          () =>
                            c.mintFungible(
                              mintFungibleTo,
                              mintFungibleId,
                              BigInt(mintFungibleAmt || '0')
                            ),
                          'Minted fungible tokens'
                        );
                      } catch (e: unknown) {
                        const m = e instanceof Error ? e.message : 'Failed';
                        setTxStatus({ status: 'error', message: m });
                        setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
                      }
                    }}
                    className={cn(BTN, 'bg-brandBlue-600 hover:bg-brandBlue-500')}
                  >
                    Mint
                  </button>
                </div>
              </div>

              <div className={cn(BOX, OP_CARD)}>
                <span className="text-base font-semibold text-slate-900">Batch mint</span>
                <div className={OP_MAIN}>
                  <input
                    type="text"
                    value={batchMintTo}
                    onChange={(e) => setBatchMintTo(e.target.value)}
                    placeholder="To address"
                    className={INPUT}
                  />
                  <input
                    type="text"
                    value={batchMintIds}
                    onChange={(e) => setBatchMintIds(e.target.value)}
                    placeholder="Token IDs (comma-separated)"
                    className={INPUT}
                  />
                  <input
                    type="text"
                    value={batchMintAmounts}
                    onChange={(e) => setBatchMintAmounts(e.target.value)}
                    placeholder="Amounts (comma-separated)"
                    className={INPUT}
                  />
                </div>
                <div className={OP_FOOTER}>
                  <button
                    type="button"
                    disabled={!contractAddress || txStatus.status === 'pending'}
                    onClick={async () => {
                      try {
                        const c = await getWriteContract();
                        if (!c || !batchMintTo) return;
                        const ids = parseIds(batchMintIds);
                        const amounts = parseIds(batchMintAmounts);
                        if (ids.length !== amounts.length) {
                          setTxStatus({ status: 'error', message: 'IDs and amounts length mismatch' });
                          setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
                          return;
                        }
                        await handleTransaction(() => c.batchMint(batchMintTo, ids, amounts), 'Batch mint complete');
                      } catch (e: unknown) {
                        const m = e instanceof Error ? e.message : 'Failed';
                        setTxStatus({ status: 'error', message: m });
                        setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
                      }
                    }}
                    className={cn(BTN, 'bg-brandBlue-700 hover:bg-brandBlue-600')}
                  >
                    Batch mint
                  </button>
                </div>
              </div>

              <div className={cn(BOX, OP_CARD)}>
                <span className="text-base font-semibold text-slate-900">Safe transfer</span>
                <div className={OP_MAIN}>
                  <input
                    type="text"
                    value={xferFrom}
                    onChange={(e) => setXferFrom(e.target.value)}
                    placeholder="From"
                    className={INPUT}
                  />
                  <input
                    type="text"
                    value={xferTo}
                    onChange={(e) => setXferTo(e.target.value)}
                    placeholder="To"
                    className={INPUT}
                  />
                  <input
                    type="text"
                    value={xferId}
                    onChange={(e) => setXferId(e.target.value)}
                    placeholder="Token ID"
                    className={INPUT}
                  />
                  <input
                    type="text"
                    value={xferAmt}
                    onChange={(e) => setXferAmt(e.target.value)}
                    placeholder="Amount"
                    className={INPUT}
                  />
                </div>
                <div className={OP_FOOTER}>
                  <button
                    type="button"
                    disabled={!contractAddress || txStatus.status === 'pending'}
                    onClick={async () => {
                      try {
                        const c = await getWriteContract();
                        if (!c) return;
                        await handleTransaction(
                          () =>
                            c['safeTransferFrom(address,address,uint256,uint256,bytes)'](
                              xferFrom,
                              xferTo,
                              xferId,
                              BigInt(xferAmt || '0'),
                              '0x'
                            ),
                          'Transfer submitted'
                        );
                      } catch (e: unknown) {
                        const m = e instanceof Error ? e.message : 'Failed';
                        setTxStatus({ status: 'error', message: m });
                        setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
                      }
                    }}
                    className={cn(BTN, 'bg-brandBlue-800 hover:bg-brandBlue-700')}
                  >
                    Transfer
                  </button>
                </div>
              </div>

              <div className={cn(BOX, OP_CARD)}>
                <div className="flex shrink-0 items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-brandBlue-800" />
                  <span className="text-base font-semibold text-slate-900">Set approval for all</span>
                </div>
                <div className={OP_MAIN}>
                  <input
                    type="text"
                    value={approvalOperator}
                    onChange={(e) => setApprovalOperator(e.target.value)}
                    placeholder="Operator"
                    className={INPUT}
                  />
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={approvalGranted}
                      onChange={(e) => setApprovalGranted(e.target.checked)}
                      className="h-4 w-4 rounded border border-brandBlue-400"
                    />
                    Grant approval
                  </label>
                </div>
                <div className={OP_FOOTER}>
                  <button
                    type="button"
                    disabled={!contractAddress || txStatus.status === 'pending'}
                    onClick={async () => {
                      try {
                        const c = await getWriteContract();
                        if (!c || !approvalOperator) return;
                        await handleTransaction(
                          () => c.setApprovalForAll(approvalOperator, approvalGranted),
                          'Approval updated'
                        );
                      } catch (e: unknown) {
                        const m = e instanceof Error ? e.message : 'Failed';
                        setTxStatus({ status: 'error', message: m });
                        setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
                      }
                    }}
                    className={cn(BTN, 'bg-brandBlue-900 hover:bg-brandBlue-800')}
                  >
                    Set approval
                  </button>
                </div>
              </div>

              <div className={cn(BOX, OP_CARD, 'border-red-300/90 bg-red-50/40')}>
                <div className="flex shrink-0 items-center gap-2">
                  <Flame className="h-5 w-5 text-red-700" />
                  <span className="text-base font-semibold text-slate-900">Burn</span>
                </div>
                <div className={OP_MAIN}>
                  <input
                    type="text"
                    value={burnId}
                    onChange={(e) => setBurnId(e.target.value)}
                    placeholder="Token ID"
                    className={INPUT}
                  />
                  <input
                    type="text"
                    value={burnAmt}
                    onChange={(e) => setBurnAmt(e.target.value)}
                    placeholder="Amount"
                    className={INPUT}
                  />
                </div>
                <div className={OP_FOOTER}>
                  <button
                    type="button"
                    disabled={!contractAddress || txStatus.status === 'pending'}
                    onClick={async () => {
                      try {
                        const c = await getWriteContract();
                        if (!c) return;
                        await handleTransaction(
                          () => c.burn(burnId, BigInt(burnAmt || '0')),
                          'Burned'
                        );
                      } catch (e: unknown) {
                        const m = e instanceof Error ? e.message : 'Failed';
                        setTxStatus({ status: 'error', message: m });
                        setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
                      }
                    }}
                    className={cn(BTN, 'bg-red-600 hover:bg-red-500')}
                  >
                    Burn
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowIpfs(!showIpfs)}
              className="flex items-center gap-2 text-sm font-semibold text-brandBlue-800 hover:text-brandBlue-600"
            >
              <Upload className="h-4 w-4" />
              {showIpfs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              IPFS Metadata Upload
            </button>
            {showIpfs && (
              <div className="mt-3 space-y-4 rounded-xl border border-brandBlue-200 bg-brandBlue-50/40 p-4">
                <p className="text-xs font-semibold text-brandBlue-900">Step 1 — Build metadata</p>
                <input
                  type="text"
                  value={metaName}
                  onChange={(e) => setMetaName(e.target.value)}
                  placeholder="NFT name"
                  className={INPUT}
                />
                <textarea
                  value={metaDesc}
                  onChange={(e) => setMetaDesc(e.target.value)}
                  placeholder="Description"
                  rows={3}
                  className={cn(INPUT, 'resize-none')}
                />
                <input
                  type="text"
                  value={metaImage}
                  onChange={(e) => setMetaImage(e.target.value)}
                  placeholder="Image (URL or existing CID)"
                  className={INPUT}
                />
                <textarea
                  value={metaAttrs}
                  onChange={(e) => setMetaAttrs(e.target.value)}
                  placeholder='[{"trait_type": "Color", "value": "Blue"}]'
                  rows={3}
                  className={cn(INPUT, 'resize-none')}
                />
                <button
                  type="button"
                  onClick={handlePreviewJson}
                  className={cn(BTN, 'bg-slate-700 hover:bg-slate-600')}
                >
                  Preview JSON
                </button>
                {metaPreview && (
                  <pre className="max-h-48 overflow-auto rounded-lg bg-slate-900 p-3 font-mono text-xs text-green-400">
                    {metaPreview}
                  </pre>
                )}

                <p className="pt-2 text-xs font-semibold text-brandBlue-900">Step 2 — Upload to NFT.Storage</p>
                <input
                  type="password"
                  value={nftStorageKey}
                  onChange={(e) => setNftStorageKey(e.target.value)}
                  placeholder="NFT.Storage API Key"
                  className={INPUT}
                  autoComplete="off"
                />
                <button
                  type="button"
                  disabled={ipfsUploadStatus === 'uploading'}
                  onClick={() => void handleNftStorageUpload()}
                  className={cn(BTN, 'flex items-center justify-center gap-2 bg-brandBlue-700 hover:bg-brandBlue-600')}
                >
                  {ipfsUploadStatus === 'uploading' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
                    </>
                  ) : (
                    'Upload to IPFS'
                  )}
                </button>
                {ipfsUploadStatus === 'success' && ipfsCid && (
                  <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
                    <p className="font-mono text-xs break-all">CID: {ipfsCid}</p>
                    <button
                      type="button"
                      onClick={applyCidToCreateNft}
                      className={cn(BTN, 'mt-2 bg-emerald-700 hover:bg-emerald-600')}
                    >
                      Use as URI
                    </button>
                  </div>
                )}
                {ipfsUploadStatus === 'error' && ipfsError && (
                  <p className="text-xs text-red-600">{ipfsError}</p>
                )}
                <p className="text-[11px] text-slate-600">
                  Don&apos;t have an API key? Get one free at{' '}
                  <a
                    href="https://nft.storage"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brandBlue-800 underline"
                  >
                    nft.storage
                  </a>
                </p>
              </div>
            )}
          </div>

          {walletConnected && (
          <div className="space-y-4">
            <h2 className="flex items-center gap-2 border-b border-brandBlue-400 pb-2 text-lg font-bold text-brandBlue-900">
              <Shield className="h-5 w-5 text-brandBlue-800" />
              Admin controls
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className={cn(BOX, OP_CARD)}>
                <span className="text-base font-semibold text-slate-900">Pause contract</span>
                <div className={OP_MAIN}>
                  {isPausedState !== null && (
                    <div
                      className={cn(
                        'rounded-lg border px-3 py-2 text-xs font-semibold',
                        isPausedState
                          ? 'border-red-300 bg-red-50 text-red-800'
                          : 'border-emerald-300 bg-emerald-50 text-emerald-800'
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
                        setTxStatus({
                          status: 'error',
                          message: e instanceof Error ? e.message : 'Failed',
                        });
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
                        setTxStatus({
                          status: 'error',
                          message: e instanceof Error ? e.message : 'Failed',
                        });
                        setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
                      }
                    }}
                    className={cn(BTN, 'flex-1 bg-emerald-600 hover:bg-emerald-500')}
                  >
                    Unpause
                  </button>
                </div>
              </div>

              <div className={cn(BOX, OP_CARD)}>
                <span className="text-base font-semibold text-slate-900">Add creator</span>
                <div className={OP_MAIN}>
                  <input
                    type="text"
                    value={adminCreatorAddr}
                    onChange={(e) => setAdminCreatorAddr(e.target.value)}
                    placeholder="Creator address"
                    className={INPUT}
                  />
                </div>
                <div className={OP_FOOTER}>
                  <button
                    type="button"
                    disabled={!contractAddress || txStatus.status === 'pending'}
                    onClick={async () => {
                      try {
                        const c = await getWriteContract();
                        if (c && adminCreatorAddr)
                          await handleTransaction(() => c.addCreator(adminCreatorAddr), 'Creator added');
                      } catch (e: unknown) {
                        setTxStatus({
                          status: 'error',
                          message: e instanceof Error ? e.message : 'Failed',
                        });
                        setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
                      }
                    }}
                    className={cn(BTN, 'bg-brandBlue-700 hover:bg-brandBlue-600')}
                  >
                    Add creator
                  </button>
                </div>
              </div>

              <div className={cn(BOX, OP_CARD)}>
                <span className="text-base font-semibold text-slate-900">Set token URI</span>
                <div className={OP_MAIN}>
                  <input
                    type="text"
                    value={adminUriId}
                    onChange={(e) => setAdminUriId(e.target.value)}
                    placeholder="Token ID"
                    className={INPUT}
                  />
                  <input
                    type="text"
                    value={adminUriVal}
                    onChange={(e) => setAdminUriVal(e.target.value)}
                    placeholder="New URI"
                    className={INPUT}
                  />
                </div>
                <div className={OP_FOOTER}>
                  <button
                    type="button"
                    disabled={!contractAddress || txStatus.status === 'pending'}
                    onClick={async () => {
                      try {
                        const c = await getWriteContract();
                        if (c && adminUriId && adminUriVal)
                          await handleTransaction(
                            () => c.setTokenUri(adminUriId, adminUriVal),
                            'Token URI updated'
                          );
                      } catch (e: unknown) {
                        setTxStatus({
                          status: 'error',
                          message: e instanceof Error ? e.message : 'Failed',
                        });
                        setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
                      }
                    }}
                    className={cn(BTN, 'bg-brandBlue-700 hover:bg-brandBlue-600')}
                  >
                    Set URI
                  </button>
                </div>
              </div>
            </div>
          </div>
          )}
        </>
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
                <input
                  type="text"
                  value={readBalAddr}
                  onChange={(e) => setReadBalAddr(e.target.value)}
                  placeholder="Address"
                  className={INPUT}
                />
                <input
                  type="text"
                  value={readBalId}
                  onChange={(e) => setReadBalId(e.target.value)}
                  placeholder="Token ID"
                  className={INPUT}
                />
                {readBalResult !== null && (
                  <p className="text-sm font-semibold text-brandBlue-900">Balance: {readBalResult}</p>
                )}
              </div>
              <div className={OP_FOOTER}>
                <button
                  type="button"
                  disabled={!contractAddress}
                  onClick={async () => {
                    const c = getReadContract();
                    if (!c || !readBalAddr) return;
                    try {
                      const b = await c.balanceOf(readBalAddr, readBalId);
                      setReadBalResult(b.toString());
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
              <span className="text-base font-semibold text-slate-900">Balance batch</span>
              <div className={OP_MAIN}>
                <input
                  type="text"
                  value={batchBalAddr}
                  onChange={(e) => setBatchBalAddr(e.target.value)}
                  placeholder="Address"
                  className={INPUT}
                />
                <input
                  type="text"
                  value={batchBalIds}
                  onChange={(e) => setBatchBalIds(e.target.value)}
                  placeholder="Token IDs (comma-separated)"
                  className={INPUT}
                />
                {batchBalResult && (
                  <pre className="max-h-32 overflow-auto rounded border border-brandBlue-200 bg-white p-2 text-xs">
                    {batchBalResult}
                  </pre>
                )}
              </div>
              <div className={OP_FOOTER}>
                <button
                  type="button"
                  disabled={!contractAddress}
                  onClick={async () => {
                    const c = getReadContract();
                    if (!c || !batchBalAddr) return;
                    try {
                      const ids = batchBalIds
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .map((s) => BigInt(s));
                      const accounts = ids.map(() => batchBalAddr);
                      const balances: bigint[] = await c.balanceOfBatch(accounts, ids);
                      const lines = ids.map((id, i) => `${id.toString()}: ${balances[i]?.toString() ?? '?'}`);
                      setBatchBalResult(lines.join('\n'));
                    } catch {
                      setBatchBalResult(null);
                    }
                  }}
                  className={cn(BTN, 'bg-brandBlue-600 hover:bg-brandBlue-500')}
                >
                  Check batch
                </button>
              </div>
            </div>

            <div className={cn(BOX, OP_CARD)}>
              <span className="text-base font-semibold text-slate-900">Is approved for all</span>
              <div className={OP_MAIN}>
                <input
                  type="text"
                  value={apprOwner}
                  onChange={(e) => setApprOwner(e.target.value)}
                  placeholder="Owner"
                  className={INPUT}
                />
                <input
                  type="text"
                  value={apprOp}
                  onChange={(e) => setApprOp(e.target.value)}
                  placeholder="Operator"
                  className={INPUT}
                />
                {apprResult !== null && (
                  <p className="text-sm font-semibold">{apprResult ? 'Yes' : 'No'}</p>
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
                      const r = await c.isApprovedForAll(apprOwner, apprOp);
                      setApprResult(Boolean(r));
                    } catch {
                      setApprResult(null);
                    }
                  }}
                  className={cn(BTN, 'bg-brandBlue-600 hover:bg-brandBlue-500')}
                >
                  Check
                </button>
              </div>
            </div>

            <div className={cn(BOX, OP_CARD)}>
              <span className="text-base font-semibold text-slate-900">Total supply of token</span>
              <div className={OP_MAIN}>
                <input
                  type="text"
                  value={totalSupplyId}
                  onChange={(e) => setTotalSupplyId(e.target.value)}
                  placeholder="Token ID"
                  className={INPUT}
                />
                {totalSupplyResult !== null && (
                  <p className="text-sm font-semibold">Supply: {totalSupplyResult}</p>
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
                      const s = await c.totalSupplyOf(totalSupplyId);
                      setTotalSupplyResult(s.toString());
                    } catch {
                      setTotalSupplyResult(null);
                    }
                  }}
                  className={cn(BTN, 'bg-brandBlue-600 hover:bg-brandBlue-500')}
                >
                  Get supply
                </button>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}
