extern crate alloc;

mod erc721;

use alloc::vec::Vec;
use core::cmp::Ordering;
use stylus_sdk::{
    crypto::keccak,
    msg,
    prelude::*,
    alloy_primitives::{Address, B256, U256},
};
use alloy_sol_types::sol;
use crate::erc721::{Erc721, Erc721Params};

struct RobinhoodNFTParams;

impl Erc721Params for RobinhoodNFTParams {
    const NAME: &'static str = "RobinhoodNFT";
    const SYMBOL: &'static str = "RHNFT";
}

sol_storage! {
    #[entrypoint]
    struct RobinhoodNFT {
        address art_contract_address;

        address owner;
        bool paused;
        uint256 mint_price;
        uint256 max_per_wallet;
        mapping(address => uint256) wallet_mints;
        bytes32 merkle_root;

        #[borrow]
        Erc721<RobinhoodNFTParams> erc721;
    }
}

sol! {
    error ContractPaused();
    error NotOwner();
    error WalletLimitReached(address wallet, uint256 limit);
    error NotWhitelisted(address wallet);
    error InsufficientPayment(uint256 sent, uint256 required);
    error InvalidProof();
    error BatchTooLarge(uint256 count);
    error ZeroAddress();
    error AlreadyInitialized();
}

#[derive(SolidityError)]
pub enum RobinhoodNFTError {
    ContractPaused(ContractPaused),
    NotOwner(NotOwner),
    WalletLimitReached(WalletLimitReached),
    NotWhitelisted(NotWhitelisted),
    InsufficientPayment(InsufficientPayment),
    InvalidProof(InvalidProof),
    BatchTooLarge(BatchTooLarge),
    ZeroAddress(ZeroAddress),
    AlreadyInitialized(AlreadyInitialized),
}

fn verify_merkle_proof(proof: &[B256], root: B256, leaf: B256) -> bool {
    let mut computed = leaf;
    for p in proof.iter() {
        let p = *p;
        let (a, b) = match computed.as_slice().cmp(p.as_slice()) {
            Ordering::Greater => (p, computed),
            _ => (computed, p),
        };
        let mut buf = [0u8; 64];
        buf[..32].copy_from_slice(a.as_slice());
        buf[32..].copy_from_slice(b.as_slice());
        computed = keccak(buf);
    }
    computed == root
}

impl RobinhoodNFT {
    fn require_not_paused(&self) -> Result<(), RobinhoodNFTError> {
        if self.paused.get() {
            return Err(RobinhoodNFTError::ContractPaused(ContractPaused {}));
        }
        Ok(())
    }

    fn require_contract_owner(&self) -> Result<(), RobinhoodNFTError> {
        if msg::sender() != self.owner.get() {
            return Err(RobinhoodNFTError::NotOwner(NotOwner {}));
        }
        Ok(())
    }

    fn merkle_disabled(&self) -> bool {
        self.merkle_root.get() == B256::ZERO
    }

    fn check_wallet_limit(&self, who: Address, additional: U256) -> Result<(), RobinhoodNFTError> {
        let max = self.max_per_wallet.get();
        if max.is_zero() {
            return Ok(());
        }
        let current = self.wallet_mints.get(who);
        if current + additional > max {
            return Err(RobinhoodNFTError::WalletLimitReached(WalletLimitReached {
                wallet: who,
                limit: max,
            }));
        }
        Ok(())
    }

    fn take_payment(&self, required: U256) -> Result<(), RobinhoodNFTError> {
        let sent = msg::value();
        if sent < required {
            return Err(RobinhoodNFTError::InsufficientPayment(InsufficientPayment {
                sent,
                required,
            }));
        }
        Ok(())
    }

    fn bump_mints(&mut self, who: Address, n: U256) {
        let mut s = self.wallet_mints.setter(who);
        let cur = s.get();
        s.set(cur + n);
    }
}

#[public]
#[inherit(Erc721<RobinhoodNFTParams>)]
impl RobinhoodNFT {
    pub fn initialize(
        &mut self,
        new_owner: Address,
        mint_price: U256,
        max_per_wallet: U256,
    ) -> Result<(), Vec<u8>> {
        if !self.owner.get().is_zero() {
            return Err(RobinhoodNFTError::AlreadyInitialized(AlreadyInitialized {}).into());
        }
        if new_owner.is_zero() {
            return Err(RobinhoodNFTError::ZeroAddress(ZeroAddress {}).into());
        }
        self.owner.set(new_owner);
        self.mint_price.set(mint_price);
        self.max_per_wallet.set(max_per_wallet);
        self.paused.set(false);
        self.merkle_root.set(B256::ZERO);
        Ok(())
    }

    pub fn set_paused(&mut self, paused: bool) -> Result<(), Vec<u8>> {
        self.require_contract_owner().map_err(|e| e.into())?;
        self.paused.set(paused);
        Ok(())
    }

    pub fn set_mint_price(&mut self, price: U256) -> Result<(), Vec<u8>> {
        self.require_contract_owner().map_err(|e| e.into())?;
        self.mint_price.set(price);
        Ok(())
    }

    pub fn set_max_per_wallet(&mut self, max: U256) -> Result<(), Vec<u8>> {
        self.require_contract_owner().map_err(|e| e.into())?;
        self.max_per_wallet.set(max);
        Ok(())
    }

