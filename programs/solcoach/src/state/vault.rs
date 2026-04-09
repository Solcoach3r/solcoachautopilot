use anchor_lang::prelude::*;

// tip vault collects tips from users who got good advice
#[account]
#[derive(InitSpace)]
pub struct TipVault {
    pub total_collected: u64,
    pub total_distributed: u64,
    pub bump: u8,
}
