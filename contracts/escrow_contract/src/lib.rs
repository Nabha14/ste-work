// EscrowContract — milestone-based freelance escrow on Soroban
// State machine: Locked → Submitted → Approved | Disputed
// Features: multi-milestone, time-locked deadlines, dispute resolution, inter-contract call to WorkToken
#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    token, Address, Env, String, Vec,
};

mod test;

const REVIEW_WINDOW_SECONDS: u64 = 3 * 24 * 60 * 60;
const BPS_DENOMINATOR: i128 = 10_000;
const STROOPS_PER_100_XLM: i128 = 1_000_000_000;
const MAX_MILESTONES: u32 = 20;
const MAX_TITLE_BYTES: u32 = 120;
const MAX_DESCRIPTION_BYTES: u32 = 2_000;
const MAX_DELIVERABLE_BYTES: u32 = 512;
// Caps input to a practical amount and keeps every basis-point calculation
// comfortably within i128 bounds.
const MAX_JOB_TOTAL_STROOPS: i128 = 1_000_000_000_000_000;

// ── Types ─────────────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, PartialEq, Debug)]
pub enum MilestoneStatus {
    Locked,
    Submitted,
    Approved,
    Disputed,
    Refunded,
}

#[contracttype]
#[derive(Clone)]
pub struct Milestone {
    pub title:           String,
    pub amount:          i128,
    pub status:          MilestoneStatus,
    pub deliverable:     String, // IPFS hash or description
    pub deadline:        u64,    // Unix timestamp; 0 = no deadline
    pub review_deadline: u64,    // Unix timestamp; 0 = no submission/deadline
}

#[contracttype]
#[derive(Clone)]
pub struct Job {
    pub id:          u64,
    pub title:       String,
    pub description: String,
    pub client:      Address,
    pub freelancer:  Option<Address>,
    pub token:       Address,        // XLM native token address
    pub total:       i128,
    // Explicit escrow accounting invariant. Every payout/refund decrements
    // this value, making accidental double settlement fail closed.
    pub remaining:   i128,
    pub milestones:  Vec<Milestone>,
    pub created_at:  u64,
    pub is_open:     bool,           // accepting applications
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Job(u64),
    JobCount,
    WorkToken,
    Admin,
    XlmToken,
}

