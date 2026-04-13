use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::CoachError;
use crate::constants::*;

#[derive(Accounts)]
#[instruction(day_timestamp: i64)]
pub struct CreateDailyTask<'info> {
    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = config.authority == authority.key() @ CoachError::Unauthorized,
    )]
    pub config: Account<'info, CoachConfig>,

    #[account(
        mut,
        seeds = [PROFILE_SEED, user.key().as_ref()],
        bump = profile.bump,
    )]
    pub profile: Account<'info, UserCoachProfile>,

    #[account(
        init,
        payer = authority,
        space = 8 + DailyTask::INIT_SPACE,
        seeds = [TASK_SEED, user.key().as_ref(), &day_timestamp.to_le_bytes()],
        bump,
    )]
    pub task: Account<'info, DailyTask>,

    /// CHECK: the user who will receive this task
    pub user: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// the crank calls this to create a new daily task for a user
#[allow(clippy::too_many_arguments)]
pub fn handler(
    ctx: Context<CreateDailyTask>,
    day_timestamp: i64,
    task_type: TaskType,
    protocol: String,
    description: String,
    reasoning: String,
    suggested_amount: u64,
    suggested_mint: Option<Pubkey>,
) -> Result<()> {
    require!(protocol.len() <= MAX_PROTOCOL_LEN, CoachError::ProtocolTooLong);
    require!(description.len() <= MAX_DESCRIPTION_LEN, CoachError::DescriptionTooLong);

    let clock = Clock::get()?;

    let task = &mut ctx.accounts.task;
    task.user = ctx.accounts.user.key();
    task.day = day_timestamp;
    task.task_type = task_type;
    task.protocol = protocol;
    task.description = description;
    task.reasoning = reasoning;
    task.suggested_amount = suggested_amount;
    task.suggested_mint = suggested_mint;
    task.status = TaskStatus::Pending;
    task.tip_amount = 0;
    task.actual_result = None;
    task.created_at = clock.unix_timestamp;
    task.resolved_at = None;
    task.bump = ctx.bumps.task;

    // bump the task counter on the profile
    let profile = &mut ctx.accounts.profile;
    profile.total_tasks_received = profile.total_tasks_received
        .checked_add(1)
        .ok_or(CoachError::MathOverflow)?;

    Ok(())
}
