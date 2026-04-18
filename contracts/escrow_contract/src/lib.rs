#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    token, vec, Address, Env, String, Symbol, Vec,
};

mod test;

// ── Types ─────────────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, PartialEq, Debug)]
pub enum MilestoneStatus {
    Locked,
    Submitted,
    Approved,
    Disputed,
}

#[contracttype]
#[derive(Clone)]
pub struct Milestone {
    pub title:       String,
    pub amount:      i128,
    pub status:      MilestoneStatus,
    pub deliverable: String, // IPFS hash or description
    pub deadline:    u64,    // Unix timestamp; 0 = no deadline
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
    pub milestones:  Vec<Milestone>,
    pub created_at:  u64,
    pub is_open:     bool,           // accepting applications
}

#[contracttype]
pub enum DataKey {
    Job(u64),
    JobCount,
    WorkToken,
    Admin,
}

// ── Contract ──────────────────────────────────────────────────────────────────

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    /// Initialize with admin and work_token contract address.
    pub fn initialize(env: Env, admin: Address, work_token: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::WorkToken, &work_token);
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

        let n = milestone_titles.len();
        assert!(n > 0, "need at least one milestone");
        assert!(n == milestone_amounts.len(), "titles/amounts mismatch");
        assert!(n == milestone_deadlines.len(), "titles/deadlines mismatch");

        let total: i128 = milestone_amounts.iter().sum();
        assert!(total > 0, "total must be positive");

        // Pull funds from client into this contract
        let token_client = token::Client::new(&env, &xlm_token);
        token_client.transfer(&client, &env.current_contract_address(), &total);

        // Build milestones
        let mut milestones: Vec<Milestone> = Vec::new(&env);
        for i in 0..n {
            milestones.push_back(Milestone {
                title:       milestone_titles.get(i).unwrap(),
                amount:      milestone_amounts.get(i).unwrap(),
                status:      MilestoneStatus::Locked,
                deliverable: String::from_str(&env, ""),
                deadline:    milestone_deadlines.get(i).unwrap(),
            });
        }

        let count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::JobCount)
            .unwrap_or(0);
        let job_id = count + 1;

        let job = Job {
            id:          job_id,
            title,
            description,
            client,
            freelancer:  None,
            token:       xlm_token,
            total,
            milestones,
            created_at:  env.ledger().timestamp(),
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

        job.freelancer = Some(freelancer.clone());
        job.is_open = false;

        env.storage().persistent().set(&DataKey::Job(job_id), &job);
        env.events().publish((symbol_short!("accepted"), job_id), freelancer);
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

        let mut milestone = job.milestones.get(milestone_index).expect("bad index");
        assert!(
            milestone.status == MilestoneStatus::Locked,
            "milestone not in Locked state"
        );

        milestone.status = MilestoneStatus::Submitted;
        milestone.deliverable = deliverable;
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
        let work_amount: i128 = (milestone.amount / 100_0000000).max(1);

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

        assert!(freelancer_bps <= 10000, "bps must be <= 10000");

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

        let freelancer_amount = milestone.amount * freelancer_bps as i128 / 10000;
        let client_amount = milestone.amount - freelancer_amount;

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

        milestone.status = MilestoneStatus::Approved;
        job.milestones.set(milestone_index, milestone);
        env.storage().persistent().set(&DataKey::Job(job_id), &job);

        env.events().publish(
            (symbol_short!("resolved"), job_id),
            freelancer_bps,
        );
    }

    /// Auto-release if deadline passed and client hasn't responded.
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
        assert!(milestone.deadline > 0, "no deadline set");
        assert!(
            env.ledger().timestamp() > milestone.deadline,
            "deadline not passed"
        );

        let token_client = token::Client::new(&env, &job.token);
        token_client.transfer(
            &env.current_contract_address(),
            &freelancer,
            &milestone.amount,
        );

        milestone.status = MilestoneStatus::Approved;
        job.milestones.set(milestone_index, milestone);
        env.storage().persistent().set(&DataKey::Job(job_id), &job);

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

    /// Returns all job IDs (paginated: pass offset + limit).
    pub fn list_jobs(env: Env, offset: u64, limit: u64) -> Vec<u64> {
        let count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::JobCount)
            .unwrap_or(0);

        let mut ids: Vec<u64> = Vec::new(&env);
        let start = offset + 1;
        let end = (offset + limit + 1).min(count + 1);

        for id in start..end {
            ids.push_back(id);
        }
        ids
    }
}

// ── WorkToken client (generated for inter-contract call) ──────────────────────
mod work_token {
    soroban_sdk::contractimport!(
        file = "../target/wasm32v1-none/release/work_token.wasm"
    );
}
