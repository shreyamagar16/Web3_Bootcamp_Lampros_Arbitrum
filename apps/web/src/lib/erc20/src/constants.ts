export const ERC20_ABI = [
  'function initialize(address owner, uint256 initialSupply)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'function mint(address to, uint256 amount)',
  'function burn(uint256 amount)',
  'function setPaused(bool paused)',
  'function isPaused() view returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
];

export const DEFAULT_ERC20_ADDRESSES: Record<string, string | undefined> = {
  'arbitrum-sepolia': undefined,
  arbitrum: undefined,
  superposition: undefined,
  'superposition-testnet': undefined,
  'robinhood-testnet': undefined,
};
