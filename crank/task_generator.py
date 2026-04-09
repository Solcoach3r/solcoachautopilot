"""
Task Generator

Runs daily at 8:00 UTC. For each active user:
1. Fetches wallet balances
2. Gets current yield opportunities
3. Sends context to Claude API
4. Claude generates a personalized task
5. Calls create_daily_task on-chain

This is where the AI magic happens!
"""

from config import ANTHROPIC_API_KEY, RPC_URL


def generate_tasks():
    """Generate daily tasks for all active users."""
    # TODO: fetch users, get wallet data, call Claude, create tasks
    print(f'[task-gen] generating tasks via {RPC_URL}')
    print(f'[task-gen] claude api key: {"configured" if ANTHROPIC_API_KEY else "missing"}')


if __name__ == '__main__':
    generate_tasks()
