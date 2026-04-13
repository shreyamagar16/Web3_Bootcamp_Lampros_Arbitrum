extern crate alloc;

use stylus_sdk::{evm, msg, prelude::*};
use alloy_primitives::{Address, FixedBytes, U256};
use alloy_sol_types::sol;

sol_storage! {
    #[entrypoint]
    struct RoyaltyRegistry {
        address owner;
        mapping(address => address) royalty_receivers;
        mapping(address => uint256) royalty_basis_points;
        address default_receiver;
        uint256 default_basis_points;
    }
}

sol! {
    event RoyaltySet(address indexed nft_contract, address indexed receiver, uint256 basisPoints);
    event DefaultRoyaltySet(address indexed receiver, uint256 basisPoints);

    error NotOwner();
    error InvalidBasisPoints(uint256 bps);
    error ZeroAddress();
    error AlreadyInitialized();
}

#[derive(SolidityError)]
pub enum RoyaltyError {
    NotOwner(NotOwner),
    InvalidBasisPoints(InvalidBasisPoints),
    ZeroAddress(ZeroAddress),
    AlreadyInitialized(AlreadyInitialized),
}

const BPS_DENOM: u64 = 10_000;
const IERC2981_ID: u32 = 0x2a55205a;
const IERC165_ID: u32 = 0x01ffc9a7;

impl RoyaltyRegistry {
    fn require_owner(&self) -> Result<(), RoyaltyError> {
        if msg::sender() != self.owner.get() {
            return Err(RoyaltyError::NotOwner(NotOwner {}));
        }
        Ok(())
    }

    fn validate_bps(bps: U256) -> Result<(), RoyaltyError> {
        if bps > U256::from(BPS_DENOM) {
            return Err(RoyaltyError::InvalidBasisPoints(InvalidBasisPoints { bps }));
        }
        Ok(())
    }

    fn receiver_and_bps_for(&self, nft_contract: Address) -> (Address, U256) {
        let r = self.royalty_receivers.get(nft_contract);
        if !r.is_zero() {
            (r, self.royalty_basis_points.get(nft_contract))
        } else {
            (self.default_receiver.get(), self.default_basis_points.get())
        }
    }
}

#[public]
impl RoyaltyRegistry {
    pub fn initialize(
        &mut self,
        new_owner: Address,
        default_receiver: Address,
        default_bps: U256,
    ) -> Result<(), RoyaltyError> {
        if !self.owner.get().is_zero() {
            return Err(RoyaltyError::AlreadyInitialized(AlreadyInitialized {}));
        }
        if new_owner.is_zero() || default_receiver.is_zero() {
            return Err(RoyaltyError::ZeroAddress(ZeroAddress {}));
        }
        Self::validate_bps(default_bps)?;
        self.owner.set(new_owner);
        self.default_receiver.set(default_receiver);
        self.default_basis_points.set(default_bps);
        Ok(())
    }

    #[selector(name = "royaltyInfo")]
    pub fn royalty_info(
        &self,
        nft_contract: Address,
        sale_price: U256,
    ) -> Result<(Address, U256), RoyaltyError> {
        let (receiver, bps) = self.receiver_and_bps_for(nft_contract);
        let royalty = sale_price * bps / U256::from(BPS_DENOM);
        Ok((receiver, royalty))
    }

    #[selector(name = "setRoyalty")]
    pub fn set_royalty(
        &mut self,
        nft_contract: Address,
        receiver: Address,
        basis_points: U256,
    ) -> Result<(), RoyaltyError> {
        self.require_owner()?;
        if receiver.is_zero() {
            return Err(RoyaltyError::ZeroAddress(ZeroAddress {}));
        }
        Self::validate_bps(basis_points)?;
        self.royalty_receivers.setter(nft_contract).set(receiver);
        self.royalty_basis_points
            .setter(nft_contract)
            .set(basis_points);
        evm::log(RoyaltySet {
            nft_contract,
            receiver,
            basisPoints: basis_points,
        });
        Ok(())
    }

    #[selector(name = "setDefaultRoyalty")]
    pub fn set_default_royalty(
        &mut self,
        receiver: Address,
        basis_points: U256,
    ) -> Result<(), RoyaltyError> {
        self.require_owner()?;
        if receiver.is_zero() {
            return Err(RoyaltyError::ZeroAddress(ZeroAddress {}));
        }
        Self::validate_bps(basis_points)?;
        self.default_receiver.set(receiver);
        self.default_basis_points.set(basis_points);
        evm::log(DefaultRoyaltySet {
            receiver,
            basisPoints: basis_points,
        });
        Ok(())
    }

    #[selector(name = "getRoyaltyInfo")]
    pub fn get_royalty_info(
        &self,
        nft_contract: Address,
    ) -> Result<(Address, U256), RoyaltyError> {
        Ok(self.receiver_and_bps_for(nft_contract))
    }

    #[selector(name = "removeRoyalty")]
    pub fn remove_royalty(&mut self, nft_contract: Address) -> Result<(), RoyaltyError> {
        self.require_owner()?;
        self.royalty_receivers
            .setter(nft_contract)
            .set(Address::default());
        self.royalty_basis_points
            .setter(nft_contract)
            .set(U256::ZERO);
        Ok(())
    }

    #[selector(name = "supportsInterface")]
    pub fn supports_interface(interface_id: FixedBytes<4>) -> Result<bool, RoyaltyError> {
        let b: [u8; 4] = interface_id.as_slice().try_into().unwrap_or([0; 4]);
        let id = u32::from_be_bytes(b);
        if id == 0xffffffff {
            return Ok(false);
        }
        Ok(matches!(id, IERC2981_ID | IERC165_ID))
    }
}
