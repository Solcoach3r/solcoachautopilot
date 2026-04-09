"""
Task Resolver

Runs daily at 8:00 UTC (24h after task generation).
Checks accepted tasks from yesterday:
1. Did the user actually execute the task?
2. Calculate P&L
3. Call resolve_task on-chain
"""

from config import RPC_URL


def resolve_tasks():
    """Resolve yesterday's accepted tasks with actual P&L."""
    # TODO: fetch accepted tasks, check wallet changes, resolve
    print(f'[resolver] checking yesterday tasks on {RPC_URL}')


if __name__ == '__main__':
    resolve_tasks()
