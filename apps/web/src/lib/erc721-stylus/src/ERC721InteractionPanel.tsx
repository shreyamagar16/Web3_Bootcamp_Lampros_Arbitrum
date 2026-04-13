'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import {
  Sparkles,
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
  ChevronUp
} from 'lucide-react';
import { cn } from './cn';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './Select';
import { useAccount, useWalletClient, usePublicClient, useSwitchChain } from 'wagmi';
import { arbitrum, arbitrumSepolia } from 'viem/chains';
import type { Chain } from 'viem';

// Define custom Superposition chains
const superposition: Chain = {
  id: 55244,
  name: 'Superposition',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://rpc.superposition.so'] },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://explorer.superposition.so' },
  },
};

const superpositionTestnet: Chain = {
  id: 98985,
  name: 'Superposition Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'SPN',
    symbol: 'SPN',
  },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.superposition.so'] },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://testnet-explorer.superposition.so' },
  },
  testnet: true,
};

const robinhoodTestnet: Chain = {
  id: 46630,
  name: 'Robinhood Chain Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.chain.robinhood.com'] },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://explorer.testnet.chain.robinhood.com' },
  },
  testnet: true,
};

// ERC721 ABI for the deployed Stylus NFT contract (IStylusNFT)
const ERC721_ABI = [
  // ERC721 Standard Interface
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 token_id) view returns (address)",
  "function tokenURI(uint256 token_id) view returns (string)",
  "function safeTransferFrom(address from, address to, uint256 token_id, bytes data)",
  "function safeTransferFrom(address from, address to, uint256 token_id)",
  "function transferFrom(address from, address to, uint256 token_id)",
  "function approve(address approved, uint256 token_id)",
  "function setApprovalForAll(address operator, bool approved)",
  "function getApproved(uint256 token_id) view returns (address)",
  "function isApprovedForAll(address owner, address operator) view returns (bool)",
  // StylusNFT Specific Functions (from lib.rs)
  "function mint() payable",
  "function mintTo(address to)",
  "function safeMint(address to) payable",
  "function burn(uint256 token_id)",
  "function batchMint(uint256 count) payable",
  "function whitelistMint(bytes32[] proof) payable",
  "function initialize(address owner, uint256 mintPrice, uint256 maxPerWallet)",
  "function setPaused(bool paused)",
  "function setMintPrice(uint256 price)",
  "function setMaxPerWallet(uint256 max)",
  "function setMerkleRoot(bytes32 root)",
  "function getWalletMints(address wallet) view returns (uint256)",
  "function isPaused() view returns (bool)",
  "function getMintPrice() view returns (uint256)",
  "function getMaxPerWallet() view returns (uint256)",
  "function getMerkleRoot() view returns (bytes32)",
];

/** Client-only gate for showing admin UI (not a security boundary on-chain). */
const ADMIN_PANEL_PASSWORD = 'admin123';

// Network-specific default contract addresses (only for networks where contracts are deployed)
const DEFAULT_CONTRACT_ADDRESSES: Record<string, string | undefined> = {
  'arbitrum-sepolia': '0xe2a8cd01354ecc63a8341a849e9b89f14ff9f08f',
  'arbitrum': undefined, // No default contract deployed on mainnet
  'superposition': undefined, // No default contract deployed on mainnet
  'superposition-testnet': '0xa0cc35ec0ce975c28dacc797edb7808e882043c3',
  'robinhood-testnet': '0xa0cc35ec0ce975c28dacc797edb7808e882043c3',
};

