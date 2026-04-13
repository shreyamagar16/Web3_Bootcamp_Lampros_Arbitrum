export const EIP2981_ABI = [
  'function initialize(address owner, address defaultReceiver, uint256 defaultBps)',
  'function royaltyInfo(address nftContract, uint256 salePrice) view returns (address, uint256)',
  'function setRoyalty(address nftContract, address receiver, uint256 basisPoints)',
  'function setDefaultRoyalty(address receiver, uint256 basisPoints)',
  'function getRoyaltyInfo(address nftContract) view returns (address, uint256)',
  'function removeRoyalty(address nftContract)',
  'function supportsInterface(bytes4 interfaceId) view returns (bool)',
  'event RoyaltySet(address indexed nftContract, address indexed receiver, uint256 basisPoints)',
  'event DefaultRoyaltySet(address indexed receiver, uint256 basisPoints)',
];

export const DEFAULT_EIP2981_ADDRESSES: Record<string, string | undefined> = {
  'arbitrum-sepolia': undefined,
  arbitrum: undefined,
  superposition: undefined,
  'superposition-testnet': undefined,
  'robinhood-testnet': undefined,
};
