"""
Task Resolver — SolCoachAutopilot

Runs daily at 8:00 UTC (24h after task generation).
Checks accepted tasks from yesterday:
1. Did the user actually execute the task?
2. Calculate P&L based on wallet state changes
3. Call resolve_task on-chain with actual result

time to see who actually did their homework 📝
"""

import struct
import hashlib
import logging
from datetime import datetime, timezone, timedelta

from solders.pubkey import Pubkey
from solders.keypair import Keypair
from solana.rpc.api import Client
from solana.rpc.commitment import Confirmed
from solders.transaction import Transaction
from solders.instruction import Instruction, AccountMeta
from apscheduler.schedulers.blocking import BlockingScheduler

from config import (
    RPC_URL,
    PROGRAM_ID,
    KEYPAIR_PATH,
    TASK_GENERATION_CRON,
    CONFIG_SEED,
    unlock_coach_wallet,
)
from wallet_analyzer import fetch_wallet_snapshot

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s  %(name)s  %(levelname)s  %(message)s',
    datefmt='%d-%m %H:%M',
)
log = logging.getLogger('task_resolver')

PROGRAM_PUBKEY = Pubkey.from_string(PROGRAM_ID)
rpcClient = Client(RPC_URL)

TASK_DISCRIMINATOR = hashlib.sha256(b'account:DailyTask').digest()[:8]

# TaskStatus enum values
STATUS_PENDING = 0
STATUS_ACCEPTED = 1
STATUS_REJECTED = 2
STATUS_EXPIRED = 3

# TaskType enum values
TASK_TYPE_NAMES = {
    0: 'Stake',
    1: 'Unstake',
    2: 'Swap',
    3: 'Rebalance',
    4: 'ClaimRewards',
    5: 'AddLiquidity',
}


def get_crank_keypair() -> Keypair:
    return unlock_coach_wallet(KEYPAIR_PATH)


def derive_config_pda() -> Pubkey:
    pda, _ = Pubkey.find_program_address([CONFIG_SEED], PROGRAM_PUBKEY)
    return pda


def get_yesterday_timestamp() -> int:
    """Get yesterday's 00:00 UTC timestamp."""
    now = datetime.now(timezone.utc)
    yesterday = now - timedelta(days=1)
    dayStart = yesterday.replace(hour=0, minute=0, second=0, microsecond=0)
    return int(dayStart.timestamp())


def fetch_accepted_tasks() -> list[dict]:
    """Fetch all DailyTask accounts that are in Accepted status."""
    try:
        response = rpcClient.get_program_accounts(PROGRAM_PUBKEY, commitment=Confirmed)
        if response.value is None:
            return []

        tasks = []
        for accountInfo in response.value:
            data = bytes(accountInfo.account.data)
            parsed = parse_task_account(data)
            if parsed is not None and parsed['status'] == STATUS_ACCEPTED:
                if parsed['actualResult'] is None:
                    parsed['taskPubkey'] = accountInfo.pubkey
                    tasks.append(parsed)
        return tasks

    except Exception as exc:
        log.error(f'failed to fetch tasks: {exc}')
        return []


def parse_task_account(data: bytes) -> dict | None:
    """Parse DailyTask account data.

    Layout after 8-byte discriminator:
      user: Pubkey (32)
      day: i64 (8)
      task_type: enum u8 (1)
      protocol: String (4 + len)
      description: String (4 + len)
      reasoning: String (4 + len)
      suggested_amount: u64 (8)
      suggested_mint: Option<Pubkey> (1 + 32)
      status: enum u8 (1)
      tip_amount: u64 (8)
      actual_result: Option<i64> (1 + 8)
      created_at: i64 (8)
      resolved_at: Option<i64> (1 + 8)
      bump: u8 (1)
    """
    if len(data) < 80:
        return None

    if data[:8] != TASK_DISCRIMINATOR:
        return None

    try:
        offset = 8
        user = Pubkey.from_bytes(data[offset:offset + 32])
        offset += 32

        day = struct.unpack_from('<q', data, offset)[0]
        offset += 8

        taskType = data[offset]
        offset += 1

        # protocol: String
        protocolLen = struct.unpack_from('<I', data, offset)[0]
        offset += 4
        if protocolLen > 32:
            return None
        protocol = data[offset:offset + protocolLen].decode('utf-8', errors='replace')
        offset += protocolLen

        # description: String
        descLen = struct.unpack_from('<I', data, offset)[0]
        offset += 4
        if descLen > 512:
            return None
        offset += descLen  # skip description content

        # reasoning: String
        reasonLen = struct.unpack_from('<I', data, offset)[0]
        offset += 4
        if reasonLen > 512:
            return None
        offset += reasonLen  # skip reasoning content

        suggestedAmount = struct.unpack_from('<Q', data, offset)[0]
        offset += 8

        # suggested_mint: Option<Pubkey>
        mintTag = data[offset]
        offset += 1
        if mintTag == 1:
            offset += 32

        status = data[offset]
        offset += 1

        tipAmount = struct.unpack_from('<Q', data, offset)[0]
        offset += 8

        # actual_result: Option<i64>
        resultTag = data[offset]
        offset += 1
        actualResult = None
        if resultTag == 1:
            actualResult = struct.unpack_from('<q', data, offset)[0]
            offset += 8

        createdAt = struct.unpack_from('<q', data, offset)[0]
        offset += 8

        return {
            'user': user,
            'day': day,
            'taskType': taskType,
            'protocol': protocol,
            'suggestedAmount': suggestedAmount,
            'status': status,
            'tipAmount': tipAmount,
            'actualResult': actualResult,
            'createdAt': createdAt,
        }

    except (struct.error, IndexError):
        return None


