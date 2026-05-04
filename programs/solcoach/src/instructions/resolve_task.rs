use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::CoachError;
use crate::constants::{CONFIG_SEED, TASK_SEED};

#[derive(Accounts)]
pub struct ResolveTask<'info> {
    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = config.authority == authority.key() @ CoachError::Unauthorized,
    )]
    pub config: Account<'info, CoachConfig>,

    #[account(
        mut,
        seeds = [TASK_SEED, task.user.as_ref(), &task.day.to_le_bytes()],
        bump = task.bump,
        constraint = task.status == TaskStatus::Accepted @ CoachError::InvalidTaskStatus,
    )]
    pub task: Account<'info, DailyTask>,

    pub authority: Signer<'info>,
}

// crank resolves the task after 24h with actual P&L result
pub fn handler(ctx: Context<ResolveTask>, actual_result: i64) -> Result<()> {
    let clock = Clock::get()?;

    let task = &mut ctx.accounts.task;
    task.actual_result = Some(actual_result);
    task.resolved_at = Some(clock.unix_timestamp);
    task.status = TaskStatus::Resolved;

    Ok(())
}
