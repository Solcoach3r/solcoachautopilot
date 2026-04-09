use anchor_lang::prelude::*;
use crate::state::{CoachConfig, UserCoachProfile, RiskTolerance};
use crate::constants::{CONFIG_SEED, PROFILE_SEED};

#[derive(Accounts)]
pub struct RegisterUser<'info> {
    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump,
    )]
    pub config: Account<'info, CoachConfig>,

    #[account(
        init,
        payer = user,
        space = 8 + UserCoachProfile::INIT_SPACE,
        seeds = [PROFILE_SEED, user.key().as_ref()],
        bump,
    )]
    pub profile: Account<'info, UserCoachProfile>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// welcome new user! creates their coach profile
pub fn handler(
    ctx: Context<RegisterUser>,
    risk_tolerance: RiskTolerance,
    preferred_protocols: u8,
) -> Result<()> {
    let clock = Clock::get()?;

    let profile = &mut ctx.accounts.profile;
    profile.user = ctx.accounts.user.key();
    profile.joined_at = clock.unix_timestamp;
    profile.total_tasks_received = 0;
    profile.tasks_accepted = 0;
    profile.tasks_rejected = 0;
    profile.current_streak = 0;
    profile.best_streak = 0;
    profile.total_tips_given = 0;
    profile.total_profit_from_tips = 0;
    profile.risk_tolerance = risk_tolerance;
    profile.preferred_protocols = preferred_protocols;
    profile.is_pro = false;
    profile.pro_expires_at = None;
    profile.bump = ctx.bumps.profile;

    let config = &mut ctx.accounts.config;
    config.total_users = config.total_users
        .checked_add(1)
        .ok_or(crate::errors::CoachError::MathOverflow)?;

    Ok(())
}
