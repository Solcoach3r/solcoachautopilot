import os
import json
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# solana rpc
RPC_URL = os.getenv('ANCHOR_PROVIDER_URL', 'https://api.devnet.solana.com')
PROGRAM_ID = os.getenv('PROGRAM_ID', 'FoTaz3ejexSZgd9byVc1FpgqqqunBno7rx7ahfRMZMkU')
KEYPAIR_PATH = os.getenv('CRANK_KEYPAIR_PATH', './crank-keypair.json')

# claude api
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY', '')

# helius for wallet data
HELIUS_API_KEY = os.getenv('HELIUS_API_KEY', '')


def get_helius_rpc_url() -> str:
    return f'https://devnet.helius-rpc.com/?api-key={HELIUS_API_KEY}'

# scheduling
TASK_GENERATION_CRON = os.getenv('TASK_GENERATION_CRON', '0 8 * * *')
YIELD_UPDATE_INTERVAL = int(os.getenv('YIELD_UPDATE_INTERVAL_MINUTES', '30'))

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


def load_keypair_bytes(path: str) -> bytes:
    resolved = Path(path).expanduser()
    with open(resolved, 'r') as fh:
        data = json.load(fh)
    return bytes(data[:64])


def get_preferred_protocol_names(bitmask: int) -> list[str]:
    """Convert protocol bitmask to list of protocol names."""
    names = []
    for bit, name in PROTOCOL_NAMES.items():
        if bitmask & bit:
            names.append(name)
    return names