// Network configurations
const NETWORKS = {
  'arbitrum-sepolia': {
    name: 'Arbitrum Sepolia',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    explorerUrl: 'https://sepolia.arbiscan.io',
    chainId: arbitrumSepolia.id,
    chain: arbitrumSepolia,
  },
  'arbitrum': {
    name: 'Arbitrum One',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
    chainId: arbitrum.id,
    chain: arbitrum,
  },
  'superposition': {
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
};

interface ChainLogos {
  arbitrum?: string;
  superposition?: string;
  robinhood?: string;
}

interface ERC721InteractionPanelProps {
  contractAddress?: string;
  network?: 'arbitrum' | 'arbitrum-sepolia' | 'superposition' | 'superposition-testnet' | 'robinhood-testnet';
  /** Optional: URLs for chain logos (arbitrum, superposition, robinhood) - pass to show logos in network selector */
  logos?: ChainLogos;
}

interface TxStatus {
  status: 'idle' | 'pending' | 'success' | 'error';
  message: string;
  hash?: string;
}

const NETWORK_IDS = ['arbitrum', 'arbitrum-sepolia', 'superposition', 'superposition-testnet', 'robinhood-testnet'] as const;

function getLogoForNetwork(net: (typeof NETWORK_IDS)[number], logos?: ChainLogos): string | undefined {
  if (!logos) return undefined;
  if (net.includes('arbitrum')) return logos.arbitrum;
  if (net.includes('superposition')) return logos.superposition;
  if (net.includes('robinhood')) return logos.robinhood;
  return undefined;
}

/** Card shell — compact tiles, darker blue accents */
const BOX =
  'rounded-xl border border-brandBlue-300 bg-white p-4 shadow-md shadow-brandBlue-900/10';

const INPUT =
  'w-full rounded-lg border border-brandBlue-300 bg-brandBlue-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-brandBlue-600 focus:outline-none focus:ring-2 focus:ring-brandBlue-400/35';

const BTN =
  'w-full rounded-lg py-2.5 text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-50';

/** Write: 4 cols on xl → rows of 4 + 3. Read: one row of 4 on xl. */
const GRID_WRITE =
  'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 xl:items-stretch';
const GRID_READ =
  'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 xl:items-stretch';

/** Operation tile: shorter min height, action pinned to bottom */
const OP_CARD =
  'flex h-full min-h-[19rem] flex-col gap-3 xl:min-h-[21rem]';
const OP_MAIN = 'flex min-h-0 flex-1 flex-col gap-3';
const OP_FOOTER = 'mt-auto shrink-0 pt-0.5';

export function ERC721InteractionPanel({
  contractAddress: initialAddress,
  network: initialNetwork = 'arbitrum-sepolia',
  logos,
}: ERC721InteractionPanelProps) {
  const [selectedNetwork, setSelectedNetwork] = useState<'arbitrum' | 'arbitrum-sepolia' | 'superposition' | 'superposition-testnet' | 'robinhood-testnet'>(initialNetwork);
  const [contractAddress, setContractAddress] = useState(initialAddress || DEFAULT_CONTRACT_ADDRESSES[initialNetwork] || '');
  const [showCustomContract, setShowCustomContract] = useState(false);
  const [customAddress, setCustomAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  const networkConfig = NETWORKS[selectedNetwork];
  const rpcUrl = networkConfig.rpcUrl;
  const explorerUrl = networkConfig.explorerUrl;

  // Wagmi hooks for wallet connection
  const { address: userAddress, isConnected: walletConnected, chain: currentChain } = useAccount();
  const publicClient = usePublicClient({ chainId: networkConfig.chainId });
  const { data: walletClient } = useWalletClient({ chainId: networkConfig.chainId });
  const { switchChainAsync } = useSwitchChain();

  // NFT info
  const [collectionName, setCollectionName] = useState<string | null>(null);
  const [collectionSymbol, setCollectionSymbol] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState<string | null>(null);

  // Form inputs - Write operations
  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferTokenId, setTransferTokenId] = useState('');
  const [approveAddress, setApproveAddress] = useState('');
  const [approveTokenId, setApproveTokenId] = useState('');
  const [operatorAddress, setOperatorAddress] = useState('');
  const [operatorApproved, setOperatorApproved] = useState(true);
  const [burnTokenId, setBurnTokenId] = useState('');
  const [mintToAddress, setMintToAddress] = useState('');
  const [safeMintToAddress, setSafeMintToAddress] = useState('');

  // Read operations
  const [ownerOfTokenId, setOwnerOfTokenId] = useState('');
  const [ownerOfResult, setOwnerOfResult] = useState<string | null>(null);
  const [balanceCheckAddress, setBalanceCheckAddress] = useState('');
  const [balanceCheckResult, setBalanceCheckResult] = useState<string | null>(null);
  const [getApprovedTokenId, setGetApprovedTokenId] = useState('');
  const [getApprovedResult, setGetApprovedResult] = useState<string | null>(null);
  const [approvalCheckOwner, setApprovalCheckOwner] = useState('');
  const [approvalCheckOperator, setApprovalCheckOperator] = useState('');
  const [approvalCheckResult, setApprovalCheckResult] = useState<boolean | null>(null);

  const [txStatus, setTxStatus] = useState<TxStatus>({ status: 'idle', message: '' });
  const [customAddressError, setCustomAddressError] = useState<string | null>(null);
  const [isValidatingContract, setIsValidatingContract] = useState(false);
  const [contractError, setContractError] = useState<string | null>(null);

  const [batchCount, setBatchCount] = useState('1');
  const [whitelistProof, setWhitelistProof] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [adminMintPrice, setAdminMintPrice] = useState('');
  const [adminMaxPerWallet, setAdminMaxPerWallet] = useState('');
  const [adminMerkleRoot, setAdminMerkleRoot] = useState('');
  const [isPausedState, setIsPausedState] = useState<boolean | null>(null);
  const [adminControlsUnlocked, setAdminControlsUnlocked] = useState(false);
  const [showAdminUnlockForm, setShowAdminUnlockForm] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminUnlockError, setAdminUnlockError] = useState<string | null>(null);

  const [showGallery, setShowGallery] = useState(false);
  const [galleryTokens, setGalleryTokens] = useState<
    Array<{ id: string; owner: string; metadata: Record<string, unknown> | null; imageUrl: string | null }>
  >([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);

  // Check if using the default contract for the selected network
  const defaultAddress = DEFAULT_CONTRACT_ADDRESSES[selectedNetwork];
  const isUsingDefaultContract = defaultAddress && contractAddress === defaultAddress;
  const hasDefaultContract = !!defaultAddress;
  const displayExplorerUrl = explorerUrl;

  // Update contract address when network changes
  useEffect(() => {
    const newDefault = DEFAULT_CONTRACT_ADDRESSES[selectedNetwork];
    if (newDefault && (isUsingDefaultContract || !initialAddress)) {
      setContractAddress(newDefault);
    } else if (!newDefault && !initialAddress) {
      setContractAddress('');
    }
  }, [selectedNetwork]);

  // Validate if an address is a contract
  const validateContract = async (address: string): Promise<boolean> => {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const code = await provider.getCode(address);
      return code !== '0x' && code.length > 2;
    } catch (error) {
      return false;
    }
  };

  // Update contract address when using custom
  const handleUseCustomContract = async () => {
    if (!customAddress || !ethers.isAddress(customAddress)) {
      setCustomAddressError('Invalid address format');
      return;
    }

    setIsValidatingContract(true);
    setCustomAddressError(null);

    const isContract = await validateContract(customAddress);
    if (!isContract) {
      setCustomAddressError('Address is not a contract');
      setIsValidatingContract(false);
      return;
    }

    setContractAddress(customAddress);
    setIsValidatingContract(false);
  };

  // Reset to default contract for the selected network
  const handleUseDefaultContract = () => {
    const defaultAddr = DEFAULT_CONTRACT_ADDRESSES[selectedNetwork];
    setContractAddress(defaultAddr || '');
    setCustomAddress('');
    setCustomAddressError(null);
    setShowCustomContract(false);
  };

  const getReadContract = useCallback(() => {
    if (!contractAddress || !rpcUrl) return null;
    // Create a fresh provider with the current RPC URL
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    return new ethers.Contract(contractAddress, ERC721_ABI, provider);
  }, [contractAddress, rpcUrl, selectedNetwork]);

  const getWriteContract = useCallback(async () => {
    console.log('[ERC721] getWriteContract called', { contractAddress, walletConnected, currentChainId: currentChain?.id, targetChainId: networkConfig.chainId });

    if (!contractAddress) {
      console.error('[ERC721] No contract address');
      throw new Error('No contract address specified');
    }

    if (!walletConnected) {
      console.error('[ERC721] Wallet not connected');
      throw new Error('Please connect your wallet first');
    }

    // Check if ethereum provider exists
    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      console.error('[ERC721] No ethereum provider found');
      throw new Error('No wallet detected. Please install MetaMask.');
    }

    // Switch chain if necessary
    const targetChainIdHex = `0x${networkConfig.chainId.toString(16)}`;
    console.log('[ERC721] Current chain:', currentChain?.id, 'Target chain:', networkConfig.chainId);

    if (currentChain?.id !== networkConfig.chainId) {
      console.log('[ERC721] Switching chain to', networkConfig.name);
      try {
        // Try to switch to the chain
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: targetChainIdHex }],
        });
        console.log('[ERC721] Chain switched successfully');
      } catch (switchError: any) {
        console.log('[ERC721] Switch error:', switchError.code, switchError.message);
        // Chain doesn't exist, try to add it
        if (switchError.code === 4902 || switchError.message?.includes('Unrecognized chain') || switchError.message?.includes('wallet_addEthereumChain')) {
          console.log('[ERC721] Chain not found, adding chain...');
          try {
            await ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: targetChainIdHex,
                chainName: networkConfig.name,
                nativeCurrency: networkConfig.chain.nativeCurrency,
                rpcUrls: [networkConfig.rpcUrl],
                blockExplorerUrls: [networkConfig.explorerUrl],
              }],
            });
            console.log('[ERC721] Chain added successfully');
          } catch (addError: any) {
            console.error('[ERC721] Failed to add chain:', addError);
            throw new Error(`Failed to add ${networkConfig.name} to wallet: ${addError.message}`);
          }
        } else if (switchError.code === 4001) {
          throw new Error('User rejected chain switch');
        } else {
          throw switchError;
        }
      }
    }

    // Use ethers with window.ethereum directly for better compatibility
    console.log('[ERC721] Creating provider and signer...');
    const provider = new ethers.BrowserProvider(ethereum);
    const signer = await provider.getSigner();
    console.log('[ERC721] Signer address:', await signer.getAddress());

    const contract = new ethers.Contract(contractAddress, ERC721_ABI, signer);
    console.log('[ERC721] Contract created at:', contractAddress);
    return contract;
  }, [contractAddress, walletConnected, currentChain?.id, networkConfig]);

  // Helper to parse RPC/contract errors into user-friendly messages
  const parseContractError = useCallback((error: any): string => {
    const errorMessage = error?.message || error?.reason || String(error);

    if (errorMessage.includes('BAD_DATA') || errorMessage.includes('could not decode result data')) {
      return `Contract not found or not deployed on ${networkConfig.name}. The contract may only exist on a different network.`;
    }
    if (errorMessage.includes('call revert exception')) {
      return `Contract call failed. The contract may not support this function or is not properly deployed on ${networkConfig.name}.`;
    }
    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      return `Network connection error. Please check your connection and try again.`;
    }
    if (errorMessage.includes('execution reverted')) {
      return `Transaction reverted: ${error?.reason || 'Unknown reason'}`;
    }

    return `Error: ${error?.reason || error?.shortMessage || errorMessage.slice(0, 100)}`;
  }, [networkConfig.name]);

  const fetchNFTInfo = useCallback(async () => {
    const contract = getReadContract();
    if (!contract) return;

    setContractError(null);

    try {
      const [name, symbol] = await Promise.all([
        contract.name().catch(() => null),
        contract.symbol().catch(() => null),
      ]);

      // Check if we got valid data
      if (name === null && symbol === null) {
        setContractError(`Unable to read contract data. The contract may not be deployed on ${networkConfig.name}.`);
        setIsConnected(false);
        return;
      }

      setCollectionName(name);
      setCollectionSymbol(symbol);

      if (userAddress) {
        try {
          const balance = await contract.balanceOf(userAddress);
          setUserBalance(balance.toString());
        } catch (balanceError: any) {
          console.error('Error fetching balance:', balanceError);
          setContractError(parseContractError(balanceError));
        }
      }

      try {
        const [pausedR, priceR, maxR] = await Promise.all([
          contract.isPaused().catch(() => null),
          contract.getMintPrice().catch(() => null),
          contract.getMaxPerWallet().catch(() => null),
        ]);
        if (typeof pausedR === 'boolean') {
          setIsPausedState(pausedR);
        } else {
          setIsPausedState(null);
        }
        if (priceR != null) {
          try {
            setAdminMintPrice(ethers.formatEther(priceR));
          } catch {
            setAdminMintPrice('');
          }
        }
        if (maxR != null) {
          setAdminMaxPerWallet(maxR.toString());
        }
      } catch {
        setIsPausedState(null);
      }

      setIsConnected(true);
    } catch (error: any) {
      console.error('Error:', error);
      setContractError(parseContractError(error));
      setIsConnected(false);
    }
  }, [getReadContract, userAddress, networkConfig.name, parseContractError]);

  useEffect(() => {
    if (contractAddress && rpcUrl) {
      fetchNFTInfo();
    }
  }, [contractAddress, rpcUrl, fetchNFTInfo, userAddress]);

  const handleTransaction = async (
    operation: () => Promise<ethers.TransactionResponse>,
    successMessage: string
  ) => {
    console.log('[ERC721] handleTransaction called, walletConnected:', walletConnected, 'txStatus:', txStatus.status);

    if (txStatus.status === 'pending') {
      console.log('[ERC721] Transaction already pending, skipping');
      return;
    }

    if (!walletConnected) {
      console.log('[ERC721] Wallet not connected');
      setTxStatus({ status: 'error', message: 'Please connect your wallet first' });
      setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
      return;
    }

    try {
      setTxStatus({ status: 'pending', message: 'Confirming...' });
      console.log('[ERC721] Executing operation...');
      const tx = await operation();
      console.log('[ERC721] Transaction submitted:', tx.hash);
      setTxStatus({ status: 'pending', message: 'Waiting for confirmation...', hash: tx.hash });
      await tx.wait();
      console.log('[ERC721] Transaction confirmed');
      setTxStatus({ status: 'success', message: successMessage, hash: tx.hash });
      fetchNFTInfo();
    } catch (error: any) {
      console.error('[ERC721] Transaction error:', error);
      const errorMsg = error.reason || error.message || error.shortMessage || 'Transaction failed';
      setTxStatus({ status: 'error', message: errorMsg });
    }
    setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
  };

  const handleMint = async () => {
    console.log('[ERC721] handleMint called');
    try {
      const contract = await getWriteContract();
      if (!contract) {
        console.error('[ERC721] getWriteContract returned null');
        return;
      }
      const read = getReadContract();
      let value = 0n;
      if (read) {
        try {
          const p = await read.getMintPrice();
          value = BigInt(p.toString());
        } catch {
          value = 0n;
        }
      }
      console.log('[ERC721] Got contract, calling mint()...');
      handleTransaction(
        () => contract.mint({ value }),
        'NFT minted to yourself!'
      );
    } catch (error: any) {
      console.error('[ERC721] handleMint error:', error);
      setTxStatus({ status: 'error', message: error.message || 'Failed to prepare transaction' });
      setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
    }
  };

  const handleMintTo = async () => {
    console.log('[ERC721] handleMintTo called');
    try {
      const contract = await getWriteContract();
      if (!contract || !mintToAddress) return;
      handleTransaction(
        () => contract.mintTo(mintToAddress),
        'NFT minted successfully!'
      );
    } catch (error: any) {
      console.error('[ERC721] handleMintTo error:', error);
      setTxStatus({ status: 'error', message: error.message || 'Failed to prepare transaction' });
      setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
    }
  };

  const handleSafeMint = async () => {
    console.log('[ERC721] handleSafeMint called');
    try {
      const contract = await getWriteContract();
      if (!contract || !safeMintToAddress) return;
      const read = getReadContract();
      let value = 0n;
      if (read) {
        try {
          const p = await read.getMintPrice();
          value = BigInt(p.toString());
        } catch {
          value = 0n;
        }
      }
      handleTransaction(
        () => contract['safeMint(address)'](safeMintToAddress, { value }),
        'NFT safely minted!'
      );
    } catch (error: any) {
      console.error('[ERC721] handleSafeMint error:', error);
      setTxStatus({ status: 'error', message: error.message || 'Failed to prepare transaction' });
      setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
    }
  };

  const handleTransfer = async () => {
    console.log('[ERC721] handleTransfer called');
    try {
      const contract = await getWriteContract();
      if (!contract || !transferFrom || !transferTo || !transferTokenId) return;
      handleTransaction(
        () => contract['safeTransferFrom(address,address,uint256)'](transferFrom, transferTo, transferTokenId),
        `NFT #${transferTokenId} transferred!`
      );
    } catch (error: any) {
      console.error('[ERC721] handleTransfer error:', error);
      setTxStatus({ status: 'error', message: error.message || 'Failed to prepare transaction' });
      setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
    }
  };

  const handleApprove = async () => {
    console.log('[ERC721] handleApprove called');
    try {
      const contract = await getWriteContract();
      if (!contract || !approveAddress || !approveTokenId) return;
      handleTransaction(
        () => contract.approve(approveAddress, approveTokenId),
        `Approval set for NFT #${approveTokenId}!`
      );
    } catch (error: any) {
      console.error('[ERC721] handleApprove error:', error);
      setTxStatus({ status: 'error', message: error.message || 'Failed to prepare transaction' });
      setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
    }
  };

  const handleSetApprovalForAll = async () => {
    console.log('[ERC721] handleSetApprovalForAll called');
    try {
      const contract = await getWriteContract();
      if (!contract || !operatorAddress) return;
      handleTransaction(
        () => contract.setApprovalForAll(operatorAddress, operatorApproved),
        `Operator ${operatorApproved ? 'approved' : 'revoked'}!`
      );
    } catch (error: any) {
      console.error('[ERC721] handleSetApprovalForAll error:', error);
      setTxStatus({ status: 'error', message: error.message || 'Failed to prepare transaction' });
      setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
    }
  };

  const handleBurn = async () => {
    console.log('[ERC721] handleBurn called');
    try {
      const contract = await getWriteContract();
      if (!contract || !burnTokenId) return;
      handleTransaction(
        () => contract.burn(burnTokenId),
        `NFT #${burnTokenId} burned!`
      );
    } catch (error: any) {
      console.error('[ERC721] handleBurn error:', error);
      setTxStatus({ status: 'error', message: error.message || 'Failed to prepare transaction' });
      setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
    }
  };

  const handleBatchMint = async () => {
    try {
      const contract = await getWriteContract();
      if (!contract) return;
      const count = parseInt(batchCount, 10);
      if (Number.isNaN(count) || count < 1 || count > 20) return;
      const read = getReadContract();
      let unit = 0n;
      if (read) {
        try {
          unit = BigInt((await read.getMintPrice()).toString());
        } catch {
          unit = 0n;
        }
      }
      const totalCost = unit * BigInt(count);
      handleTransaction(
        () => contract.batchMint(count, { value: totalCost }),
        `${count} NFT${count > 1 ? 's' : ''} minted!`
      );
    } catch (error: any) {
      setTxStatus({ status: 'error', message: error.message || 'Failed' });
      setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
    }
  };

  const handleWhitelistMint = async () => {
    try {
      const contract = await getWriteContract();
      if (!contract || !whitelistProof.trim()) return;
      const proofArray = whitelistProof.split(',').map((p) => p.trim()).filter(Boolean);
      const read = getReadContract();
      let value = 0n;
      if (read) {
        try {
          value = BigInt((await read.getMintPrice()).toString());
        } catch {
          value = 0n;
        }
      }
      handleTransaction(
        () => contract.whitelistMint(proofArray, { value }),
        'Whitelist mint successful!'
      );
    } catch (error: any) {
      setTxStatus({ status: 'error', message: error.message || 'Failed' });
      setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
    }
  };

  const checkOwnerOf = async () => {
    const contract = getReadContract();
    if (!contract || !ownerOfTokenId) return;
    try {
      const owner = await contract.ownerOf(ownerOfTokenId);
      setOwnerOfResult(owner);
    } catch {
      setOwnerOfResult('Token does not exist');
    }
  };

  const checkBalance = async () => {
    const contract = getReadContract();
    if (!contract || !balanceCheckAddress) return;
    try {
      const balance = await contract.balanceOf(balanceCheckAddress);
      setBalanceCheckResult(balance.toString());
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const checkGetApproved = async () => {
    const contract = getReadContract();
    if (!contract || !getApprovedTokenId) return;
    try {
      const approved = await contract.getApproved(getApprovedTokenId);
      setGetApprovedResult(approved);
    } catch {
      setGetApprovedResult('Token does not exist');
    }
  };

  const checkApprovalForAll = async () => {
    const contract = getReadContract();
    if (!contract || !approvalCheckOwner || !approvalCheckOperator) return;
    try {
      const isApproved = await contract.isApprovedForAll(approvalCheckOwner, approvalCheckOperator);
      setApprovalCheckResult(isApproved);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchWithTimeout = async (url: string, timeoutMs: number): Promise<Response> => {
    const ac = new AbortController();
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => {
        ac.abort();
        reject(new Error('timeout'));
      }, timeoutMs)
    );
    return Promise.race([fetch(url, { signal: ac.signal }), timeout]);
  };

  const loadGallery = useCallback(async () => {
    setGalleryLoading(true);
    setGalleryError(null);
    try {
      const contract = getReadContract();
      if (!contract || !contractAddress) return;

      const provider = new ethers.JsonRpcProvider(rpcUrl);

      // ERC-721 Transfer event topic: Transfer(address,address,uint256)
      const transferTopic = ethers.id('Transfer(address,address,uint256)');
      // Mint events: from = ZeroAddress (padded to 32 bytes)
      const zeroAddressTopic = ethers.zeroPadValue(ethers.ZeroAddress, 32);

      let rawLogs: ethers.Log[] = [];
      try {
        rawLogs = await provider.getLogs({
          address: contractAddress,
          topics: [transferTopic, zeroAddressTopic],
          fromBlock: -10000,
        });
      } catch {
        try {
          rawLogs = await provider.getLogs({
            address: contractAddress,
            topics: [transferTopic, zeroAddressTopic],
            fromBlock: 0,
          });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          throw new Error(`Could not fetch transfer events: ${msg}`);
        }
      }

      // Parse token IDs from the third topic (indexed uint256)
      const tokenIds = [
        ...new Set(
          rawLogs
            .filter((log) => log.topics.length > 3 && log.topics[3] != null)
            .map((log) => BigInt(log.topics[3] as string).toString())
        ),
      ].slice(0, 20);

      const tokens = await Promise.all(
        tokenIds.map(async (id) => {
          try {
            const owner = await contract.ownerOf(id).catch(() => null);
            if (!owner || owner === ethers.ZeroAddress) return null;

            let metadata: Record<string, unknown> | null = null;
            let imageUrl: string | null = null;

            try {
              const uri = await contract.tokenURI(id).catch(() => null);
              if (uri && typeof uri === 'string') {
                const httpUri = uri.startsWith('ipfs://')
                  ? uri.replace('ipfs://', 'https://nftstorage.link/ipfs/')
                  : uri;
                let res: Response;
                if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
                  res = await fetch(httpUri, { signal: AbortSignal.timeout(5000) });
                } else {
                  res = await fetchWithTimeout(httpUri, 5000);
                }
                if (res.ok) {
                  metadata = (await res.json()) as Record<string, unknown>;
                  const img = metadata?.image;
                  if (typeof img === 'string') {
                    imageUrl = img.startsWith('ipfs://')
                      ? img.replace('ipfs://', 'https://nftstorage.link/ipfs/')
                      : img;
                  }
                }
              }
            } catch {
              /* metadata optional */
            }

            return { id, owner: String(owner), metadata, imageUrl };
          } catch {
            return null;
          }
        })
      );

      setGalleryTokens(tokens.filter(Boolean) as Array<{ id: string; owner: string; metadata: Record<string, unknown> | null; imageUrl: string | null }>);
    } catch (e: unknown) {
      setGalleryError(e instanceof Error ? e.message : 'Failed to load gallery');
    } finally {
      setGalleryLoading(false);
    }
  }, [getReadContract, contractAddress, rpcUrl]);

  return (
    <div className="w-full space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div
          className={cn(
            BOX,
            'border-brandBlue-400 bg-gradient-to-br from-brandBlue-100/80 via-white to-white'
          )}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 shrink-0 text-brandBlue-700" />
            <span className="text-base font-semibold text-slate-900">
              {collectionName || 'ERC-721'} {collectionSymbol ? `(${collectionSymbol})` : 'NFT'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-600">Stylus NFT contract</p>
          {isConnected && walletConnected && (
            <div className="mt-3 flex items-center justify-between rounded-lg border border-brandBlue-300 bg-brandBlue-50/90 px-3 py-2">
              <div className="flex items-center gap-1.5">
                <Image className="h-4 w-4 text-brandBlue-700" />
                <span className="text-xs font-medium text-slate-700">Your NFTs</span>
              </div>
              <span className="text-base font-bold text-brandBlue-900">{userBalance || '0'}</span>
            </div>
          )}
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
              <span className="text-sm text-slate-700">
                Connect your wallet to run write operations.
              </span>
            )}
          </div>
        </div>

        <div className={cn(BOX, 'sm:col-span-2 xl:col-span-1')}>
          <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <Globe className="h-4 w-4 text-brandBlue-700" /> Network
          </label>
          <Select value={selectedNetwork} onValueChange={(value) => setSelectedNetwork(value as typeof selectedNetwork)}>
            <SelectTrigger className="h-10 w-full text-sm">
              <SelectValue>
                <div className="flex items-center gap-2">
                  {getLogoForNetwork(selectedNetwork, logos) && (
                    <img src={getLogoForNetwork(selectedNetwork, logos)} alt="" width={16} height={16} className="rounded" />
                  )}
                  <span>{NETWORKS[selectedNetwork].name}</span>
                  {NETWORKS[selectedNetwork].chain.testnet && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">Testnet</span>
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
                    {NETWORKS[net].chain.testnet && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">Testnet</span>
                    )}
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
              <span className="rounded bg-brandBlue-300 px-1.5 py-0.5 text-[10px] font-semibold text-brandBlue-900">Default</span>
            )}
          </div>
          <a
            href={`${displayExplorerUrl}/address/${contractAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-mono font-medium text-brandBlue-800 hover:underline"
          >
            {contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

      {/* Custom Contract Toggle */}
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
            className={cn(
              INPUT,
              customAddressError && 'border-red-400 focus:border-red-500 focus:ring-red-200'
            )}
          />
          {customAddressError && (
            <p className="flex items-center gap-1.5 text-xs text-red-600">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {customAddressError}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleUseCustomContract}
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
            <button
              type="button"
              onClick={handleUseDefaultContract}
              className={cn(BTN, 'flex-1 bg-slate-500 hover:bg-slate-600')}
            >
              Reset to default
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={fetchNFTInfo}
        className={cn(BTN, 'flex items-center justify-center gap-1.5 bg-brandBlue-700 hover:bg-brandBlue-600')}
      >
        <RefreshCw className="h-4 w-4" /> Refresh contract data
      </button>
      </div>

      {/* Contract Error Banner */}
      {/* {contractError && (
        <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-red-300 font-medium">Contract Error</p>
              <p className="text-[10px] text-red-400/80 mt-1">{contractError}</p>
            </div>
            <button
              onClick={() => setContractError(null)}
              className="text-red-400/60 hover:text-red-400 text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      )} */}

      {walletConnected && currentChain?.id !== networkConfig.chainId && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-400 bg-amber-50 px-4 py-3 shadow-sm">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
          <div className="flex-1 text-sm text-amber-900">
            <span className="font-semibold">Wrong network.</span> Your wallet is on{' '}
            <span className="font-mono">{currentChain?.name ?? 'unknown'}</span> but this contract is on{' '}
            <span className="font-mono">{networkConfig.name}</span>.
          </div>
          <button
            type="button"
            onClick={async () => {
              if (!switchChainAsync) return;
              try {
                await switchChainAsync({ chainId: networkConfig.chainId });
              } catch {
                /* user rejected or unsupported */
              }
            }}
            className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-400"
          >
            Switch network
          </button>
        </div>
      )}

      {txStatus.status !== 'idle' && (
        <div className={cn(
          'fixed bottom-6 right-6 z-50 flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-xl transition-all',
          txStatus.status === 'pending' && 'border-brandBlue-400 bg-brandBlue-900 text-white',
          txStatus.status === 'success' && 'border-emerald-400 bg-emerald-900 text-white',
          txStatus.status === 'error' && 'border-red-400 bg-red-900 text-white'
        )}>
          {txStatus.status === 'pending' && <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-brandBlue-300" />}
          {txStatus.status === 'success' && <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />}
          {txStatus.status === 'error' && <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{txStatus.message}</p>
            {txStatus.hash && (
              <a href={`${explorerUrl}/tx/${txStatus.hash}`} target="_blank" rel="noopener noreferrer"
                className="mt-1 flex items-center gap-1 text-xs opacity-80 hover:opacity-100 hover:underline">
                View on explorer <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Write Operations — xl: 4 columns → 4 + 3 rows */}
      {isConnected && walletConnected && (
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 border-b border-brandBlue-400 pb-2 text-lg font-bold text-brandBlue-900">
            <Send className="h-5 w-5 text-brandBlue-800" />
            Write operations
          </h2>
          <div className={GRID_WRITE}>
          {/* Mint (to self) */}
          <div className={cn(BOX, OP_CARD)}>
            <div className="flex shrink-0 items-center gap-2">
              <Sparkles className="h-5 w-5 text-brandBlue-700" />
              <span className="text-base font-semibold text-slate-900">Mint (to yourself)</span>
            </div>
            <div className={OP_MAIN}>
              <p className="text-xs text-slate-600">Create one NFT in your connected wallet.</p>
            </div>
            <div className={OP_FOOTER}>
              <button type="button" onClick={handleMint} disabled={txStatus.status === 'pending'}
                className={cn(BTN, 'bg-brandBlue-700 hover:bg-brandBlue-600')}>
                Mint NFT
              </button>
            </div>
          </div>

          {/* Mint To */}
          <div className={cn(BOX, OP_CARD)}>
            <div className="flex shrink-0 items-center gap-2">
              <Sparkles className="h-5 w-5 text-brandBlue-600" />
              <span className="text-base font-semibold text-slate-900">Mint to address</span>
            </div>
            <div className={OP_MAIN}>
              <input type="text" value={mintToAddress} onChange={(e) => setMintToAddress(e.target.value)}
                placeholder="To address (0x...)"
                className={INPUT} />
            </div>
            <div className={OP_FOOTER}>
              <button type="button" onClick={handleMintTo} disabled={txStatus.status === 'pending'}
                className={cn(BTN, 'bg-brandBlue-600 hover:bg-brandBlue-500')}>
                Mint to
              </button>
            </div>
          </div>

          {/* Safe Mint */}
          <div className={cn(BOX, OP_CARD)}>
            <div className="flex shrink-0 items-center gap-2">
              <Shield className="h-5 w-5 text-brandBlue-700" />
              <span className="text-base font-semibold text-slate-900">Safe mint</span>
            </div>
            <div className={OP_MAIN}>
              <input type="text" value={safeMintToAddress} onChange={(e) => setSafeMintToAddress(e.target.value)}
                placeholder="To address (0x...)"
                className={INPUT} />
            </div>
            <div className={OP_FOOTER}>
              <button type="button" onClick={handleSafeMint} disabled={txStatus.status === 'pending'}
                className={cn(BTN, 'bg-brandBlue-700 hover:bg-brandBlue-600')}>
                Safe mint
              </button>
            </div>
          </div>

          {/* Safe Transfer */}
          <div className={cn(BOX, OP_CARD)}>
            <span className="shrink-0 text-base font-semibold text-slate-900">Safe transfer</span>
            <div className={OP_MAIN}>
              <input type="text" value={transferFrom} onChange={(e) => setTransferFrom(e.target.value)}
                placeholder="From (0x...)"
                className={INPUT} />
              <input type="text" value={transferTo} onChange={(e) => setTransferTo(e.target.value)}
                placeholder="To (0x...)"
                className={INPUT} />
              <input type="number" value={transferTokenId} onChange={(e) => setTransferTokenId(e.target.value)}
                placeholder="Token ID"
                className={INPUT} />
            </div>
            <div className={OP_FOOTER}>
              <button type="button" onClick={handleTransfer} disabled={txStatus.status === 'pending'}
                className={cn(BTN, 'bg-brandBlue-800 hover:bg-brandBlue-700')}>
                Transfer NFT
              </button>
            </div>
          </div>

          {/* Approve */}
          <div className={cn(BOX, OP_CARD)}>
            <div className="flex shrink-0 items-center gap-2">
              <Shield className="h-5 w-5 text-brandBlue-700" />
              <span className="text-base font-semibold text-slate-900">Approve token</span>
            </div>
            <div className={OP_MAIN}>
              <input type="text" value={approveAddress} onChange={(e) => setApproveAddress(e.target.value)}
                placeholder="Approved address (0x...)"
                className={INPUT} />
              <input type="number" value={approveTokenId} onChange={(e) => setApproveTokenId(e.target.value)}
                placeholder="Token ID"
                className={INPUT} />
            </div>
            <div className={OP_FOOTER}>
              <button type="button" onClick={handleApprove} disabled={txStatus.status === 'pending'}
                className={cn(BTN, 'bg-brandBlue-700 hover:bg-brandBlue-600')}>
                Approve
              </button>
            </div>
          </div>

          {/* Set Approval For All */}
          <div className={cn(BOX, OP_CARD)}>
            <div className="flex shrink-0 items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-brandBlue-800" />
              <span className="text-base font-semibold text-slate-900">Set approval for all</span>
            </div>
            <div className={OP_MAIN}>
              <input type="text" value={operatorAddress} onChange={(e) => setOperatorAddress(e.target.value)}
                placeholder="Operator (0x...)"
                className={INPUT} />
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={operatorApproved} onChange={(e) => setOperatorApproved(e.target.checked)}
                  className="h-4 w-4 rounded border border-brandBlue-400 text-brandBlue-700 focus:ring-brandBlue-500" />
                Grant approval
              </label>
            </div>
            <div className={OP_FOOTER}>
              <button type="button" onClick={handleSetApprovalForAll} disabled={txStatus.status === 'pending'}
                className={cn(BTN, 'bg-brandBlue-900 hover:bg-brandBlue-800')}>
                {operatorApproved ? 'Grant' : 'Revoke'} access
              </button>
            </div>
          </div>

          {/* Burn */}
          <div className={cn(BOX, OP_CARD, 'border-red-300/90 bg-red-50/40')}>
            <div className="flex shrink-0 items-center gap-2">
              <Flame className="h-5 w-5 text-red-700" />
              <span className="text-base font-semibold text-slate-900">Burn NFT</span>
            </div>
            <div className={OP_MAIN}>
              <input type="number" value={burnTokenId} onChange={(e) => setBurnTokenId(e.target.value)}
                placeholder="Token ID"
                className={INPUT} />
            </div>
            <div className={OP_FOOTER}>
              <button type="button" onClick={handleBurn} disabled={txStatus.status === 'pending'}
                className={cn(BTN, 'bg-red-600 hover:bg-red-500')}>
                Burn
              </button>
            </div>
          </div>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm font-semibold text-brandBlue-800 hover:text-brandBlue-600"
            >
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Advanced mint options
            </button>

            {showAdvanced && (
              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className={cn(BOX, OP_CARD)}>
                  <div className="flex shrink-0 items-center gap-2">
                    <Sparkles className="h-5 w-5 text-brandBlue-700" />
                    <span className="text-base font-semibold text-slate-900">Batch mint</span>
                  </div>
                  <div className={OP_MAIN}>
                    <p className="text-xs text-slate-600">Mint multiple NFTs in one transaction. Max 20 per tx.</p>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={batchCount}
                      onChange={(e) => setBatchCount(e.target.value)}
                      placeholder="Count (1–20)"
                      className={INPUT}
                    />
                  </div>
                  <div className={OP_FOOTER}>
                    <button
                      type="button"
                      onClick={handleBatchMint}
                      disabled={txStatus.status === 'pending'}
                      className={cn(BTN, 'bg-brandBlue-700 hover:bg-brandBlue-600')}
                    >
                      Batch mint
                    </button>
                  </div>
                </div>

                <div className={cn(BOX, OP_CARD)}>
                  <div className="flex shrink-0 items-center gap-2">
                    <Shield className="h-5 w-5 text-brandBlue-700" />
                    <span className="text-base font-semibold text-slate-900">Whitelist mint</span>
                  </div>
                  <div className={OP_MAIN}>
                    <p className="text-xs text-slate-600">Mint using a Merkle proof. Paste comma-separated proof hashes.</p>
                    <textarea
                      value={whitelistProof}
                      onChange={(e) => setWhitelistProof(e.target.value)}
                      placeholder="0xabc..., 0xdef..., ..."
                      rows={3}
                      className={cn(INPUT, 'resize-none')}
                    />
                  </div>
                  <div className={OP_FOOTER}>
                    <button
                      type="button"
                      onClick={handleWhitelistMint}
                      disabled={txStatus.status === 'pending'}
                      className={cn(BTN, 'bg-brandBlue-700 hover:bg-brandBlue-600')}
                    >
                      Whitelist mint
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      )}


      {/* Read Operations — xl: single row of 4 */}
      {isConnected && (
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 border-b border-brandBlue-400 pb-2 text-lg font-bold text-brandBlue-900">
            <User className="h-5 w-5 text-brandBlue-800" />
            Read operations
          </h2>
          <div className={GRID_READ}>
          {/* Owner Of */}
          <div className={cn(BOX, OP_CARD)}>
            <span className="shrink-0 text-base font-semibold text-slate-900">Owner of</span>
            <div className={cn(OP_MAIN, 'overflow-y-auto')}>
              <input type="number" value={ownerOfTokenId} onChange={(e) => setOwnerOfTokenId(e.target.value)}
                placeholder="Token ID"
                className={INPUT} />
              {ownerOfResult && (
                <div className="rounded-lg border border-brandBlue-300 bg-brandBlue-100/60 p-2">
                  <p className="text-[10px] font-semibold uppercase text-brandBlue-900">Owner</p>
                  <p className="mt-0.5 break-all font-mono text-xs text-slate-900">{ownerOfResult}</p>
                </div>
              )}
            </div>
            <div className={OP_FOOTER}>
              <button type="button" onClick={checkOwnerOf}
                className={cn(BTN, 'bg-brandBlue-600 hover:bg-brandBlue-500')}>
                Check owner
              </button>
            </div>
          </div>

          {/* Balance Of */}
          <div className={cn(BOX, OP_CARD)}>
            <span className="shrink-0 text-base font-semibold text-slate-900">Balance of</span>
            <div className={cn(OP_MAIN, 'overflow-y-auto')}>
              <input type="text" value={balanceCheckAddress} onChange={(e) => setBalanceCheckAddress(e.target.value)}
                placeholder="Address (0x...)"
                className={INPUT} />
              {balanceCheckResult && (
                <div className="rounded-lg border border-brandBlue-300 bg-brandBlue-100/60 p-2">
                  <p className="text-xs text-slate-800">
                    NFTs owned: <span className="font-bold text-brandBlue-900">{balanceCheckResult}</span>
                  </p>
                </div>
              )}
            </div>
            <div className={OP_FOOTER}>
              <button type="button" onClick={checkBalance}
                className={cn(BTN, 'bg-brandBlue-600 hover:bg-brandBlue-500')}>
                Check balance
              </button>
            </div>
          </div>

          {/* Get Approved */}
          <div className={cn(BOX, OP_CARD)}>
            <span className="shrink-0 text-base font-semibold text-slate-900">Get approved</span>
            <div className={cn(OP_MAIN, 'overflow-y-auto')}>
              <input type="number" value={getApprovedTokenId} onChange={(e) => setGetApprovedTokenId(e.target.value)}
                placeholder="Token ID"
                className={INPUT} />
              {getApprovedResult && (
                <div className="rounded-lg border border-brandBlue-300 bg-brandBlue-100/60 p-2">
                  <p className="text-[10px] font-semibold uppercase text-brandBlue-900">Approved</p>
                  <p className="mt-0.5 break-all font-mono text-xs text-slate-900">{getApprovedResult}</p>
                </div>
              )}
            </div>
            <div className={OP_FOOTER}>
              <button type="button" onClick={checkGetApproved}
                className={cn(BTN, 'bg-brandBlue-600 hover:bg-brandBlue-500')}>
                Check approved
              </button>
            </div>
          </div>

          {/* Is Approved For All */}
          <div className={cn(BOX, OP_CARD)}>
            <div className="flex shrink-0 items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-brandBlue-800" />
              <span className="text-base font-semibold text-slate-900">Is approved for all</span>
            </div>
            <div className={cn(OP_MAIN, 'overflow-y-auto')}>
              <input type="text" value={approvalCheckOwner} onChange={(e) => setApprovalCheckOwner(e.target.value)}
                placeholder="Owner (0x...)"
                className={INPUT} />
              <input type="text" value={approvalCheckOperator} onChange={(e) => setApprovalCheckOperator(e.target.value)}
                placeholder="Operator (0x...)"
                className={INPUT} />
              {approvalCheckResult !== null && (
                <div className={cn(
                  'rounded-lg border p-2',
                  approvalCheckResult ? 'border-emerald-400 bg-emerald-50' : 'border-red-300 bg-red-50'
                )}>
                  <p className={cn('text-xs font-semibold', approvalCheckResult ? 'text-emerald-900' : 'text-red-900')}>
                    {approvalCheckResult ? '✓ Operator is approved' : '✗ Operator is not approved'}
                  </p>
                </div>
              )}
            </div>
            <div className={OP_FOOTER}>
              <button type="button" onClick={checkApprovalForAll}
                className={cn(BTN, 'bg-brandBlue-600 hover:bg-brandBlue-500')}>
                Check approval
              </button>
            </div>
          </div>
          </div>

          <div className={cn(BOX, 'space-y-3')}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Admin UI</p>
            {adminControlsUnlocked ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-emerald-800">Admin controls are visible for this session.</p>
                <button
                  type="button"
                  onClick={() => {
                    setAdminControlsUnlocked(false);
                    setShowAdminUnlockForm(false);
                    setAdminPasswordInput('');
                    setAdminUnlockError(null);
                  }}
                  className={cn(BTN, 'shrink-0 bg-slate-600 hover:bg-slate-500 sm:w-auto sm:min-w-[8rem]')}
                >
                  Hide admin
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {!showAdminUnlockForm ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdminUnlockForm(true);
                      setAdminUnlockError(null);
                    }}
                    className={cn(BTN, 'bg-brandBlue-800 hover:bg-brandBlue-700')}
                  >
                    Enable admin control
                  </button>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <label htmlFor="admin-panel-password" className="text-xs font-medium text-slate-700">
                        Password
                      </label>
                      <input
                        id="admin-panel-password"
                        type="password"
                        autoComplete="off"
                        value={adminPasswordInput}
                        onChange={(e) => {
                          setAdminPasswordInput(e.target.value);
                          setAdminUnlockError(null);
                        }}
                        placeholder="Enter password"
                        className={INPUT}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 sm:pb-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (adminPasswordInput === ADMIN_PANEL_PASSWORD) {
                            setAdminControlsUnlocked(true);
                            setShowAdminUnlockForm(false);
                            setAdminPasswordInput('');
                            setAdminUnlockError(null);
                          } else {
                            setAdminUnlockError('Incorrect password');
                          }
                        }}
                        className={cn(BTN, 'bg-brandBlue-700 hover:bg-brandBlue-600 sm:w-auto sm:min-w-[6rem]')}
                      >
                        Unlock
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAdminUnlockForm(false);
                          setAdminPasswordInput('');
                          setAdminUnlockError(null);
                        }}
                        className={cn(BTN, 'bg-slate-500 hover:bg-slate-400 sm:w-auto sm:min-w-[6rem]')}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                {adminUnlockError && (
                  <p className="flex items-center gap-1.5 text-xs text-red-600">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {adminUnlockError}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {isConnected && walletConnected && adminControlsUnlocked && (
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 border-b border-brandBlue-400 pb-2 text-lg font-bold text-brandBlue-900">
            <Shield className="h-5 w-5 text-brandBlue-800" />
            Admin controls
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className={cn(BOX, OP_CARD)}>
              <span className="shrink-0 text-base font-semibold text-slate-900">Pause contract</span>
              <div className={OP_MAIN}>
                <p className="text-xs text-slate-600">Pause or unpause all minting operations.</p>
                {isPausedState !== null && (
                  <div className={cn(
                    'rounded-lg border px-3 py-2 text-xs font-semibold',
                    isPausedState ? 'border-red-300 bg-red-50 text-red-800' : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  )}>
                    {isPausedState ? '⏸ Contract is paused' : '▶ Contract is active'}
                  </div>
                )}
              </div>
              <div className={cn(OP_FOOTER, 'flex gap-2')}>
                <button
                  type="button"
                  disabled={txStatus.status === 'pending'}
                  onClick={async () => {
                    try {
                      const c = await getWriteContract();
                      if (c) handleTransaction(() => c.setPaused(true), 'Contract paused');
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
                  disabled={txStatus.status === 'pending'}
                  onClick={async () => {
                    try {
                      const c = await getWriteContract();
                      if (c) handleTransaction(() => c.setPaused(false), 'Contract unpaused');
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

            <div className={cn(BOX, OP_CARD)}>
              <span className="shrink-0 text-base font-semibold text-slate-900">Mint price</span>
              <div className={OP_MAIN}>
                <p className="text-xs text-slate-600">Set price in ETH per mint. Use 0 for free minting.</p>
                <input
                  type="text"
                  value={adminMintPrice}
                  onChange={(e) => setAdminMintPrice(e.target.value)}
                  placeholder="e.g. 0.01"
                  className={INPUT}
                />
              </div>
              <div className={OP_FOOTER}>
                <button
                  type="button"
                  disabled={txStatus.status === 'pending'}
                  onClick={async () => {
                    try {
                      const c = await getWriteContract();
                      if (c && adminMintPrice) {
                        const wei = ethers.parseEther(adminMintPrice);
                        handleTransaction(
                          () => c.setMintPrice(wei),
                          `Mint price set to ${adminMintPrice} ETH`
                        );
                      }
                    } catch (e: unknown) {
                      setTxStatus({ status: 'error', message: e instanceof Error ? e.message : 'Failed' });
                      setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
                    }
                  }}
                  className={cn(BTN, 'bg-brandBlue-700 hover:bg-brandBlue-600')}
                >
                  Set price
                </button>
              </div>
            </div>

            <div className={cn(BOX, OP_CARD)}>
              <span className="shrink-0 text-base font-semibold text-slate-900">Max per wallet</span>
              <div className={OP_MAIN}>
                <p className="text-xs text-slate-600">Limit NFTs per wallet. Set 0 for unlimited.</p>
                <input
                  type="number"
                  value={adminMaxPerWallet}
                  onChange={(e) => setAdminMaxPerWallet(e.target.value)}
                  placeholder="e.g. 5"
                  className={INPUT}
                />
              </div>
              <div className={OP_FOOTER}>
                <button
                  type="button"
                  disabled={txStatus.status === 'pending'}
                  onClick={async () => {
                    try {
                      const c = await getWriteContract();
                      if (c && adminMaxPerWallet !== '') {
                        handleTransaction(
                          () => c.setMaxPerWallet(BigInt(adminMaxPerWallet)),
                          `Max set to ${adminMaxPerWallet}`
                        );
                      }
                    } catch (e: unknown) {
                      setTxStatus({ status: 'error', message: e instanceof Error ? e.message : 'Failed' });
                      setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
                    }
                  }}
                  className={cn(BTN, 'bg-brandBlue-700 hover:bg-brandBlue-600')}
                >
                  Set limit
                </button>
              </div>
            </div>

            <div className={cn(BOX, OP_CARD)}>
              <span className="shrink-0 text-base font-semibold text-slate-900">Whitelist root</span>
              <div className={OP_MAIN}>
                <p className="text-xs text-slate-600">Set Merkle root to enable whitelist. Set to 0x000...0 to disable.</p>
                <input
                  type="text"
                  value={adminMerkleRoot}
                  onChange={(e) => setAdminMerkleRoot(e.target.value)}
                  placeholder="0x..."
                  className={INPUT}
                />
              </div>
              <div className={OP_FOOTER}>
                <button
                  type="button"
                  disabled={txStatus.status === 'pending'}
                  onClick={async () => {
                    try {
                      const c = await getWriteContract();
                      if (c && adminMerkleRoot) {
                        handleTransaction(() => c.setMerkleRoot(adminMerkleRoot), 'Merkle root updated');
                      }
                    } catch (e: unknown) {
                      setTxStatus({ status: 'error', message: e instanceof Error ? e.message : 'Failed' });
                      setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 5000);
                    }
                  }}
                  className={cn(BTN, 'bg-brandBlue-700 hover:bg-brandBlue-600')}
                >
                  Set root
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isConnected && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              setShowGallery(!showGallery);
              if (!showGallery && galleryTokens.length === 0) void loadGallery();
            }}
            className="flex w-full items-center justify-between rounded-xl border border-brandBlue-400 bg-white/85 px-4 py-3 text-left shadow-md transition-colors hover:bg-brandBlue-50"
          >
            <div className="flex items-center gap-2">
              <Image className="h-5 w-5 text-brandBlue-700" />
              <span className="text-base font-semibold text-brandBlue-900">NFT Gallery</span>
              {galleryTokens.length > 0 && (
                <span className="rounded-full bg-brandBlue-200 px-2 py-0.5 text-xs font-medium text-brandBlue-900">
                  {galleryTokens.length}
                </span>
              )}
            </div>
            {showGallery ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showGallery && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Showing minted NFTs from last 10,000 blocks. Max 20.
                </p>
                <button
                  type="button"
                  onClick={() => void loadGallery()}
                  disabled={galleryLoading}
                  className="flex items-center gap-1.5 rounded-lg border border-brandBlue-300 bg-white px-3 py-1.5 text-xs font-medium text-brandBlue-800 hover:bg-brandBlue-50 disabled:opacity-50"
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', galleryLoading && 'animate-spin')} /> Refresh
                </button>
              </div>

              {galleryLoading && (
                <div className="flex items-center justify-center rounded-xl border border-brandBlue-200 bg-white/60 py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-brandBlue-600" />
                </div>
              )}

              {galleryError && (
                <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {galleryError}
                </div>
              )}

              {!galleryLoading && galleryTokens.length === 0 && !galleryError && (
                <div className="rounded-xl border border-brandBlue-200 bg-white/60 py-12 text-center text-sm text-slate-500">
                  No NFTs found in recent blocks.
                </div>
              )}

              {!galleryLoading && galleryTokens.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                  {galleryTokens.map((token) => {
                    const metaName = token.metadata?.name;
                    const title =
                      typeof metaName === 'string' ? metaName : `#${token.id}`;
                    return (
                      <div key={token.id} className={cn(BOX, 'flex flex-col gap-2 p-3')}>
                        <div className="aspect-square w-full overflow-hidden rounded-lg border border-brandBlue-200 bg-brandBlue-50">
                          {token.imageUrl ? (
                            <img
                              src={token.imageUrl}
                              alt={`NFT #${token.id}`}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <Image className="h-8 w-8 text-brandBlue-300" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{title}</p>
                          <p className="mt-0.5 truncate font-mono text-[10px] text-slate-500">
                            {token.owner.slice(0, 6)}...{token.owner.slice(-4)}
                          </p>
                        </div>
                        <a
                          href={`${explorerUrl}/token/${contractAddress}?a=${token.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] text-brandBlue-700 hover:underline"
                        >
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
