use anchor_lang::prelude::*;
use crate::state::{CoachConfig, TipVault};
use crate::errors::CoachError;
use crate::constants::{CONFIG_SEED, TIP_VAULT_SEED, BPS_DENOMINATOR};

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + CoachConfig::INIT_SPACE,
        seeds = [CONFIG_SEED],
        bump,
    )]
    pub config: Account<'info, CoachConfig>,

    #[account(
        init,
        payer = authority,
        space = 8 + TipVault::INIT_SPACE,
        seeds = [TIP_VAULT_SEED],
        bump,
    )]
    pub tip_vault: Account<'info, TipVault>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// sets up the coach platform with the fee settings
pub fn handler(ctx: Context<InitializeConfig>, tip_fee_bps: u16) -> Result<()> {
    require!(tip_fee_bps <= BPS_DENOMINATOR as u16, CoachError::MathOverflow);

    let config = &mut ctx.accounts.config;
    config.authority = ctx.accounts.authority.key();
    config.treasury = ctx.accounts.authority.key();
    config.tip_fee_bps = tip_fee_bps;
    config.total_users = 0;
    config.total_tips_collected = 0;
    config.bump = ctx.bumps.config;

    let vault = &mut ctx.accounts.tip_vault;
    vault.total_collected = 0;
    vault.total_distributed = 0;
    vault.bump = ctx.bumps.tip_vault;

    Ok(())
}
