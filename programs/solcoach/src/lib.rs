use anchor_lang::prelude::*;

mod constants;
mod errors;
mod instructions;
mod state;

use instructions::*;
use instructions as ix;

declare_id!("FoTaz3ejexSZgd9byVc1FpgqqqunBno7rx7ahfRMZMkU");

#[program]
pub mod solcoach {
    use super::*;

    pub fn initialize_config(ctx: Context<InitializeConfig>, tip_fee_bps: u16) -> Result<()> {
        ix::initialize_config::handler(ctx, tip_fee_bps)
    }

    pub fn register_user(
        ctx: Context<RegisterUser>,
        risk_tolerance: state::RiskTolerance,
        preferred_protocols: u8,
    ) -> Result<()> {
        ix::register_user::handler(ctx, risk_tolerance, preferred_protocols)
    }

    pub fn create_daily_task(
        ctx: Context<CreateDailyTask>,
        day_timestamp: i64,
        task_type: state::TaskType,
        protocol: String,
        description: String,
        reasoning: String,
        suggested_amount: u64,
        suggested_mint: Option<Pubkey>,
    ) -> Result<()> {
        ix::create_daily_task::handler(
            ctx, day_timestamp, task_type, protocol, description, reasoning,
            suggested_amount, suggested_mint,
        )
    }

    pub fn accept_task(ctx: Context<AcceptTask>) -> Result<()> {
        ix::accept_task::handler(ctx)
    }

    pub fn reject_task(ctx: Context<RejectTask>) -> Result<()> {
        ix::reject_task::handler(ctx)
    }

    pub fn tip_coach(ctx: Context<TipCoach>, amount: u64) -> Result<()> {
        ix::tip_coach::handler(ctx, amount)
    }

    pub fn resolve_task(ctx: Context<ResolveTask>, actual_result: i64) -> Result<()> {
        ix::resolve_task::handler(ctx, actual_result)
    }

    pub fn update_preferences(
        ctx: Context<UpdatePreferences>,
        risk_tolerance: Option<state::RiskTolerance>,
        preferred_protocols: Option<u8>,
    ) -> Result<()> {
        ix::update_preferences::handler(ctx, risk_tolerance, preferred_protocols)
    }
}
