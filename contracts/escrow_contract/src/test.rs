// EscrowContract test suite — 35 unit tests
// Covers: full job lifecycle, multi-milestone, disputes, 50/50 splits,
//         deadline timeouts, pagination, auth failures, edge cases
// Run: cargo test -p escrow_contract
#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger, LedgerInfo},
    token, Address, Env, String as SorobanString,
};

// ── Stub WorkToken ────────────────────────────────────────────────────────────
// A no-op token so escrow tests don't depend on WorkToken internals.

mod stub_work_token {
    use soroban_sdk::{contract, contractimpl, Address, Env};

    #[contract]
    pub struct StubWorkToken;

    #[contractimpl]
    impl StubWorkToken {
        pub fn initialize(_env: Env, _admin: Address, _escrow: Address) {}
        pub fn mint(_env: Env, _to: Address, _amount: i128) {}
        pub fn balance(_env: Env, _id: Address) -> i128 { 0 }
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

fn s(env: &Env, v: &str) -> SorobanString {
    SorobanString::from_str(env, v)
}

/// Returns (env, escrow_id, xlm_id, admin, client, freelancer)
fn setup() -> (Env, Address, Address, Address, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let admin      = Address::generate(&env);
    let client     = Address::generate(&env);
    let freelancer = Address::generate(&env);

    // Deploy stub work token
    let work_token_id = env.register(stub_work_token::StubWorkToken, ());

    // Deploy escrow
    let escrow_id = env.register(EscrowContract, ());
    EscrowContractClient::new(&env, &escrow_id).initialize(&admin, &work_token_id);

    // Deploy XLM-like token and fund client
    let xlm_id = env.register_stellar_asset_contract_v2(admin.clone()).address();
    token::StellarAssetClient::new(&env, &xlm_id).mint(&client, &1_000_000_0000000i128);

    (env, escrow_id, xlm_id, admin, client, freelancer)
}

fn post_simple_job(env: &Env, escrow_id: &Address, xlm_id: &Address, client: &Address) -> u64 {
    EscrowContractClient::new(env, escrow_id).post_job(
        client,
        xlm_id,
        &s(env, "Test Job"),
        &s(env, "A test job description"),
        &soroban_sdk::vec![env, s(env, "Milestone 1")],
        &soroban_sdk::vec![env, 100_0000000i128],
        &soroban_sdk::vec![env, 0u64],
    )
}

// ── initialize ────────────────────────────────────────────────────────────────

#[test]
fn test_initialize_job_count_zero() {
    let (env, escrow_id, ..) = setup();
    assert_eq!(EscrowContractClient::new(&env, &escrow_id).job_count(), 0u64);
}

#[test]
#[should_panic(expected = "already initialized")]
fn test_initialize_twice_panics() {
    let (env, escrow_id, _, _, _, _) = setup();
    let work = Address::generate(&env);
    let admin = Address::generate(&env);
    EscrowContractClient::new(&env, &escrow_id).initialize(&admin, &work);
}

// ── post_job ──────────────────────────────────────────────────────────────────

#[test]
fn test_post_job_returns_id_one() {
    let (env, escrow_id, xlm_id, _, client, _) = setup();
    let id = post_simple_job(&env, &escrow_id, &xlm_id, &client);
    assert_eq!(id, 1u64);
}

#[test]
fn test_post_job_increments_count() {
    let (env, escrow_id, xlm_id, _, client, _) = setup();
    let c = EscrowContractClient::new(&env, &escrow_id);
    post_simple_job(&env, &escrow_id, &xlm_id, &client);
    post_simple_job(&env, &escrow_id, &xlm_id, &client);
    assert_eq!(c.job_count(), 2u64);
}

#[test]
fn test_post_job_transfers_funds_to_escrow() {
    let (env, escrow_id, xlm_id, _, client, _) = setup();
    let xlm = token::Client::new(&env, &xlm_id);
    let before = xlm.balance(&client);
    post_simple_job(&env, &escrow_id, &xlm_id, &client);
    let after = xlm.balance(&client);
    assert_eq!(before - after, 100_0000000i128);
}

#[test]
fn test_post_job_stores_correct_data() {
    let (env, escrow_id, xlm_id, _, client, _) = setup();
    let c  = EscrowContractClient::new(&env, &escrow_id);
    let id = post_simple_job(&env, &escrow_id, &xlm_id, &client);
    let job = c.get_job(&id);

    assert_eq!(job.id,      1u64);
    assert_eq!(job.title,   s(&env, "Test Job"));
    assert_eq!(job.client,  client);
    assert_eq!(job.freelancer, None);
    assert_eq!(job.total,   100_0000000i128);
    assert_eq!(job.is_open, true);
    assert_eq!(job.milestones.len(), 1u32);
}

#[test]
fn test_post_job_milestone_starts_locked() {
    let (env, escrow_id, xlm_id, _, client, _) = setup();
    let c  = EscrowContractClient::new(&env, &escrow_id);
    let id = post_simple_job(&env, &escrow_id, &xlm_id, &client);
    let job = c.get_job(&id);
    assert_eq!(job.milestones.get(0).unwrap().status, MilestoneStatus::Locked);
}

#[test]
fn test_post_job_multi_milestone() {
    let (env, escrow_id, xlm_id, _, client, _) = setup();
    let c = EscrowContractClient::new(&env, &escrow_id);
    let id = c.post_job(
        &client, &xlm_id,
        &s(&env, "Multi"), &s(&env, "desc"),
        &soroban_sdk::vec![&env, s(&env, "M1"), s(&env, "M2"), s(&env, "M3")],
        &soroban_sdk::vec![&env, 50_0000000i128, 30_0000000i128, 20_0000000i128],
        &soroban_sdk::vec![&env, 0u64, 0u64, 0u64],
    );
    let job = c.get_job(&id);
    assert_eq!(job.milestones.len(), 3u32);
    assert_eq!(job.total, 100_0000000i128);
}

#[test]
#[should_panic(expected = "need at least one milestone")]
fn test_post_job_no_milestones_panics() {
    let (env, escrow_id, xlm_id, _, client, _) = setup();
    EscrowContractClient::new(&env, &escrow_id).post_job(
        &client, &xlm_id,
        &s(&env, "Bad"), &s(&env, "desc"),
        &soroban_sdk::vec![&env],
        &soroban_sdk::vec![&env],
        &soroban_sdk::vec![&env],
    );
}

#[test]
#[should_panic(expected = "titles/amounts mismatch")]
fn test_post_job_mismatched_lengths_panics() {
    let (env, escrow_id, xlm_id, _, client, _) = setup();
    EscrowContractClient::new(&env, &escrow_id).post_job(
        &client, &xlm_id,
        &s(&env, "Bad"), &s(&env, "desc"),
        &soroban_sdk::vec![&env, s(&env, "M1"), s(&env, "M2")],
        &soroban_sdk::vec![&env, 100_0000000i128],
        &soroban_sdk::vec![&env, 0u64, 0u64],
    );
}

// ── accept_job ────────────────────────────────────────────────────────────────

#[test]
fn test_accept_job_assigns_freelancer() {
    let (env, escrow_id, xlm_id, _, client, freelancer) = setup();
    let c  = EscrowContractClient::new(&env, &escrow_id);
    let id = post_simple_job(&env, &escrow_id, &xlm_id, &client);
    c.accept_job(&id, &freelancer);

    let job = c.get_job(&id);
    assert_eq!(job.freelancer, Some(freelancer));
    assert_eq!(job.is_open,    false);
}

#[test]
#[should_panic(expected = "job not open")]
fn test_accept_job_twice_panics() {
    let (env, escrow_id, xlm_id, _, client, freelancer) = setup();
    let c  = EscrowContractClient::new(&env, &escrow_id);
    let id = post_simple_job(&env, &escrow_id, &xlm_id, &client);
    c.accept_job(&id, &freelancer);
    let second = Address::generate(&env);
    c.accept_job(&id, &second);
}

#[test]
#[should_panic(expected = "job not found")]
fn test_accept_nonexistent_job_panics() {
    let (env, escrow_id, _, _, _, freelancer) = setup();
    EscrowContractClient::new(&env, &escrow_id).accept_job(&999u64, &freelancer);
}

// ── submit_milestone ──────────────────────────────────────────────────────────

#[test]
fn test_submit_milestone_changes_status() {
    let (env, escrow_id, xlm_id, _, client, freelancer) = setup();
    let c  = EscrowContractClient::new(&env, &escrow_id);
    let id = post_simple_job(&env, &escrow_id, &xlm_id, &client);
    c.accept_job(&id, &freelancer);
    c.submit_milestone(&id, &0u32, &s(&env, "ipfs://QmABC123"));

    let job = c.get_job(&id);
    let m   = job.milestones.get(0).unwrap();
    assert_eq!(m.status,      MilestoneStatus::Submitted);
    assert_eq!(m.deliverable, s(&env, "ipfs://QmABC123"));
}

#[test]
#[should_panic(expected = "milestone not in Locked state")]
fn test_submit_already_submitted_panics() {
    let (env, escrow_id, xlm_id, _, client, freelancer) = setup();
    let c  = EscrowContractClient::new(&env, &escrow_id);
    let id = post_simple_job(&env, &escrow_id, &xlm_id, &client);
    c.accept_job(&id, &freelancer);
    c.submit_milestone(&id, &0u32, &s(&env, "v1"));
    c.submit_milestone(&id, &0u32, &s(&env, "v2")); // must panic
}

#[test]
#[should_panic(expected = "no freelancer assigned")]
fn test_submit_without_freelancer_panics() {
    let (env, escrow_id, xlm_id, _, client, _) = setup();
    let c  = EscrowContractClient::new(&env, &escrow_id);
    let id = post_simple_job(&env, &escrow_id, &xlm_id, &client);
    c.submit_milestone(&id, &0u32, &s(&env, "hash"));
}

// ── approve_milestone ─────────────────────────────────────────────────────────

#[test]
fn test_approve_releases_payment_to_freelancer() {
    let (env, escrow_id, xlm_id, _, client, freelancer) = setup();
    let c   = EscrowContractClient::new(&env, &escrow_id);
    let xlm = token::Client::new(&env, &xlm_id);
    let id  = post_simple_job(&env, &escrow_id, &xlm_id, &client);
    c.accept_job(&id, &freelancer);
    c.submit_milestone(&id, &0u32, &s(&env, "done"));

    let before = xlm.balance(&freelancer);
    c.approve_milestone(&id, &0u32);
    let after = xlm.balance(&freelancer);

    assert_eq!(after - before, 100_0000000i128);
}

#[test]
fn test_approve_sets_status_approved() {
    let (env, escrow_id, xlm_id, _, client, freelancer) = setup();
    let c  = EscrowContractClient::new(&env, &escrow_id);
    let id = post_simple_job(&env, &escrow_id, &xlm_id, &client);
    c.accept_job(&id, &freelancer);
    c.submit_milestone(&id, &0u32, &s(&env, "done"));
    c.approve_milestone(&id, &0u32);

    let job = c.get_job(&id);
    assert_eq!(job.milestones.get(0).unwrap().status, MilestoneStatus::Approved);
}

#[test]
#[should_panic(expected = "milestone not submitted")]
fn test_approve_locked_milestone_panics() {
    let (env, escrow_id, xlm_id, _, client, freelancer) = setup();
    let c  = EscrowContractClient::new(&env, &escrow_id);
    let id = post_simple_job(&env, &escrow_id, &xlm_id, &client);
    c.accept_job(&id, &freelancer);
    c.approve_milestone(&id, &0u32); // not submitted yet
}

#[test]
fn test_approve_multi_milestone_partial_release() {
    let (env, escrow_id, xlm_id, _, client, freelancer) = setup();
    let c   = EscrowContractClient::new(&env, &escrow_id);
    let xlm = token::Client::new(&env, &xlm_id);

    let id = c.post_job(
        &client, &xlm_id,
        &s(&env, "Two Milestones"), &s(&env, "desc"),
        &soroban_sdk::vec![&env, s(&env, "M1"), s(&env, "M2")],
        &soroban_sdk::vec![&env, 60_0000000i128, 40_0000000i128],
        &soroban_sdk::vec![&env, 0u64, 0u64],
    );

    c.accept_job(&id, &freelancer);
    c.submit_milestone(&id, &0u32, &s(&env, "m1 done"));

    let before = xlm.balance(&freelancer);
    c.approve_milestone(&id, &0u32);
    let after = xlm.balance(&freelancer);

    assert_eq!(after - before, 60_0000000i128); // only M1
    assert_eq!(c.get_job(&id).milestones.get(1).unwrap().status, MilestoneStatus::Locked);
}

// ── dispute_milestone ─────────────────────────────────────────────────────────

#[test]
fn test_dispute_changes_status() {
    let (env, escrow_id, xlm_id, _, client, freelancer) = setup();
    let c  = EscrowContractClient::new(&env, &escrow_id);
    let id = post_simple_job(&env, &escrow_id, &xlm_id, &client);
    c.accept_job(&id, &freelancer);
    c.submit_milestone(&id, &0u32, &s(&env, "done"));
    c.dispute_milestone(&id, &0u32, &client);

    assert_eq!(c.get_job(&id).milestones.get(0).unwrap().status, MilestoneStatus::Disputed);
}

#[test]
#[should_panic(expected = "can only dispute submitted milestones")]
fn test_dispute_locked_milestone_panics() {
    let (env, escrow_id, xlm_id, _, client, freelancer) = setup();
    let c  = EscrowContractClient::new(&env, &escrow_id);
    let id = post_simple_job(&env, &escrow_id, &xlm_id, &client);
    c.accept_job(&id, &freelancer);
    c.dispute_milestone(&id, &0u32, &client); // still Locked
}

#[test]
#[should_panic(expected = "not authorized")]
fn test_dispute_by_stranger_panics() {
    let (env, escrow_id, xlm_id, _, client, freelancer) = setup();
    let c  = EscrowContractClient::new(&env, &escrow_id);
    let id = post_simple_job(&env, &escrow_id, &xlm_id, &client);
    c.accept_job(&id, &freelancer);
    c.submit_milestone(&id, &0u32, &s(&env, "done"));
    let stranger = Address::generate(&env);
    c.dispute_milestone(&id, &0u32, &stranger);
}

// ── resolve_dispute ───────────────────────────────────────────────────────────

#[test]
fn test_resolve_full_to_freelancer() {
    let (env, escrow_id, xlm_id, admin, client, freelancer) = setup();
    let c   = EscrowContractClient::new(&env, &escrow_id);
    let xlm = token::Client::new(&env, &xlm_id);
    let id  = post_simple_job(&env, &escrow_id, &xlm_id, &client);
    c.accept_job(&id, &freelancer);
    c.submit_milestone(&id, &0u32, &s(&env, "done"));
    c.dispute_milestone(&id, &0u32, &client);

    let before = xlm.balance(&freelancer);
    c.resolve_dispute(&id, &0u32, &10000u32);
    assert_eq!(xlm.balance(&freelancer) - before, 100_0000000i128);
}

#[test]
fn test_resolve_full_to_client() {
    let (env, escrow_id, xlm_id, _, client, freelancer) = setup();
    let c   = EscrowContractClient::new(&env, &escrow_id);
    let xlm = token::Client::new(&env, &xlm_id);
    let id  = post_simple_job(&env, &escrow_id, &xlm_id, &client);
    c.accept_job(&id, &freelancer);
    c.submit_milestone(&id, &0u32, &s(&env, "done"));
    c.dispute_milestone(&id, &0u32, &client);

    let before = xlm.balance(&client);
    c.resolve_dispute(&id, &0u32, &0u32);
    assert_eq!(xlm.balance(&client) - before, 100_0000000i128);
}

#[test]
fn test_resolve_50_50_split() {
    let (env, escrow_id, xlm_id, _, client, freelancer) = setup();
    let c   = EscrowContractClient::new(&env, &escrow_id);
    let xlm = token::Client::new(&env, &xlm_id);
    let id  = post_simple_job(&env, &escrow_id, &xlm_id, &client);
    c.accept_job(&id, &freelancer);
    c.submit_milestone(&id, &0u32, &s(&env, "done"));
    c.dispute_milestone(&id, &0u32, &client);

    let f_before = xlm.balance(&freelancer);
    let c_before = xlm.balance(&client);
    c.resolve_dispute(&id, &0u32, &5000u32);

    assert_eq!(xlm.balance(&freelancer) - f_before, 50_0000000i128);
    assert_eq!(xlm.balance(&client)     - c_before, 50_0000000i128);
}

#[test]
#[should_panic(expected = "bps must be <= 10000")]
fn test_resolve_invalid_bps_panics() {
    let (env, escrow_id, xlm_id, _, client, freelancer) = setup();
    let c  = EscrowContractClient::new(&env, &escrow_id);
    let id = post_simple_job(&env, &escrow_id, &xlm_id, &client);
    c.accept_job(&id, &freelancer);
    c.submit_milestone(&id, &0u32, &s(&env, "done"));
    c.dispute_milestone(&id, &0u32, &client);
    c.resolve_dispute(&id, &0u32, &10001u32);
}

#[test]
#[should_panic(expected = "not disputed")]
fn test_resolve_non_disputed_panics() {
    let (env, escrow_id, xlm_id, _, client, freelancer) = setup();
    let c  = EscrowContractClient::new(&env, &escrow_id);
    let id = post_simple_job(&env, &escrow_id, &xlm_id, &client);
    c.accept_job(&id, &freelancer);
    c.submit_milestone(&id, &0u32, &s(&env, "done"));
    c.resolve_dispute(&id, &0u32, &5000u32); // not disputed
}

// ── claim_timeout ─────────────────────────────────────────────────────────────

fn set_time(env: &Env, ts: u64) {
    env.ledger().set(LedgerInfo {
        timestamp:                ts,
        protocol_version:         22,
        sequence_number:          1,
        network_id:               Default::default(),
        base_reserve:             10,
        min_temp_entry_ttl:       16,
        min_persistent_entry_ttl: 100,
        max_entry_ttl:            10_000_000,
    });
}

#[test]
fn test_claim_timeout_releases_after_deadline() {
    let (env, escrow_id, xlm_id, _, client, freelancer) = setup();
    let c   = EscrowContractClient::new(&env, &escrow_id);
    let xlm = token::Client::new(&env, &xlm_id);

    let now      = 1_000_000u64;
    let deadline = now + 86400;
    set_time(&env, now);

    let id = c.post_job(
        &client, &xlm_id,
        &s(&env, "Timeout Job"), &s(&env, "desc"),
        &soroban_sdk::vec![&env, s(&env, "M1")],
        &soroban_sdk::vec![&env, 100_0000000i128],
        &soroban_sdk::vec![&env, deadline],
    );

    c.accept_job(&id, &freelancer);
    c.submit_milestone(&id, &0u32, &s(&env, "done"));

    set_time(&env, deadline + 1);

    let before = xlm.balance(&freelancer);
    c.claim_timeout(&id, &0u32);
    assert_eq!(xlm.balance(&freelancer) - before, 100_0000000i128);
}

#[test]
#[should_panic(expected = "deadline not passed")]
fn test_claim_timeout_before_deadline_panics() {
    let (env, escrow_id, xlm_id, _, client, freelancer) = setup();
    let c   = EscrowContractClient::new(&env, &escrow_id);
    let now = 1_000_000u64;
    set_time(&env, now);

    let id = c.post_job(
        &client, &xlm_id,
        &s(&env, "Job"), &s(&env, "desc"),
        &soroban_sdk::vec![&env, s(&env, "M1")],
        &soroban_sdk::vec![&env, 100_0000000i128],
        &soroban_sdk::vec![&env, now + 86400],
    );

    c.accept_job(&id, &freelancer);
    c.submit_milestone(&id, &0u32, &s(&env, "done"));
    c.claim_timeout(&id, &0u32); // still before deadline
}

#[test]
#[should_panic(expected = "no deadline set")]
fn test_claim_timeout_no_deadline_panics() {
    let (env, escrow_id, xlm_id, _, client, freelancer) = setup();
    let c  = EscrowContractClient::new(&env, &escrow_id);
    let id = post_simple_job(&env, &escrow_id, &xlm_id, &client); // deadline = 0
    c.accept_job(&id, &freelancer);
    c.submit_milestone(&id, &0u32, &s(&env, "done"));
    c.claim_timeout(&id, &0u32);
}

// ── list_jobs ─────────────────────────────────────────────────────────────────

#[test]
fn test_list_jobs_empty() {
    let (env, escrow_id, ..) = setup();
    let ids = EscrowContractClient::new(&env, &escrow_id).list_jobs(&0u64, &10u64);
    assert_eq!(ids.len(), 0u32);
}

#[test]
fn test_list_jobs_returns_all() {
    let (env, escrow_id, xlm_id, _, client, _) = setup();
    let c = EscrowContractClient::new(&env, &escrow_id);
    post_simple_job(&env, &escrow_id, &xlm_id, &client);
    post_simple_job(&env, &escrow_id, &xlm_id, &client);
    post_simple_job(&env, &escrow_id, &xlm_id, &client);

    let ids = c.list_jobs(&0u64, &10u64);
    assert_eq!(ids.len(), 3u32);
    assert_eq!(ids.get(0).unwrap(), 1u64);
    assert_eq!(ids.get(2).unwrap(), 3u64);
}

#[test]
fn test_list_jobs_pagination() {
    let (env, escrow_id, xlm_id, _, client, _) = setup();
    let c = EscrowContractClient::new(&env, &escrow_id);
    for _ in 0..5 { post_simple_job(&env, &escrow_id, &xlm_id, &client); }

    assert_eq!(c.list_jobs(&0u64, &2u64).len(), 2u32);
    assert_eq!(c.list_jobs(&2u64, &2u64).len(), 2u32);
    assert_eq!(c.list_jobs(&4u64, &2u64).len(), 1u32);
}

// ── full lifecycle integration ────────────────────────────────────────────────

#[test]
fn test_full_job_lifecycle() {
    let (env, escrow_id, xlm_id, _, client, freelancer) = setup();
    let c   = EscrowContractClient::new(&env, &escrow_id);
    let xlm = token::Client::new(&env, &xlm_id);

    // 1. Post
    let id = post_simple_job(&env, &escrow_id, &xlm_id, &client);
    assert_eq!(c.job_count(), 1u64);
    assert_eq!(c.get_job(&id).is_open, true);

    // 2. Accept
    c.accept_job(&id, &freelancer);
    assert_eq!(c.get_job(&id).is_open, false);
    assert_eq!(c.get_job(&id).freelancer, Some(freelancer.clone()));

    // 3. Submit
    c.submit_milestone(&id, &0u32, &s(&env, "ipfs://QmDeliverable"));
    assert_eq!(c.get_job(&id).milestones.get(0).unwrap().status, MilestoneStatus::Submitted);

    // 4. Approve → payment released + WORK minted (stub)
    let before = xlm.balance(&freelancer);
    c.approve_milestone(&id, &0u32);
    assert_eq!(xlm.balance(&freelancer) - before, 100_0000000i128);
    assert_eq!(c.get_job(&id).milestones.get(0).unwrap().status, MilestoneStatus::Approved);
}
