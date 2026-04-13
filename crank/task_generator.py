"""
Task Generator — SolCoachAutopilot

The heart of the AI coach! Runs daily at 8:00 UTC.
For each registered user:
1. Fetches wallet balances
2. Gets current yield opportunities
3. Determines difficulty level
4. Sends everything to Claude API
5. Claude generates a personalized daily task
6. Crank calls create_daily_task on-chain

this is where the magic happens ✨
"""

import struct
import time
import hashlib
import logging
from datetime import datetime, timezone

import httpx
from anthropic import Anthropic
from solders.pubkey import Pubkey
from solders.keypair import Keypair
from solana.rpc.api import Client
from solana.rpc.commitment import Confirmed
from solders.transaction import Transaction
from solders.instruction import Instruction, AccountMeta
from solders.system_program import ID as SYSTEM_PROGRAM_ID
from apscheduler.schedulers.blocking import BlockingScheduler

from config import (
    RPC_URL,
    PROGRAM_ID,
    KEYPAIR_PATH,
    ANTHROPIC_API_KEY,
    TASK_GENERATION_CRON,
    CONFIG_SEED,
    PROFILE_SEED,
    TASK_SEED,
    load_keypair_bytes,
    get_preferred_protocol_names,
)
from wallet_analyzer import fetch_wallet_snapshot
from yield_aggregator import (
    get_cached_yields,
    filter_by_risk,
    filter_by_protocols,
    format_yields_for_prompt,
)
from difficulty import (
    calculate_user_level,
    get_difficulty_profile,
    format_difficulty_for_prompt,
)

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
)
log = logging.getLogger('task_gen')

PROGRAM_PUBKEY = Pubkey.from_string(PROGRAM_ID)
rpcClient = Client(RPC_URL)
claudeClient = Anthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None

# maps task type string to on-chain enum index
TASK_TYPE_MAP = {
    'Stake': 0,
    'Unstake': 1,
    'Swap': 2,
    'Rebalance': 3,
    'ClaimRewards': 4,
    'AddLiquidity': 5,
}

RISK_TOLERANCE_NAMES = {0: 'Conservative', 1: 'Moderate', 2: 'Aggressive'}

PROFILE_DISCRIMINATOR = hashlib.sha256(b'account:UserCoachProfile').digest()[:8]


def get_crank_keypair() -> Keypair:
    return Keypair.from_bytes(load_keypair_bytes(KEYPAIR_PATH))


def derive_config_pda() -> Pubkey:
    pda, _ = Pubkey.find_program_address([CONFIG_SEED], PROGRAM_PUBKEY)
    return pda


def derive_profile_pda(userPubkey: Pubkey) -> Pubkey:
    pda, _ = Pubkey.find_program_address(
        [PROFILE_SEED, bytes(userPubkey)],
        PROGRAM_PUBKEY,
    )
    return pda


def derive_task_pda(userPubkey: Pubkey, dayTimestamp: int) -> Pubkey:
    pda, _ = Pubkey.find_program_address(
        [TASK_SEED, bytes(userPubkey), struct.pack('<q', dayTimestamp)],
        PROGRAM_PUBKEY,
    )
    return pda


def get_today_timestamp() -> int:
    """Get today's 00:00 UTC timestamp (used as task PDA seed)."""
    now = datetime.now(timezone.utc)
    todayStart = now.replace(hour=0, minute=0, second=0, microsecond=0)
    return int(todayStart.timestamp())


def fetch_all_user_profiles() -> list[dict]:
    """Fetch all UserCoachProfile accounts from the program."""
    try:
        response = rpcClient.get_program_accounts(PROGRAM_PUBKEY, commitment=Confirmed)
        if response.value is None:
            return []

        profiles = []
        for accountInfo in response.value:
            data = bytes(accountInfo.account.data)
            parsed = parse_profile_account(data)
            if parsed is not None:
                parsed['accountPubkey'] = accountInfo.pubkey
                profiles.append(parsed)
        return profiles

    except Exception as exc:
        log.error(f'failed to fetch profiles: {exc}')
        return []


