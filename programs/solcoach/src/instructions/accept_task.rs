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

    // update the streak — check consecutive days!
    let profile = &mut ctx.accounts.profile;
    profile.tasks_accepted = profile.tasks_accepted
        .checked_add(1)
        .ok_or(CoachError::MathOverflow)?;

    let task_day = ctx.accounts.task.day;
    let prev_day = profile.last_task_day;
    let day_gap = task_day.checked_sub(prev_day).unwrap_or(0);

    if prev_day == 0 {
        // first ever task accepted
        profile.current_streak = 1;
    } else if day_gap == TASK_EXPIRY_SECONDS {
        // consecutive day (exactly 24h gap between day timestamps)
        profile.current_streak = profile.current_streak
            .checked_add(1)
            .ok_or(CoachError::MathOverflow)?;
    } else if day_gap > TASK_EXPIRY_SECONDS {
        // missed a day — streak resets
        profile.current_streak = 1;
    }
    // day_gap == 0 means same day — don't change streak (shouldn't happen due to PDA uniqueness)

    profile.last_task_day = task_day;

    // new best streak? nice!
    if profile.current_streak > profile.best_streak {
        profile.best_streak = profile.current_streak;
    }

    Ok(())
}
