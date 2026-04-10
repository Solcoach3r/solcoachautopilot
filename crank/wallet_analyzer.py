"""
Wallet Analyzer — SolCoachAutopilot

Fetches wallet balances and token holdings via Helius enhanced API.
Used by the task generator to understand user portfolio before
generating personalized coaching tasks.

so we know what the user has before telling them what to do!
"""

import logging
from dataclasses import dataclass, field

import httpx
from solders.pubkey import Pubkey
from solana.rpc.api import Client
from solana.rpc.commitment import Confirmed

from config import RPC_URL, HELIUS_API_KEY, get_helius_rpc_url

log = logging.getLogger('wallet_analyzer')

rpcClient = Client(RPC_URL)

# known token mints on devnet (and mainnet equivalents)
KNOWN_TOKENS = {
    'So11111111111111111111111111111111111111112': {'symbol': 'SOL', 'decimals': 9},
    'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': {'symbol': 'mSOL', 'decimals': 9},
    'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn': {'symbol': 'jitoSOL', 'decimals': 9},
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': {'symbol': 'USDC', 'decimals': 6},
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': {'symbol': 'USDT', 'decimals': 6},
}


@dataclass
class TokenBalance:
    mint: str
    symbol: str
    amount: float
    uiAmount: float
    decimals: int


@dataclass
class WalletSnapshot:
    owner: str
    solBalance: float
    tokens: list[TokenBalance] = field(default_factory=list)
    totalEstimatedValue: float = 0.0

    def summary(self) -> str:
        """quick text summary for claude prompt"""
        lines = [f'SOL: {self.solBalance:.4f}']
        for tok in self.tokens:
            if tok.uiAmount > 0:
                lines.append(f'{tok.symbol}: {tok.uiAmount:.4f}')
        return ', '.join(lines)


def fetch_wallet_snapshot(walletPubkey: str) -> WalletSnapshot | None:
    """Fetch wallet SOL balance and token accounts."""
    try:
        pubkey = Pubkey.from_string(walletPubkey)

        # get sol balance
        solResp = rpcClient.get_balance(pubkey, Confirmed)
        solBalance = (solResp.value or 0) / 1_000_000_000

        # get token accounts
        tokens = fetch_token_balances(walletPubkey)

        snapshot = WalletSnapshot(
            owner=walletPubkey,
            solBalance=solBalance,
            tokens=tokens,
        )

        # rough estimate — just SOL value for now
        snapshot.totalEstimatedValue = solBalance

        return snapshot

    except Exception as exc:
        log.error(f'failed to fetch wallet {walletPubkey}: {exc}')
        return None


def fetch_token_balances(walletPubkey: str) -> list[TokenBalance]:
    """Fetch SPL token balances via Helius or standard RPC."""
    if HELIUS_API_KEY:
        return fetch_token_balances_helius(walletPubkey)
    return fetch_token_balances_rpc(walletPubkey)


def fetch_token_balances_helius(walletPubkey: str) -> list[TokenBalance]:
    """Fetch via Helius getAssetsByOwner for richer data."""
    try:
        resp = httpx.post(
            get_helius_rpc_url(),
            json={
                'jsonrpc': '2.0',
                'id': 'coach-wallet',
                'method': 'getAssetsByOwner',
                'params': {
                    'ownerAddress': walletPubkey,
                    'page': 1,
                    'limit': 50,
                    'displayOptions': {'showFungible': True},
                },
            },
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()

        balances = []
        items = data.get('result', {}).get('items', [])
        for item in items:
            if item.get('interface') != 'FungibleToken':
                continue
            tokenInfo = item.get('token_info', {})
            mintAddr = item.get('id', '')
            balance = int(tokenInfo.get('balance', 0))
            decimals = int(tokenInfo.get('decimals', 0))

            known = KNOWN_TOKENS.get(mintAddr, {})
            symbol = known.get('symbol', mintAddr[:6] + '...')

            if balance > 0:
                balances.append(TokenBalance(
                    mint=mintAddr,
                    symbol=symbol,
                    amount=balance,
                    uiAmount=balance / (10 ** decimals) if decimals > 0 else balance,
                    decimals=decimals,
                ))

        return balances

    except Exception as exc:
        log.warning(f'helius getAssetsByOwner failed, trying rpc: {exc}')
        return fetch_token_balances_rpc(walletPubkey)


def fetch_token_balances_rpc(walletPubkey: str) -> list[TokenBalance]:
    """Fallback: fetch via standard getTokenAccountsByOwner."""
    try:
        from solders.pubkey import Pubkey as SoldersPubkey
        from solana.rpc.types import TokenAccountOpts
        from spl.token.constants import TOKEN_PROGRAM_ID

        pubkey = SoldersPubkey.from_string(walletPubkey)
        resp = rpcClient.get_token_accounts_by_owner(
            pubkey,
            TokenAccountOpts(program_id=TOKEN_PROGRAM_ID),
            Confirmed,
        )

        balances = []
        for accInfo in (resp.value or []):
            parsed = accInfo.account.data.parsed
            if not parsed:
                continue
            info = parsed.get('info', {})
            mintAddr = info.get('mint', '')
            tokenAmount = info.get('tokenAmount', {})
            amount = int(tokenAmount.get('amount', 0))
            decimals = int(tokenAmount.get('decimals', 0))
            uiAmount = float(tokenAmount.get('uiAmount', 0))

            known = KNOWN_TOKENS.get(mintAddr, {})
            symbol = known.get('symbol', mintAddr[:6] + '...')

            if amount > 0:
                balances.append(TokenBalance(
                    mint=mintAddr,
                    symbol=symbol,
                    amount=amount,
                    uiAmount=uiAmount,
                    decimals=decimals,
                ))

        return balances

    except Exception as exc:
        log.error(f'rpc token fetch failed: {exc}')
        return []