def parse_profile_account(data: bytes) -> dict | None:
    """Parse UserCoachProfile account data."""
    if len(data) < 8 + 32 + 8:
        return None

    if data[:8] != PROFILE_DISCRIMINATOR:
        return None

    try:
        offset = 8
        user = Pubkey.from_bytes(data[offset:offset + 32])
        offset += 32

        joinedAt = struct.unpack_from('<q', data, offset)[0]
        offset += 8

        totalTasksReceived = struct.unpack_from('<Q', data, offset)[0]
        offset += 8

        tasksAccepted = struct.unpack_from('<Q', data, offset)[0]
        offset += 8

        tasksRejected = struct.unpack_from('<Q', data, offset)[0]
        offset += 8

        currentStreak = struct.unpack_from('<H', data, offset)[0]
        offset += 2

        bestStreak = struct.unpack_from('<H', data, offset)[0]
        offset += 2

        totalTipsGiven = struct.unpack_from('<Q', data, offset)[0]
        offset += 8

        totalProfitFromTips = struct.unpack_from('<q', data, offset)[0]
        offset += 8

        riskTolerance = data[offset]
        offset += 1

        preferredProtocols = data[offset]
        offset += 1

        isPro = bool(data[offset])
        offset += 1

        return {
            'user': user,
            'joinedAt': joinedAt,
            'totalTasksReceived': totalTasksReceived,
            'tasksAccepted': tasksAccepted,
            'tasksRejected': tasksRejected,
            'currentStreak': currentStreak,
            'bestStreak': bestStreak,
            'totalTipsGiven': totalTipsGiven,
            'totalProfitFromTips': totalProfitFromTips,
            'riskTolerance': riskTolerance,
            'preferredProtocols': preferredProtocols,
            'isPro': isPro,
        }

    except (struct.error, IndexError):
        return None


def generate_task_with_claude(
    walletSummary: str,
    yieldSummary: str,
    difficultySummary: str,
    riskTolerance: str,
    preferredProtocols: list[str],
    currentStreak: int,
) -> dict | None:
    """Ask Claude to generate a personalized daily task."""
    if claudeClient is None:
        log.warning('claude API not configured, using fallback task')
        return generate_fallback_task()

    protocolsStr = ', '.join(preferredProtocols) if preferredProtocols else 'any protocol'

    prompt = f"""You are an AI DeFi coach on Solana. Generate ONE daily task for a user.

USER PORTFOLIO:
{walletSummary}

CURRENT YIELD OPPORTUNITIES:
{yieldSummary}

DIFFICULTY LEVEL:
{difficultySummary}

USER PREFERENCES:
- Risk tolerance: {riskTolerance}
- Preferred protocols: {protocolsStr}
- Current streak: {currentStreak} days

Generate a task. Respond in EXACTLY this JSON format (no markdown, no extra text):
{{
  "taskType": "Stake|Unstake|Swap|Rebalance|ClaimRewards|AddLiquidity",
  "protocol": "protocol name",
  "description": "what to do (max 500 chars)",
  "reasoning": "why this is a good move today (max 500 chars)",
  "suggestedAmountSol": 0.1
}}

Rules:
- Task must match the allowed task types from difficulty level
- Amount should be reasonable for their portfolio
- Reasoning should be educational — explain WHY not just WHAT
- Be specific about which protocol and what action
- Keep it friendly and encouraging!"""

    try:
        response = claudeClient.messages.create(
            model='claude-haiku-4-5-20251001',
            max_tokens=512,
            messages=[{'role': 'user', 'content': prompt}],
        )

        responseText = response.content[0].text.strip()

        # strip markdown code fences if claude wraps the json
        if responseText.startswith('```'):
            responseText = responseText.strip('`').strip()
            if responseText.startswith('json'):
                responseText = responseText[4:].strip()

        import json
        taskData = json.loads(responseText)

        # validate required fields
        if not all(k in taskData for k in ['taskType', 'protocol', 'description', 'reasoning']):
            log.warning('claude response missing required fields')
            return generate_fallback_task()

        if taskData['taskType'] not in TASK_TYPE_MAP:
            log.warning(f'claude returned invalid task type: {taskData["taskType"]}')
            return generate_fallback_task()

        return taskData

    except Exception as exc:
        log.error(f'claude API call failed: {exc}')
        return generate_fallback_task()


