#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env, String, Symbol,
};

mod test;

// ── Storage keys ──────────────────────────────────────────────────────────────

#[contracttype]
pub enum DataKey {
    Balance(Address),
    Admin,
    EscrowContract,
    TotalSupply,
}

// ── Contract ──────────────────────────────────────────────────────────────────

#[contract]
pub struct WorkToken;

#[contractimpl]
impl WorkToken {
    /// Initialize the token. Called once after deployment.
    pub fn initialize(env: Env, admin: Address, escrow_contract: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::EscrowContract, &escrow_contract);
        env.storage().instance().set(&DataKey::TotalSupply, &0_i128);
    }

    // ── SEP-41 token interface ─────────────────────────────────────────────

    pub fn name(_env: Env) -> String {
        String::from_str(&_env, "StellarWork Reputation Token")
    }

    pub fn symbol(_env: Env) -> String {
        String::from_str(&_env, "WORK")
    }

    pub fn decimals(_env: Env) -> u32 {
        0 // Whole reputation points only
    }

    pub fn total_supply(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::TotalSupply).unwrap_or(0)
    }

    pub fn balance(env: Env, id: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Balance(id))
            .unwrap_or(0)
    }

    /// Mint WORK tokens — only callable by the EscrowContract (inter-contract call).
    pub fn mint(env: Env, to: Address, amount: i128) {
        let escrow: Address = env
            .storage()
            .instance()
            .get(&DataKey::EscrowContract)
            .expect("escrow not set");

        // Only the escrow contract can mint
        escrow.require_auth();

        assert!(amount > 0, "amount must be positive");

        let current: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Balance(to.clone()))
            .unwrap_or(0);

        env.storage()
            .persistent()
            .set(&DataKey::Balance(to.clone()), &(current + amount));

        let supply: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0);

        env.storage()
            .instance()
            .set(&DataKey::TotalSupply, &(supply + amount));

        env.events().publish(
            (symbol_short!("mint"), to),
            amount,
        );
    }

    /// Update the escrow contract address (admin only).
    pub fn set_escrow(env: Env, new_escrow: Address) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("not initialized");
        admin.require_auth();
        env.storage()
            .instance()
            .set(&DataKey::EscrowContract, &new_escrow);
    }
}
