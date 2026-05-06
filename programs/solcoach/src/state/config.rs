use anchor_lang::prelude::*;

// this is the global config for the coach platform
#[account]
#[derive(InitSpace)]
pub struct CoachConfig {
    pub authority: Pubkey,
    pub tip_fee_bps: u16,       // platform fee on tips (1500 = 15%)
    pub treasury: Pubkey,
    pub total_users: u64,
    pub total_tips_collected: u64,
    pub bump: u8,
}
