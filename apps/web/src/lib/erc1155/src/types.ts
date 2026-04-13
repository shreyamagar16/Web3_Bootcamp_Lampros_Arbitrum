export interface TokenInfo {
  id: string;
  isNft: boolean;
  uri: string;
  totalSupply: string;
  userBalance: string;
}

export interface TxStatus {
  status: 'idle' | 'pending' | 'success' | 'error';
  message: string;
  hash?: string;
}
