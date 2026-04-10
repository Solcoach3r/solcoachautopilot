use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::CoachError;
use crate::constants::*;

#[derive(Accounts)]
pub struct AcceptTask<'info> {
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

// user accepts the daily task — streak goes up!
pub fn handler(ctx: Context<AcceptTask>) -> Result<()> {
    let clock = Clock::get()?;

    // check if the task hasn't expired
    let task = &ctx.accounts.task;
    let time_since_creation = clock.unix_timestamp
        .checked_sub(task.created_at)
        .ok_or(CoachError::MathOverflow)?;
    require!(time_since_creation < TASK_EXPIRY_SECONDS, CoachError::TaskExpired);

    // mark as accepted
    let task = &mut ctx.accounts.task;
    task.status = TaskStatus::Accepted;

    // update the streak!
    let profile = &mut ctx.accounts.profile;
    profile.tasks_accepted = profile.tasks_accepted
        .checked_add(1)
        .ok_or(CoachError::MathOverflow)?;

    profile.current_streak = profile.current_streak
        .checked_add(1)
        .ok_or(CoachError::MathOverflow)?;

    // new best streak? nice!
    if profile.current_streak > profile.best_streak {
        profile.best_streak = profile.current_streak;
    }

    Ok(())
}
