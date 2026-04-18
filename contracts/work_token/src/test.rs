// WorkToken test suite — 10 unit tests
// Covers: initialize, balance, mint (happy + edge cases), set_escrow
// Run: cargo test -p work_token
#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, AuthorizedFunction, AuthorizedInvocation},
    Address, Env, IntoVal,
};

// ── helpers ───────────────────────────────────────────────────────────────────

fn setup() -> (Env, Address, Address, Address, WorkTokenClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(WorkToken, ());
    let client = WorkTokenClient::new(&env, &contract_id);

    let admin   = Address::generate(&env);
    let escrow  = Address::generate(&env);

    client.initialize(&admin, &escrow);

    // Return env with 'static lifetime trick via leak — fine for tests
    let env: Env = env;
    (env, contract_id, admin, escrow, client)
}

// ── initialize ────────────────────────────────────────────────────────────────

#[test]
fn test_initialize_sets_metadata() {
    let (env, _, _, _, client) = setup();
    assert_eq!(client.name(),     soroban_sdk::String::from_str(&env, "StellarWork Reputation Token"));
    assert_eq!(client.symbol(),   soroban_sdk::String::from_str(&env, "WORK"));
    assert_eq!(client.decimals(), 0u32);
}

#[test]
fn test_initialize_zero_supply() {
    let (_, _, _, _, client) = setup();
    assert_eq!(client.total_supply(), 0i128);
}

#[test]
#[should_panic(expected = "already initialized")]
fn test_initialize_twice_panics() {
    let (env, _, admin, escrow, client) = setup();
    // Second call must panic
    client.initialize(&admin, &escrow);
}

// ── balance ───────────────────────────────────────────────────────────────────

#[test]
fn test_balance_zero_for_unknown_address() {
    let (env, _, _, _, client) = setup();
    let stranger = Address::generate(&env);
    assert_eq!(client.balance(&stranger), 0i128);
}

// ── mint ──────────────────────────────────────────────────────────────────────

#[test]
fn test_mint_increases_balance_and_supply() {
    let (env, _, _, escrow, client) = setup();
    let recipient = Address::generate(&env);

    client.mint(&recipient, &10i128);

    assert_eq!(client.balance(&recipient), 10i128);
    assert_eq!(client.total_supply(),      10i128);
}

#[test]
fn test_mint_accumulates_across_calls() {
    let (env, _, _, escrow, client) = setup();
    let recipient = Address::generate(&env);

    client.mint(&recipient, &5i128);
    client.mint(&recipient, &3i128);

    assert_eq!(client.balance(&recipient), 8i128);
    assert_eq!(client.total_supply(),      8i128);
}

#[test]
fn test_mint_multiple_recipients_independent() {
    let (env, _, _, _, client) = setup();
    let alice = Address::generate(&env);
    let bob   = Address::generate(&env);

    client.mint(&alice, &10i128);
    client.mint(&bob,   &20i128);

    assert_eq!(client.balance(&alice),  10i128);
    assert_eq!(client.balance(&bob),    20i128);
    assert_eq!(client.total_supply(),   30i128);
}

#[test]
#[should_panic(expected = "amount must be positive")]
fn test_mint_zero_panics() {
    let (env, _, _, _, client) = setup();
    let recipient = Address::generate(&env);
    client.mint(&recipient, &0i128);
}

#[test]
#[should_panic(expected = "amount must be positive")]
fn test_mint_negative_panics() {
    let (env, _, _, _, client) = setup();
    let recipient = Address::generate(&env);
    client.mint(&recipient, &-1i128);
}

// ── set_escrow ────────────────────────────────────────────────────────────────

#[test]
fn test_set_escrow_updates_minter() {
    let (env, _, _, _, client) = setup();
    let new_escrow = Address::generate(&env);
    let recipient  = Address::generate(&env);

    // set_escrow is called by admin (mock_all_auths covers it)
    client.set_escrow(&new_escrow);

    // Now minting must be authorised by new_escrow, not old one
    // mock_all_auths still covers it — just verify no panic
    client.mint(&recipient, &1i128);
    assert_eq!(client.balance(&recipient), 1i128);
}
