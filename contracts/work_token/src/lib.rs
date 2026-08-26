// WorkToken — SEP-41 compliant custom reputation token
// Minted exclusively by EscrowContract via inter-contract call
// 1 WORK token per 100 XLM of approved milestone value
#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env, String,
};

mod test;

// ── Storage keys ──────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
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

    pub fn admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("not initialized")
    }

    pub fn escrow_contract(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::EscrowContract)
            .expect("not initialized")
    }

    /// Mint WORK tokens — only callable by the EscrowContract (inter-contract call).
    pub fn mint(env: Env, to: Address, amount: i128) {
        let escrow = Self::escrow_contract(env.clone());

        // Only the escrow contract can mint
        escrow.require_auth();

        assert!(amount > 0, "amount must be positive");

        let balance_key = DataKey::Balance(to.clone());
        let current: i128 = env
            .storage()
            .persistent()
            .get(&balance_key)
            .unwrap_or(0);

        let supply: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0);

        let next_balance = current.checked_add(amount).expect("balance overflow");
        let next_supply = supply.checked_add(amount).expect("supply overflow");
        env.storage().persistent().set(&balance_key, &next_balance);
        env.storage().instance().set(&DataKey::TotalSupply, &next_supply);

        env.events().publish(
            (symbol_short!("mint"), to),
            amount,
        );
    }

    /// Update the escrow contract address (admin only).
    pub fn set_escrow(env: Env, new_escrow: Address) {
        let admin = Self::admin(env.clone());
        admin.require_auth();
        env.storage()
            .instance()
            .set(&DataKey::EscrowContract, &new_escrow);
        env.events().publish((symbol_short!("config"),), new_escrow);
    }

    /// Rotate the administrative key without adding a public minting path.
    pub fn set_admin(env: Env, new_admin: Address) {
        let admin = Self::admin(env.clone());
        admin.require_auth();
        assert!(admin != new_admin, "admin unchanged");
        env.storage().instance().set(&DataKey::Admin, &new_admin);
        env.events().publish((symbol_short!("admin"),), new_admin);
    }

    // ── Non-Transferable SEP-41 Compliance Methods ─────────────────────────

    pub fn transfer(_env: Env, _from: Address, _to: Address, _amount: i128) {
        panic!("WORK reputation tokens are soulbound and non-transferable");
    }

    pub fn transfer_from(_env: Env, _spender: Address, _from: Address, _to: Address, _amount: i128) {
        panic!("WORK reputation tokens are soulbound and non-transferable");
    }

    pub fn approve(_env: Env, _from: Address, _spender: Address, _amount: i128, _expiration_ledger: u32) {
        panic!("WORK reputation tokens are soulbound and non-transferable");
    }

    pub fn allowance(_env: Env, _from: Address, _spender: Address) -> i128 {
        0
    }
}