def generate_fallback_task() -> dict:
    """Fallback task when Claude is unavailable."""
    return {
        'taskType': 'Stake',
        'protocol': 'Marinade',
        'description': 'Stake some SOL for mSOL on Marinade Finance to earn liquid staking rewards. Simple, safe, and a great way to put idle SOL to work!',
        'reasoning': 'Liquid staking is one of the safest DeFi strategies on Solana. mSOL earns ~6.8% APY while staying liquid — you can use it across DeFi or unstake anytime.',
        'suggestedAmountSol': 0.5,
    }


def build_create_daily_task_ix(
    configPda: Pubkey,
    profilePda: Pubkey,
    taskPda: Pubkey,
    userPubkey: Pubkey,
    crankPubkey: Pubkey,
    dayTimestamp: int,
    taskTypeIndex: int,
    protocol: str,
    description: str,
    reasoning: str,
    suggestedAmount: int,
    suggestedMint: Pubkey | None,
) -> Instruction:
    """Build the create_daily_task instruction."""
    discriminator = hashlib.sha256(b'global:create_daily_task').digest()[:8]

    ixData = bytearray(discriminator)

    # day_timestamp: i64
    ixData += struct.pack('<q', dayTimestamp)

    # task_type: enum u8
    ixData += struct.pack('B', taskTypeIndex)

    # protocol: String
    protocolBytes = protocol.encode('utf-8')[:32]
    ixData += struct.pack('<I', len(protocolBytes))
    ixData += protocolBytes

    # description: String
    descBytes = description.encode('utf-8')[:512]
    ixData += struct.pack('<I', len(descBytes))
    ixData += descBytes

    # reasoning: String
    reasonBytes = reasoning.encode('utf-8')[:512]
    ixData += struct.pack('<I', len(reasonBytes))
    ixData += reasonBytes

    # suggested_amount: u64 (in lamports)
    ixData += struct.pack('<Q', suggestedAmount)

    # suggested_mint: Option<Pubkey>
    if suggestedMint is not None:
        ixData += b'\x01'
        ixData += bytes(suggestedMint)
    else:
        ixData += b'\x00'

    accounts = [
        AccountMeta(pubkey=configPda, is_signer=False, is_writable=False),
        AccountMeta(pubkey=profilePda, is_signer=False, is_writable=True),
        AccountMeta(pubkey=taskPda, is_signer=False, is_writable=True),
        AccountMeta(pubkey=userPubkey, is_signer=False, is_writable=False),
        AccountMeta(pubkey=crankPubkey, is_signer=True, is_writable=True),
        AccountMeta(pubkey=SYSTEM_PROGRAM_ID, is_signer=False, is_writable=False),
    ]

    return Instruction(
        program_id=PROGRAM_PUBKEY,
        accounts=accounts,
        data=bytes(ixData),
    )


