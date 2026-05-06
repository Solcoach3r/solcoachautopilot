use anchor_lang::prelude::*;

// how risky does the user want their tasks to be
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum RiskTolerance {
    Conservative,
    Moderate,
    Aggressive,
}

// each user gets a profile that tracks their streak and preferences
#[account]
#[derive(InitSpace)]
pub struct UserCoachProfile {
    pub user: Pubkey,
    pub joined_at: i64,
    pub total_tasks_received: u64,
    pub tasks_accepted: u64,
    pub tasks_rejected: u64,
    pub current_streak: u16,
    pub best_streak: u16,
    pub total_tips_given: u64,
    pub total_profit_from_tips: i64,
    pub last_task_day: i64,        // UTC midnight timestamp of the last accepted task (for streak validation)
    pub risk_tolerance: RiskTolerance,
    pub preferred_protocols: u8,   // bitmask: bit0=Marinade, bit1=Jupiter, bit2=Drift, bit3=Kamino
    pub is_pro: bool,
    pub pro_expires_at: Option<i64>,
    pub bump: u8,
}
