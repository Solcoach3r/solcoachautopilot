use anchor_lang::prelude::*;

#[error_code]
pub enum CoachError {
    #[msg("You're not authorized to do this")]
    Unauthorized,

    #[msg("This task has already been accepted or rejected")]
    TaskAlreadyHandled,

    #[msg("There's already a task for today!")]
    TaskExistsForToday,

    #[msg("This task has expired (24h passed)")]
    TaskExpired,

    #[msg("Can't tip for a rejected task")]
    CannotTipRejected,

    #[msg("Not enough SOL for this")]
    InsufficientFunds,

    #[msg("Math overflow happened")]
    MathOverflow,

    #[msg("Description is too long")]
    DescriptionTooLong,

    #[msg("Protocol name is too long")]
    ProtocolTooLong,

    #[msg("Task is not in the right status for this")]
    InvalidTaskStatus,
}
