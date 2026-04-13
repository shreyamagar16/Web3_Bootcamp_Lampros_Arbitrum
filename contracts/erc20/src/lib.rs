extern crate alloc;

use alloc::string::String;
use core::marker::PhantomData;
use stylus_sdk::{evm, msg, prelude::*};
use alloy_primitives::{Address, U256};
use alloy_sol_types::sol;

pub trait ERC20Params {
    const NAME: &'static str;
    const SYMBOL: &'static str;
    const DECIMALS: u8;
}

struct TokenParams;

impl ERC20Params for TokenParams {
    const NAME: &'static str = "MyToken";
    const SYMBOL: &'static str = "MTK";
    const DECIMALS: u8 = 18;
}

sol_storage! {
    #[entrypoint]
    struct ERC20Token {
        mapping(address => uint256) balances;
        mapping(address => mapping(address => uint256)) allowances;
        uint256 total_supply;
        address owner;
        bool paused;
        PhantomData<TokenParams> phantom;
    }
}

sol! {
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    error InsufficientBalance(address account, uint256 balance, uint256 needed);
    error InsufficientAllowance(address owner, address spender, uint256 allowance, uint256 needed);
    error ContractPaused();
    error NotOwner();
    error TransferToZero();
    error MintToZero();
    error AlreadyInitialized();
    error ZeroAddress();
}

#[derive(SolidityError)]
pub enum ERC20Error {
    InsufficientBalance(InsufficientBalance),
    InsufficientAllowance(InsufficientAllowance),
    ContractPaused(ContractPaused),
    NotOwner(NotOwner),
    TransferToZero(TransferToZero),
    MintToZero(MintToZero),
    AlreadyInitialized(AlreadyInitialized),
    ZeroAddress(ZeroAddress),
}

impl ERC20Token {
    fn require_owner(&self) -> Result<(), ERC20Error> {
        if msg::sender() != self.owner.get() {
            return Err(ERC20Error::NotOwner(NotOwner {}));
        }
        Ok(())
    }

    fn require_not_paused(&self) -> Result<(), ERC20Error> {
        if self.paused.get() {
            return Err(ERC20Error::ContractPaused(ContractPaused {}));
        }
        Ok(())
    }
}

#[public]
impl ERC20Token {
    pub fn initialize(&mut self, new_owner: Address, initial_supply: U256) -> Result<(), ERC20Error> {
        if !self.owner.get().is_zero() {
            return Err(ERC20Error::AlreadyInitialized(AlreadyInitialized {}));
        }
        if new_owner.is_zero() {
            return Err(ERC20Error::ZeroAddress(ZeroAddress {}));
        }
        self.owner.set(new_owner);
        self.paused.set(false);
        if !initial_supply.is_zero() {
            self.balances.setter(new_owner).set(initial_supply);
            self.total_supply.set(initial_supply);
            evm::log(Transfer {
                from: Address::default(),
                to: new_owner,
                value: initial_supply,
            });
        }
        Ok(())
    }

    pub fn name() -> Result<String, ERC20Error> {
        Ok(TokenParams::NAME.into())
    }

    pub fn symbol() -> Result<String, ERC20Error> {
        Ok(TokenParams::SYMBOL.into())
    }

    pub fn decimals() -> Result<u8, ERC20Error> {
        Ok(TokenParams::DECIMALS)
    }

    #[selector(name = "totalSupply")]
    pub fn total_supply_read(&self) -> Result<U256, ERC20Error> {
        Ok(self.total_supply.get())
    }

    #[selector(name = "balanceOf")]
    pub fn balance_of(&self, account: Address) -> Result<U256, ERC20Error> {
        Ok(self.balances.get(account))
    }

    pub fn transfer(&mut self, to: Address, amount: U256) -> Result<bool, ERC20Error> {
        self.require_not_paused()?;
        if to.is_zero() {
            return Err(ERC20Error::TransferToZero(TransferToZero {}));
        }
        let sender = msg::sender();
        let bal = self.balances.get(sender);
        if bal < amount {
            return Err(ERC20Error::InsufficientBalance(InsufficientBalance {
                account: sender,
                balance: bal,
                needed: amount,
            }));
        }
        self.balances.setter(sender).set(bal - amount);
        let to_bal = self.balances.get(to);
        self.balances.setter(to).set(to_bal + amount);
        evm::log(Transfer {
            from: sender,
            to,
            value: amount,
        });
        Ok(true)
    }

    #[selector(name = "allowance")]
    pub fn allowance_read(&self, owner_addr: Address, spender: Address) -> Result<U256, ERC20Error> {
        Ok(self.allowances.getter(owner_addr).get(spender))
    }

    pub fn approve(&mut self, spender: Address, amount: U256) -> Result<bool, ERC20Error> {
        let owner_addr = msg::sender();
        self.allowances
            .setter(owner_addr)
            .setter(spender)
            .set(amount);
        evm::log(Approval {
            owner: owner_addr,
            spender,
            value: amount,
        });
        Ok(true)
    }

    #[selector(name = "transferFrom")]
    pub fn transfer_from(&mut self, from: Address, to: Address, amount: U256) -> Result<bool, ERC20Error> {
        self.require_not_paused()?;
        if to.is_zero() {
            return Err(ERC20Error::TransferToZero(TransferToZero {}));
        }
        let spender = msg::sender();
        let allowed = self.allowances.getter(from).get(spender);
        if allowed < amount {
            return Err(ERC20Error::InsufficientAllowance(InsufficientAllowance {
                owner: from,
                spender,
                allowance: allowed,
                needed: amount,
            }));
        }
        let bal = self.balances.get(from);
        if bal < amount {
            return Err(ERC20Error::InsufficientBalance(InsufficientBalance {
                account: from,
                balance: bal,
                needed: amount,
            }));
        }
        self.allowances.setter(from).setter(spender).set(allowed - amount);
        self.balances.setter(from).set(bal - amount);
        let to_bal = self.balances.get(to);
        self.balances.setter(to).set(to_bal + amount);
        evm::log(Transfer {
            from,
            to,
            value: amount,
        });
        Ok(true)
    }

    pub fn mint(&mut self, to: Address, amount: U256) -> Result<(), ERC20Error> {
        self.require_owner()?;
        self.require_not_paused()?;
        if to.is_zero() {
            return Err(ERC20Error::MintToZero(MintToZero {}));
        }
        if amount.is_zero() {
            return Ok(());
        }
        let ts = self.total_supply.get();
        self.total_supply.set(ts + amount);
        let b = self.balances.get(to);
        self.balances.setter(to).set(b + amount);
        evm::log(Transfer {
            from: Address::default(),
            to,
            value: amount,
        });
        Ok(())
    }

    pub fn burn(&mut self, amount: U256) -> Result<(), ERC20Error> {
        self.require_not_paused()?;
        let sender = msg::sender();
        let bal = self.balances.get(sender);
        if bal < amount {
            return Err(ERC20Error::InsufficientBalance(InsufficientBalance {
                account: sender,
                balance: bal,
                needed: amount,
            }));
        }
        self.balances.setter(sender).set(bal - amount);
        let ts = self.total_supply.get();
        self.total_supply.set(ts - amount);
        evm::log(Transfer {
            from: sender,
            to: Address::default(),
            value: amount,
        });
        Ok(())
    }

    pub fn set_paused(&mut self, paused: bool) -> Result<(), ERC20Error> {
        self.require_owner()?;
        self.paused.set(paused);
        Ok(())
    }

    pub fn is_paused(&self) -> Result<bool, ERC20Error> {
        Ok(self.paused.get())
    }
}