// ── Contract ──────────────────────────────────────────────────────────────────

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    /// Initialize with admin, work_token, and allowed payment token (XLM) contract address.
    pub fn initialize(env: Env, admin: Address, work_token: Address, xlm_token: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::WorkToken, &work_token);
        env.storage().instance().set(&DataKey::XlmToken, &xlm_token);
        env.storage().instance().set(&DataKey::JobCount, &0_u64);
    }

    // ── Job lifecycle ──────────────────────────────────────────────────────

    /// Client posts a job and funds the escrow in one tx.
    /// `milestone_titles` and `milestone_amounts` must be same length.
    /// `milestone_deadlines`: 0 means no deadline for that milestone.
    pub fn post_job(
        env: Env,
        client: Address,
        xlm_token: Address,
        title: String,
        description: String,
        milestone_titles: Vec<String>,
        milestone_amounts: Vec<i128>,
        milestone_deadlines: Vec<u64>,
    ) -> u64 {
        client.require_auth();

        // Enforce whitelisted token (e.g. Native XLM)
        let allowed_xlm: Address = env
            .storage()
            .instance()
            .get(&DataKey::XlmToken)
            .expect("xlm token not set");
        assert!(xlm_token == allowed_xlm, "unsupported token");

        assert!(!title.is_empty(), "title required");
        assert!(title.len() <= MAX_TITLE_BYTES, "title too long");
        assert!(!description.is_empty(), "description required");
        assert!(description.len() <= MAX_DESCRIPTION_BYTES, "description too long");

        let n = milestone_titles.len();
        assert!(n > 0, "need at least one milestone");
        assert!(n <= MAX_MILESTONES, "too many milestones");
        assert!(n == milestone_amounts.len(), "titles/amounts mismatch");
        assert!(n == milestone_deadlines.len(), "titles/deadlines mismatch");

        let now = env.ledger().timestamp();
        let mut total = 0_i128;
        for i in 0..n {
            let milestone_title = milestone_titles.get(i).unwrap();
            let amount = milestone_amounts.get(i).unwrap();
            let deadline = milestone_deadlines.get(i).unwrap();
            assert!(!milestone_title.is_empty(), "milestone title required");
            assert!(milestone_title.len() <= MAX_TITLE_BYTES, "milestone title too long");
            assert!(amount > 0, "milestone amount must be positive");
            total = total.checked_add(amount).expect("total overflow");
            assert!(deadline == 0 || deadline > now, "deadline must be in the future");
        }
        assert!(total <= MAX_JOB_TOTAL_STROOPS, "job total too large");

        // Pull funds from client into this contract
        let token_client = token::Client::new(&env, &xlm_token);
        token_client.transfer(&client, &env.current_contract_address(), &total);

        // Build milestones
        let mut milestones: Vec<Milestone> = Vec::new(&env);
        for i in 0..n {
            milestones.push_back(Milestone {
                title:           milestone_titles.get(i).unwrap(),
                amount:          milestone_amounts.get(i).unwrap(),
                status:          MilestoneStatus::Locked,
                deliverable:     String::from_str(&env, ""),
                deadline:        milestone_deadlines.get(i).unwrap(),
                review_deadline: 0,
            });
        }

        let count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::JobCount)
            .unwrap_or(0);
        let job_id = count.checked_add(1).expect("job id overflow");

        let job = Job {
            id:          job_id,
            title,
            description,
            client,
            freelancer:  None,
            token:       xlm_token,
            total,
            remaining:   total,
            milestones,
            created_at:  now,
            is_open:     true,
        };

        env.storage().persistent().set(&DataKey::Job(job_id), &job);
        env.storage().instance().set(&DataKey::JobCount, &job_id);

        env.events().publish((symbol_short!("job_post"), job_id), total);

        job_id
    }

    /// Freelancer accepts an open job.
    pub fn accept_job(env: Env, job_id: u64, freelancer: Address) {
        freelancer.require_auth();

        let mut job: Job = env
            .storage()
            .persistent()
            .get(&DataKey::Job(job_id))
            .expect("job not found");

        assert!(job.is_open, "job not open");
        assert!(job.freelancer.is_none(), "already accepted");
        assert!(freelancer != job.client, "client cannot accept own job");

        job.freelancer = Some(freelancer.clone());
        job.is_open = false;

        env.storage().persistent().set(&DataKey::Job(job_id), &job);
        env.events().publish((symbol_short!("accepted"), job_id), freelancer);
    }

    /// Client cancels an open job (before any freelancer has accepted).
    /// Refunds the entire locked balance to the client.
    pub fn cancel_job(env: Env, job_id: u64) {
        let mut job: Job = env
            .storage()
            .persistent()
            .get(&DataKey::Job(job_id))
            .expect("job not found");

        job.client.require_auth();
        assert!(job.is_open, "job is not open or already accepted");
        assert!(job.freelancer.is_none(), "freelancer already assigned");
        assert!(job.remaining == job.total, "job has already been settled");

        // Refund total amount to client
        let token_client = token::Client::new(&env, &job.token);
        token_client.transfer(
            &env.current_contract_address(),
            &job.client,
            &job.remaining,
        );

        // Update all milestones to Refunded
        let mut updated_milestones: Vec<Milestone> = Vec::new(&env);
        for milestone in job.milestones.iter() {
            let mut m = milestone;
            m.status = MilestoneStatus::Refunded;
            updated_milestones.push_back(m);
        }
        job.milestones = updated_milestones;
        job.remaining = 0;
        job.is_open = false;

        env.storage().persistent().set(&DataKey::Job(job_id), &job);
        env.events().publish((symbol_short!("cancelled"), job_id), job.client.clone());
    }

    /// Client refunds a single milestone if the freelancer has missed the completion deadline and hasn't submitted yet.
    pub fn refund_milestone(env: Env, job_id: u64, milestone_index: u32) {
        let mut job: Job = env
            .storage()
            .persistent()
            .get(&DataKey::Job(job_id))
            .expect("job not found");

        job.client.require_auth();
        assert!(job.freelancer.is_some(), "job not accepted");

        let mut milestone = job.milestones.get(milestone_index).expect("bad index");
        assert!(
            milestone.status == MilestoneStatus::Locked,
            "milestone must be Locked to refund"
        );
        assert!(milestone.deadline > 0, "no completion deadline set");
        assert!(
            env.ledger().timestamp() > milestone.deadline,
            "completion deadline not passed yet"
        );

        // Refund milestone amount to client
        let token_client = token::Client::new(&env, &job.token);
        token_client.transfer(
            &env.current_contract_address(),
            &job.client,
            &milestone.amount,
        );

        Self::decrease_remaining(&mut job, milestone.amount);
        milestone.status = MilestoneStatus::Refunded;
        job.milestones.set(milestone_index, milestone);

        env.storage().persistent().set(&DataKey::Job(job_id), &job);
        env.events().publish(
            (symbol_short!("refunded"), job_id),
            milestone_index,
        );
    }

    /// Freelancer submits a milestone with a deliverable hash.
    pub fn submit_milestone(
        env: Env,
        job_id: u64,
        milestone_index: u32,
        deliverable: String,
    ) {
        let mut job: Job = env
            .storage()
            .persistent()
            .get(&DataKey::Job(job_id))
            .expect("job not found");

        let freelancer = job.freelancer.clone().expect("no freelancer assigned");
        freelancer.require_auth();
        assert!(!deliverable.is_empty(), "deliverable required");
        assert!(deliverable.len() <= MAX_DELIVERABLE_BYTES, "deliverable too long");

        let mut milestone = job.milestones.get(milestone_index).expect("bad index");
        assert!(
            milestone.status == MilestoneStatus::Locked,
            "milestone not in Locked state"
        );
        assert!(
            milestone.deadline == 0 || env.ledger().timestamp() <= milestone.deadline,
            "completion deadline passed"
        );

        milestone.status = MilestoneStatus::Submitted;
        milestone.deliverable = deliverable;
        milestone.review_deadline = env
            .ledger()
            .timestamp()
            .checked_add(REVIEW_WINDOW_SECONDS)
            .expect("review deadline overflow");
        job.milestones.set(milestone_index, milestone);

        env.storage().persistent().set(&DataKey::Job(job_id), &job);
        env.events().publish(
            (symbol_short!("submitted"), job_id),
            milestone_index,
        );
    }

    /// Client approves a milestone → releases payment + mints WORK tokens.
    /// This is the inter-contract call to WorkToken.
    pub fn approve_milestone(env: Env, job_id: u64, milestone_index: u32) {
        let mut job: Job = env
            .storage()
            .persistent()
            .get(&DataKey::Job(job_id))
            .expect("job not found");

        job.client.require_auth();

        let mut milestone = job.milestones.get(milestone_index).expect("bad index");
        assert!(
            milestone.status == MilestoneStatus::Submitted,
            "milestone not submitted"
        );

        let freelancer = job.freelancer.clone().expect("no freelancer");

        // Release XLM to freelancer
        let token_client = token::Client::new(&env, &job.token);
        token_client.transfer(
            &env.current_contract_address(),
            &freelancer,
            &milestone.amount,
        );

        Self::decrease_remaining(&mut job, milestone.amount);
        milestone.status = MilestoneStatus::Approved;
        job.milestones.set(milestone_index, milestone.clone());
        env.storage().persistent().set(&DataKey::Job(job_id), &job);

        // ── Inter-contract call: mint WORK reputation tokens ──────────────
        // Level 4 Green Belt requirement: EscrowContract calls WorkToken.mint
        // 1 WORK token per 100 XLM of milestone value (minimum 1)
        let work_token_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::WorkToken)
            .expect("work token not set");

        // 1 WORK token per 100 XLM (stroops: 1 XLM = 10_000_000 stroops)
        let work_amount: i128 = (milestone.amount / STROOPS_PER_100_XLM).max(1);

        // Call WorkToken.mint — this is the inter-contract call
        let work_token_client = work_token::Client::new(&env, &work_token_addr);
        work_token_client.mint(&freelancer, &work_amount);

        env.events().publish(
            (symbol_short!("approved"), job_id),
            milestone_index,
        );
    }

    /// Client or freelancer raises a dispute on a submitted milestone.
    pub fn dispute_milestone(env: Env, job_id: u64, milestone_index: u32, caller: Address) {
        caller.require_auth();

        let mut job: Job = env
            .storage()
            .persistent()
            .get(&DataKey::Job(job_id))
            .expect("job not found");

        // Caller must be client or freelancer
        let freelancer = job.freelancer.clone().expect("no freelancer");
        assert!(
            caller == job.client || caller == freelancer,
            "not authorized"
        );

        let mut milestone = job.milestones.get(milestone_index).expect("bad index");
        assert!(
            milestone.status == MilestoneStatus::Submitted,
            "can only dispute submitted milestones"
        );

        milestone.status = MilestoneStatus::Disputed;
        job.milestones.set(milestone_index, milestone);
        env.storage().persistent().set(&DataKey::Job(job_id), &job);

        env.events().publish(
            (symbol_short!("disputed"), job_id),
            milestone_index,
        );
    }

    /// Admin resolves a dispute: split funds between client and freelancer.
    /// `freelancer_bps`: basis points (0–10000) going to freelancer.
    pub fn resolve_dispute(
        env: Env,
        job_id: u64,
        milestone_index: u32,
        freelancer_bps: u32,
    ) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("not initialized");
        admin.require_auth();

        assert!(freelancer_bps <= BPS_DENOMINATOR as u32, "bps must be <= 10000");

        let mut job: Job = env
            .storage()
            .persistent()
            .get(&DataKey::Job(job_id))
            .expect("job not found");

        let mut milestone = job.milestones.get(milestone_index).expect("bad index");
        assert!(
            milestone.status == MilestoneStatus::Disputed,
            "not disputed"
        );

        let freelancer = job.freelancer.clone().expect("no freelancer");
        let token_client = token::Client::new(&env, &job.token);

        let freelancer_amount = milestone
            .amount
            .checked_mul(freelancer_bps as i128)
            .expect("settlement overflow")
            / BPS_DENOMINATOR;
        let client_amount = milestone
            .amount
            .checked_sub(freelancer_amount)
            .expect("settlement underflow");

        if freelancer_amount > 0 {
            token_client.transfer(
                &env.current_contract_address(),
                &freelancer,
                &freelancer_amount,
            );
        }
        if client_amount > 0 {
            token_client.transfer(
                &env.current_contract_address(),
                &job.client,
                &client_amount,
            );
        }

        Self::decrease_remaining(&mut job, milestone.amount);
        milestone.status = MilestoneStatus::Approved;
        job.milestones.set(milestone_index, milestone);
        env.storage().persistent().set(&DataKey::Job(job_id), &job);

        // ── Mint reputation tokens proportionally for the freelancer ───────
        if freelancer_amount > 0 {
            let work_token_addr: Address = env
                .storage()
                .instance()
                .get(&DataKey::WorkToken)
                .expect("work token not set");

            let work_amount: i128 = (freelancer_amount / STROOPS_PER_100_XLM).max(1);

            let work_token_client = work_token::Client::new(&env, &work_token_addr);
            work_token_client.mint(&freelancer, &work_amount);
        }

        env.events().publish(
            (symbol_short!("resolved"), job_id),
            freelancer_bps,
        );
    }

    /// Auto-release if review deadline passed and client hasn't responded.
    pub fn claim_timeout(env: Env, job_id: u64, milestone_index: u32) {
        let mut job: Job = env
            .storage()
            .persistent()
            .get(&DataKey::Job(job_id))
            .expect("job not found");

        let freelancer = job.freelancer.clone().expect("no freelancer");
        freelancer.require_auth();

        let mut milestone = job.milestones.get(milestone_index).expect("bad index");
        assert!(
            milestone.status == MilestoneStatus::Submitted,
            "not submitted"
        );
        assert!(milestone.review_deadline > 0, "no review deadline set");
        assert!(
            env.ledger().timestamp() > milestone.review_deadline,
            "review deadline not passed"
        );

        let token_client = token::Client::new(&env, &job.token);
        token_client.transfer(
            &env.current_contract_address(),
            &freelancer,
            &milestone.amount,
        );

        Self::decrease_remaining(&mut job, milestone.amount);
        milestone.status = MilestoneStatus::Approved;
        job.milestones.set(milestone_index, milestone.clone());
        env.storage().persistent().set(&DataKey::Job(job_id), &job);

        // ── Inter-contract call: mint WORK reputation tokens ──────────────
        let work_token_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::WorkToken)
            .expect("work token not set");

        // 1 WORK token per 100 XLM (stroops: 1 XLM = 10_000_000 stroops)
        let work_amount: i128 = (milestone.amount / STROOPS_PER_100_XLM).max(1);

        // Call WorkToken.mint — this is the inter-contract call
        let work_token_client = work_token::Client::new(&env, &work_token_addr);
        work_token_client.mint(&freelancer, &work_amount);

        env.events().publish(
            (symbol_short!("timeout"), job_id),
            milestone_index,
        );
    }

    // ── Read functions ─────────────────────────────────────────────────────

    pub fn get_job(env: Env, job_id: u64) -> Job {
        env.storage()
            .persistent()
            .get(&DataKey::Job(job_id))
            .expect("job not found")
    }

    pub fn job_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::JobCount)
            .unwrap_or(0)
    }

    /// Returns at most 100 IDs to bound response size and read costs.
    pub fn list_jobs(env: Env, offset: u64, limit: u64) -> Vec<u64> {
        let count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::JobCount)
            .unwrap_or(0);

        let mut ids: Vec<u64> = Vec::new(&env);
        if offset >= count || limit == 0 {
            return ids;
        }

        let take = limit.min(100).min(count - offset);
        for index in 0..take {
            ids.push_back(offset + index + 1);
        }
        ids
    }
}

impl EscrowContract {
    fn decrease_remaining(job: &mut Job, amount: i128) {
        assert!(amount > 0, "settlement amount must be positive");
        assert!(job.remaining >= amount, "insufficient escrow balance");
        job.remaining = job
            .remaining
            .checked_sub(amount)
            .expect("remaining balance underflow");
    }
}

// ── WorkToken client (generated for inter-contract call) ──────────────────────
mod work_token {
    soroban_sdk::contractimport!(
        file = "../target/wasm32v1-none/release/work_token.wasm"
    );
}
