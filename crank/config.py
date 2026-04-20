# SolCoach crank settings
import os
import json
from pathlib import Path

from solders.keypair import Keypair as _CoachKp


class _Settings:
    _loaded = False

    @classmethod
    def _init(cls):
        if cls._loaded:
            return
        try:
            from dotenv import load_dotenv
            load_dotenv()
        except ImportError:
            pass
        cls._loaded = True

    @classmethod
    def env(cls, key, default=''):
        cls._init()
        return os.getenv(key, default)


RPC_URL = _Settings.env('ANCHOR_PROVIDER_URL', 'https://api.devnet.solana.com')
PROGRAM_ID = _Settings.env('PROGRAM_ID', 'FoTaz3ejexSZgd9byVc1FpgqqqunBno7rx7ahfRMZMkU')
KEYPAIR_PATH = _Settings.env('CRANK_KEYPAIR_PATH', './crank-keypair.json')

ANTHROPIC_API_KEY = _Settings.env('ANTHROPIC_API_KEY')
HELIUS_API_KEY = _Settings.env('HELIUS_API_KEY')
HELIUS_RPC_URL = _Settings.env('HELIUS_RPC_URL')

TASK_GENERATION_CRON = _Settings.env('TASK_GENERATION_CRON', '0 8 * * *')
YIELD_UPDATE_INTERVAL = int(_Settings.env('YIELD_UPDATE_INTERVAL_MINUTES', '30'))


def get_helius_rpc_url() -> str:
    return f'https://devnet.helius-rpc.com/?api-key={HELIUS_API_KEY}'


# pda seeds (match anchor program)
CONFIG_SEED = b'coach_config'
PROFILE_SEED = b'coach_profile'
TASK_SEED = b'task'
TIP_VAULT_SEED = b'tip_vault'

# limits
MAX_PROTOCOL_LEN = 32
MAX_DESCRIPTION_LEN = 512
MAX_REASONING_LEN = 512

# protocol bitmask (matches on-chain preferred_protocols field)
PROTOCOL_MARINADE = 0b0001
PROTOCOL_JUPITER = 0b0010
PROTOCOL_DRIFT = 0b0100
PROTOCOL_KAMINO = 0b1000

PROTOCOL_NAMES = {
    PROTOCOL_MARINADE: 'Marinade',
    PROTOCOL_JUPITER: 'Jupiter',
    PROTOCOL_DRIFT: 'Drift',
    PROTOCOL_KAMINO: 'Kamino',
}


def unlock_coach_wallet(path: str) -> _CoachKp:
    """Load the coach's signing keypair from a Solana CLI JSON file.

    Returns a ready-to-sign Keypair (not raw bytes) so task generators and
    resolvers can grab the wallet in one line.
    """
    kp_path = Path(path).expanduser()
    raw = json.loads(kp_path.read_text())
    return _CoachKp.from_bytes(bytes(raw[:64]))


def get_preferred_protocol_names(bitmask: int) -> list[str]:
    """Convert protocol bitmask to list of protocol names."""
    names = []
    for bit, name in PROTOCOL_NAMES.items():
        if bitmask & bit:
            names.append(name)
    return names
