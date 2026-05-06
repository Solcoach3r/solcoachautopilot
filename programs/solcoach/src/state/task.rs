use anchor_lang::prelude::*;
use crate::constants::{MAX_PROTOCOL_LEN, MAX_DESCRIPTION_LEN, MAX_REASONING_LEN};

// what kind of action the coach is suggesting
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum TaskType {
    Stake,
    Unstake,
    Swap,
    Rebalance,
    ClaimRewards,
    AddLiquidity,
}

// where is this task in its lifecycle
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum TaskStatus {
    Pending,
    Accepted,
    Rejected,
    Expired,
    Resolved,
}

// the daily task that the AI coach generates for each user
#[account]
#[derive(InitSpace)]
pub struct DailyTask {
    pub user: Pubkey,
    pub day: i64,
    pub task_type: TaskType,
    #[max_len(MAX_PROTOCOL_LEN)]
    pub protocol: String,
    #[max_len(MAX_DESCRIPTION_LEN)]
    pub description: String,
    #[max_len(MAX_REASONING_LEN)]
    pub reasoning: String,
    pub suggested_amount: u64,
    pub suggested_mint: Option<Pubkey>,
    pub status: TaskStatus,
    pub tip_amount: u64,
    pub actual_result: Option<i64>,
    pub created_at: i64,
    pub resolved_at: Option<i64>,
    pub bump: u8,
}