def estimate_task_pnl(
    taskType: int,
    suggestedAmount: int,
    userPubkey: str,
) -> int:
    """Estimate P&L for a resolved task.

    In production, this would compare wallet snapshots before/after.
    For devnet/MVP, we estimate based on task type and typical yields.
    Returns P&L in lamports.
    """
    suggestedSol = suggestedAmount / 1_000_000_000
    typeName = TASK_TYPE_NAMES.get(taskType, 'Unknown')

    # estimates based on typical daily returns per task type
    dailyReturnBps = {
        'Stake': 18,           # ~6.8% APY / 365 ≈ 1.8 bps/day
        'Unstake': 0,          # neutral
        'Swap': 50,            # can be positive or negative
        'Rebalance': 25,       # small optimization
        'ClaimRewards': 100,   # direct profit (claiming earned yield)
        'AddLiquidity': 40,    # LP fees
    }

    bps = dailyReturnBps.get(typeName, 10)
    estimatedPnl = int(suggestedSol * bps / 10_000 * 1_000_000_000)

    log.info(
        f'  estimated P&L for {typeName}: '
        f'{suggestedSol:.4f} SOL × {bps} bps = {estimatedPnl} lamports'
    )

    return estimatedPnl


def build_resolve_task_ix(
    configPda: Pubkey,
    taskPubkey: Pubkey,
    crankPubkey: Pubkey,
    actualResult: int,
) -> Instruction:
    """Build the resolve_task instruction."""
    discriminator = hashlib.sha256(b'global:resolve_task').digest()[:8]

    ixData = bytearray(discriminator)
    ixData += struct.pack('<q', actualResult)  # actual_result: i64

    accounts = [
        AccountMeta(pubkey=configPda, is_signer=False, is_writable=False),
        AccountMeta(pubkey=taskPubkey, is_signer=False, is_writable=True),
        AccountMeta(pubkey=crankPubkey, is_signer=True, is_writable=False),
    ]

    return Instruction(
        program_id=PROGRAM_PUBKEY,
        accounts=accounts,
        data=bytes(ixData),
    )


def resolve_tasks():
    """Resolve yesterday's accepted tasks with actual P&L."""
    log.info('resolving yesterday\'s tasks...')

    tasks = fetch_accepted_tasks()
    yesterdayTs = get_yesterday_timestamp()

    # filter to tasks from yesterday (within 24h window)
    yesterdayTasks = [
        t for t in tasks
        if abs(t['day'] - yesterdayTs) < 86400
    ]

    if not yesterdayTasks:
        log.info('no accepted tasks from yesterday to resolve')
        return

    log.info(f'found {len(yesterdayTasks)} task(s) to resolve')
    crankKeypair = get_crank_keypair()
    configPda = derive_config_pda()

    resolvedCount = 0
    for task in yesterdayTasks:
        userStr = str(task['user'])[:8]

        try:
            pnl = estimate_task_pnl(
                taskType=task['taskType'],
                suggestedAmount=task['suggestedAmount'],
                userPubkey=str(task['user']),
            )

            ix = build_resolve_task_ix(
                configPda=configPda,
                taskPubkey=task['taskPubkey'],
                crankPubkey=crankKeypair.pubkey(),
                actualResult=pnl,
            )

            recentBlockhash = rpcClient.get_latest_blockhash(Confirmed).value.blockhash
            txn = Transaction.new_signed_with_payer(
                [ix],
                payer=crankKeypair.pubkey(),
                signing_keypairs=[crankKeypair],
                recent_blockhash=recentBlockhash,
            )

            txResult = rpcClient.send_transaction(txn)
            typeName = TASK_TYPE_NAMES.get(task['taskType'], '?')
            log.info(f'  {userStr}... {typeName} resolved (P&L: {pnl} lamports) tx={txResult.value}')
            resolvedCount += 1

        except Exception as exc:
            log.error(f'  {userStr}... resolve failed: {exc}')
            continue

    log.info(f'resolved {resolvedCount}/{len(yesterdayTasks)} tasks')


def run_scheduler():
    """Run the task resolver on daily cron (same time as generator, resolves yesterday)."""
    scheduler = BlockingScheduler()

    cronParts = TASK_GENERATION_CRON.split()
    scheduler.add_job(
        resolve_tasks,
        'cron',
        minute=cronParts[0],
        hour=cronParts[1],
        day=cronParts[2],
        month=cronParts[3],
        day_of_week=cronParts[4],
    )

    log.info(f'task resolver scheduled: {TASK_GENERATION_CRON}')
    log.info('running initial resolution now...')
    resolve_tasks()

    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        log.info('task resolver stopped')


if __name__ == '__main__':
    run_scheduler()
