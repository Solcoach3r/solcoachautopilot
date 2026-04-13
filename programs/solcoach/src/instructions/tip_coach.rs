use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::*;
use crate::errors::CoachError;
use crate::constants::*;

#[derive(Accounts)]
pub struct TipCoach<'info> {
    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
    )]
    pub config: Account<'info, CoachConfig>,

    #[account(
        mut,
        seeds = [TASK_SEED, user.key().as_ref(), &task.day.to_le_bytes()],
        bump = task.bump,
        constraint = task.user == user.key() @ CoachError::Unauthorized,
        constraint = task.status == TaskStatus::Accepted @ CoachError::CannotTipRejected,
    )]
    pub task: Account<'info, DailyTask>,

    #[account(
        mut,
        seeds = [PROFILE_SEED, user.key().as_ref()],
        bump = profile.bump,
    )]
    pub profile: Account<'info, UserCoachProfile>,

    #[account(
        mut,
        seeds = [TIP_VAULT_SEED],
        bump = tip_vault.bump,
    )]
    pub tip_vault: Account<'info, TipVault>,

    /// CHECK: treasury receives platform fee
    #[account(
        mut,
        constraint = treasury.key() == config.treasury @ CoachError::Unauthorized,
    )]
    pub treasury: UncheckedAccount<'info>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// user tips the coach for helpful advice!
pub fn handler(ctx: Context<TipCoach>, amount: u64) -> Result<()> {
    require!(amount > 0, CoachError::InsufficientFunds);

    // calculate platform fee
    let platform_fee = amount
        .checked_mul(ctx.accounts.config.tip_fee_bps as u64)
        .and_then(|v| v.checked_div(BPS_DENOMINATOR))
        .ok_or(CoachError::MathOverflow)?;

    let vault_amount = amount
        .checked_sub(platform_fee)
        .ok_or(CoachError::MathOverflow)?;

    // state updates BEFORE CPI
    require!(ctx.accounts.task.tip_amount == 0, CoachError::TaskAlreadyHandled);
    ctx.accounts.task.tip_amount = amount;
    ctx.accounts.profile.total_tips_given = ctx.accounts.profile.total_tips_given
        .checked_add(amount)
        .ok_or(CoachError::MathOverflow)?;
    ctx.accounts.tip_vault.total_collected = ctx.accounts.tip_vault.total_collected
        .checked_add(vault_amount)
        .ok_or(CoachError::MathOverflow)?;

    // send the vault portion (CPI AFTER state updates)
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.user.to_account_info(),
                to: ctx.accounts.tip_vault.to_account_info(),
            },
        ),
        vault_amount,
    )?;

    // send the platform fee to treasury
    if platform_fee > 0 {
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.user.to_account_info(),
                    to: ctx.accounts.treasury.to_account_info(),
                },
            ),
            platform_fee,
        )?;
    }

    Ok(())
}
