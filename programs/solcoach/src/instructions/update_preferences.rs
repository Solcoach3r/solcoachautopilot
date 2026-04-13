use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::CoachError;
use crate::constants::PROFILE_SEED;

#[derive(Accounts)]
pub struct UpdatePreferences<'info> {
    #[account(
        mut,
        seeds = [PROFILE_SEED, user.key().as_ref()],
        bump = profile.bump,
        constraint = profile.user == user.key() @ CoachError::Unauthorized,
    )]
    pub profile: Account<'info, UserCoachProfile>,

    pub user: Signer<'info>,
}

// lets users change their risk tolerance and protocol preferences
pub fn handler(
    ctx: Context<UpdatePreferences>,
    risk_tolerance: Option<RiskTolerance>,
    preferred_protocols: Option<u8>,
) -> Result<()> {
    let profile = &mut ctx.accounts.profile;

    if let Some(rt) = risk_tolerance {
        profile.risk_tolerance = rt;
    }

    if let Some(pp) = preferred_protocols {
        profile.preferred_protocols = pp;
    }

    Ok(())
}
