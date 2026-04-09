pub const CONFIG_SEED: &[u8] = b"coach_config";
pub const PROFILE_SEED: &[u8] = b"coach_profile";
pub const TASK_SEED: &[u8] = b"task";
pub const TIP_VAULT_SEED: &[u8] = b"tip_vault";

pub const MAX_PROTOCOL_LEN: usize = 32;
pub const MAX_DESCRIPTION_LEN: usize = 512;
pub const MAX_REASONING_LEN: usize = 512;

pub const BPS_DENOMINATOR: u64 = 10_000;

// 24 hours in seconds — tasks expire after this
pub const TASK_EXPIRY_SECONDS: i64 = 86_400;
