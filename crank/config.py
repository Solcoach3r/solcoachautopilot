import os
from dotenv import load_dotenv

load_dotenv()

RPC_URL = os.getenv('ANCHOR_PROVIDER_URL', 'https://api.devnet.solana.com')
PROGRAM_ID = os.getenv('PROGRAM_ID', '')
KEYPAIR_PATH = os.getenv('CRANK_KEYPAIR_PATH', './crank-keypair.json')
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY', '')
HELIUS_API_KEY = os.getenv('HELIUS_API_KEY', '')

TASK_GENERATION_CRON = os.getenv('TASK_GENERATION_CRON', '0 8 * * *')
YIELD_UPDATE_INTERVAL = int(os.getenv('YIELD_UPDATE_INTERVAL_MINUTES', '30'))
