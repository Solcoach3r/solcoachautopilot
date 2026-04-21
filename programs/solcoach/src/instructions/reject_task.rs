use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::CoachError;
use crate::constants::{PROFILE_SEED, TASK_SEED};

#[derive(Accounts)]
pub struct RejectTask<'info> {
    #[account(
        mut,
        seeds = [TASK_SEED, user.key().as_ref(), &task.day.to_le_bytes()],
        bump = task.bump,
        constraint = task.user == user.key() @ CoachError::Unauthorized,
        constraint = task.status == TaskStatus::Pending @ CoachError::TaskAlreadyHandled,
    )]
    pub task: Account<'info, DailyTask>,

    #[account(
        mut,
        seeds = [PROFILE_SEED, user.key().as_ref()],
        bump = profile.bump,
    )]
    pub profile: Account<'info, UserCoachProfile>,

    pub user: Signer<'info>,
}

// user rejects the task — streak resets to 0 :(
pub fn handler(ctx: Context<RejectTask>) -> Result<()> {
    let task = &mut ctx.accounts.task;
    task.status = TaskStatus::Rejected;

    let profile = &mut ctx.accounts.profile;
    profile.tasks_rejected = profile.tasks_rejected
        .checked_add(1)
        .ok_or(CoachError::MathOverflow)?;

    // streak resets on reject
    profile.current_streak = 0;

    Ok(())
}