def generate_tasks():
    """Generate daily tasks for all active users. the main loop!"""
    log.info('starting daily task generation...')

    profiles = fetch_all_user_profiles()
    if not profiles:
        log.info('no registered users found')
        return

    log.info(f'found {len(profiles)} user(s)')

    allYields = get_cached_yields()
    dayTimestamp = get_today_timestamp()
    crankKeypair = get_crank_keypair()
    configPda = derive_config_pda()

    successCount = 0
    for profile in profiles:
        userPubkey = profile['user']
        userStr = str(userPubkey)[:8]

        try:
            # check if task already exists for today
            taskPda = derive_task_pda(userPubkey, dayTimestamp)
            existingTask = rpcClient.get_account_info(taskPda, Confirmed)
            if existingTask.value is not None:
                log.info(f'  {userStr}... already has today\'s task, skipping')
                continue

            # fetch wallet data
            walletSnapshot = fetch_wallet_snapshot(str(userPubkey))
            walletSummary = walletSnapshot.summary() if walletSnapshot else 'SOL: 0'

            # determine difficulty
            riskName = RISK_TOLERANCE_NAMES.get(profile['riskTolerance'], 'Moderate')
            preferredNames = get_preferred_protocol_names(profile['preferredProtocols'])

            userLevel = calculate_user_level(
                totalTasks=profile['totalTasksReceived'],
                tasksAccepted=profile['tasksAccepted'],
                currentStreak=profile['currentStreak'],
                bestStreak=profile['bestStreak'],
            )
            diffProfile = get_difficulty_profile(userLevel, riskName)

            # filter yields
            filteredYields = filter_by_risk(allYields, riskName.lower())
            if preferredNames:
                filteredYields = filter_by_protocols(filteredYields, preferredNames)
            yieldSummary = format_yields_for_prompt(filteredYields)
            difficultySummary = format_difficulty_for_prompt(diffProfile)

            # ask claude for a task
            log.info(f'  {userStr}... generating task (level {userLevel}, {riskName})')
            taskData = generate_task_with_claude(
                walletSummary=walletSummary,
                yieldSummary=yieldSummary,
                difficultySummary=difficultySummary,
                riskTolerance=riskName,
                preferredProtocols=preferredNames,
                currentStreak=profile['currentStreak'],
            )

            if taskData is None:
                log.warning(f'  {userStr}... failed to generate task')
                continue

            # convert suggested amount to lamports (cap at 10 SOL for safety)
            rawAmount = taskData.get('suggestedAmountSol', 0.1)
            cappedAmount = min(max(float(rawAmount), 0.001), 10.0)
            suggestedLamports = int(cappedAmount * 1_000_000_000)

            # build and send on-chain tx
            profilePda = derive_profile_pda(userPubkey)
            taskTypeIndex = TASK_TYPE_MAP.get(taskData['taskType'], 0)

            ix = build_create_daily_task_ix(
                configPda=configPda,
                profilePda=profilePda,
                taskPda=taskPda,
                userPubkey=userPubkey,
                crankPubkey=crankKeypair.pubkey(),
                dayTimestamp=dayTimestamp,
                taskTypeIndex=taskTypeIndex,
                protocol=taskData['protocol'],
                description=taskData['description'],
                reasoning=taskData['reasoning'],
                suggestedAmount=suggestedLamports,
                suggestedMint=None,
            )

            recentBlockhash = rpcClient.get_latest_blockhash(Confirmed).value.blockhash
            txn = Transaction.new_signed_with_payer(
                [ix],
                payer=crankKeypair.pubkey(),
                signing_keypairs=[crankKeypair],
                recent_blockhash=recentBlockhash,
            )

            txResult = rpcClient.send_transaction(txn)
            log.info(f'  {userStr}... task created! tx={txResult.value}')
            successCount += 1

        except Exception as exc:
            log.error(f'  {userStr}... failed: {exc}')
            continue

    log.info(f'done! {successCount}/{len(profiles)} tasks created')


def run_scheduler():
    """Run the task generator on daily cron schedule."""
    scheduler = BlockingScheduler()

    # parse cron expression
    cronParts = TASK_GENERATION_CRON.split()
    scheduler.add_job(
        generate_tasks,
        'cron',
        minute=cronParts[0],
        hour=cronParts[1],
        day=cronParts[2],
        month=cronParts[3],
        day_of_week=cronParts[4],
    )

    log.info(f'task generator scheduled: {TASK_GENERATION_CRON}')
    log.info('running initial generation now...')
    generate_tasks()

    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        log.info('task generator stopped')


if __name__ == '__main__':
    run_scheduler()
