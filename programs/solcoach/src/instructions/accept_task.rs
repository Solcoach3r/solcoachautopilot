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

    // update the streak — check consecutive UTC days!
    let profile = &mut ctx.accounts.profile;
    profile.tasks_accepted = profile.tasks_accepted
        .checked_add(1)
        .ok_or(CoachError::MathOverflow)?;

    // bucket timestamps into UTC day indices so wall-clock accept time
    // (e.g. 23:00 day N then 01:00 day N+1) still counts as consecutive
    let today_day = clock.unix_timestamp
        .checked_div(TASK_EXPIRY_SECONDS)
        .ok_or(CoachError::MathOverflow)?;
    let last_day = profile.last_task_day
        .checked_div(TASK_EXPIRY_SECONDS)
        .unwrap_or(0);

    if profile.last_task_day == 0 {
        // first ever task accepted
        profile.current_streak = 1;
    } else if today_day == last_day {
        // already accepted a quest today — idempotent, leave streak alone
    } else if today_day == last_day.checked_add(1).ok_or(CoachError::MathOverflow)? {
        // next UTC day — streak goes up!
        profile.current_streak = profile.current_streak
            .checked_add(1)
            .ok_or(CoachError::MathOverflow)?;
    } else {
        // missed at least a full day — back to square one
        profile.current_streak = 1;
    }

    // store the actual accept timestamp so future calls divide off the same axis
    profile.last_task_day = clock.unix_timestamp;

    // new best streak? nice!
    if profile.current_streak > profile.best_streak {
        profile.best_streak = profile.current_streak;
    }

    Ok(())
}