    pub fn set_merkle_root(&mut self, root: B256) -> Result<(), Vec<u8>> {
        self.require_contract_owner().map_err(|e| e.into())?;
        self.merkle_root.set(root);
        Ok(())
    }

    #[payable]
    pub fn mint(&mut self) -> Result<(), Vec<u8>> {
        self.require_not_paused().map_err(|e| e.into())?;
        if !self.merkle_disabled() {
            return Err(RobinhoodNFTError::NotWhitelisted(NotWhitelisted {
                wallet: msg::sender(),
            })
            .into());
        }
        let sender = msg::sender();
        self.check_wallet_limit(sender, U256::from(1u8)).map_err(|e| e.into())?;
        let price = self.mint_price.get();
        self.take_payment(price).map_err(|e| e.into())?;

        self.erc721.mint(sender).map_err(|e| e.into())?;
        self.bump_mints(sender, U256::from(1u8));
        Ok(())
    }

    pub fn mint_to(&mut self, to: Address) -> Result<(), Vec<u8>> {
        self.require_contract_owner().map_err(|e| e.into())?;
        self.erc721.mint(to).map_err(|e| e.into())?;
        Ok(())
    }

    #[payable]
    pub fn safe_mint(&mut self, to: Address) -> Result<(), Vec<u8>> {
        self.require_not_paused().map_err(|e| e.into())?;
        if !self.merkle_disabled() {
            return Err(RobinhoodNFTError::NotWhitelisted(NotWhitelisted {
                wallet: msg::sender(),
            })
            .into());
        }
        let sender = msg::sender();
        self.check_wallet_limit(sender, U256::from(1u8)).map_err(|e| e.into())?;
        let price = self.mint_price.get();
        self.take_payment(price).map_err(|e| e.into())?;

        Erc721::safe_mint(self, to, Vec::new()).map_err(|e| e.into())?;
        self.bump_mints(sender, U256::from(1u8));
        Ok(())
    }

    #[payable]
    pub fn batch_mint(&mut self, count: U256) -> Result<(), Vec<u8>> {
        self.require_not_paused().map_err(|e| e.into())?;
        if !self.merkle_disabled() {
            return Err(RobinhoodNFTError::NotWhitelisted(NotWhitelisted {
                wallet: msg::sender(),
            })
            .into());
        }

        if count.is_zero() || count > U256::from(20u8) {
            return Err(RobinhoodNFTError::BatchTooLarge(BatchTooLarge { count }).into());
        }

        let mut n: u32 = 0;
        for i in 1u32..=20u32 {
            if count == U256::from(i) {
                n = i;
                break;
            }
        }
        if n == 0 {
            return Err(RobinhoodNFTError::BatchTooLarge(BatchTooLarge { count }).into());
        }

        let sender = msg::sender();
        let n256 = U256::from(n);
        self.check_wallet_limit(sender, n256).map_err(|e| e.into())?;

        let unit = self.mint_price.get();
        let total = match unit.checked_mul(n256) {
            Some(t) => t,
            None => return Err(RobinhoodNFTError::BatchTooLarge(BatchTooLarge { count }).into()),
        };
        self.take_payment(total).map_err(|e| e.into())?;

        for _ in 0..n {
            self.erc721.mint(sender).map_err(|e| e.into())?;
        }
        self.bump_mints(sender, n256);
        Ok(())
    }

    #[payable]
    pub fn whitelist_mint(&mut self, proof: Vec<B256>) -> Result<(), Vec<u8>> {
        self.require_not_paused().map_err(|e| e.into())?;
        let root = self.merkle_root.get();
        if root == B256::ZERO {
            return Err(RobinhoodNFTError::InvalidProof(InvalidProof {}).into());
        }

        let sender = msg::sender();
        let leaf = keccak(sender.as_slice());

        if !verify_merkle_proof(&proof, root, leaf) {
            return Err(RobinhoodNFTError::InvalidProof(InvalidProof {}).into());
        }

        self.check_wallet_limit(sender, U256::from(1u8)).map_err(|e| e.into())?;
        let price = self.mint_price.get();
        self.take_payment(price).map_err(|e| e.into())?;

        self.erc721.mint(sender).map_err(|e| e.into())?;
        self.bump_mints(sender, U256::from(1u8));
        Ok(())
    }

    pub fn burn(&mut self, token_id: U256) -> Result<(), Vec<u8>> {
        self.erc721
            .burn(msg::sender(), token_id)
            .map_err(|e| e.into())?;
        Ok(())
    }

    pub fn get_wallet_mints(&self, wallet: Address) -> Result<U256, Vec<u8>> {
        Ok(self.wallet_mints.get(wallet))
    }

    pub fn is_paused(&self) -> Result<bool, Vec<u8>> {
        Ok(self.paused.get())
    }

    pub fn get_mint_price(&self) -> Result<U256, Vec<u8>> {
        Ok(self.mint_price.get())
    }

    pub fn get_max_per_wallet(&self) -> Result<U256, Vec<u8>> {
        Ok(self.max_per_wallet.get())
    }

    pub fn get_merkle_root(&self) -> Result<B256, Vec<u8>> {
        Ok(self.merkle_root.get())
    }

    /// Contract admin set in `initialize` (not ERC-721 token owner).
    pub fn get_owner(&self) -> Result<Address, Vec<u8>> {
        Ok(self.owner.get())
    }
}
