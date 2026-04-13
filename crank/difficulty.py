"""
Difficulty Scaler — SolCoachAutopilot

Adjusts task complexity based on user profile:
streak, total tasks, acceptance rate, risk tolerance.

newbies get simple staking tasks, veterans get LP strategies!
"""

import logging
from dataclasses import dataclass

log = logging.getLogger('difficulty')

# task types ordered by complexity
TASK_COMPLEXITY = {
    'Stake': 1,
    'ClaimRewards': 1,
    'Unstake': 2,
    'Swap': 2,
    'Rebalance': 3,
    'AddLiquidity': 4,
}


@dataclass
class DifficultyProfile:
    level: int            # 1-5
    maxComplexity: int    # max task complexity allowed
    suggestedAmount: str  # percentage of portfolio to suggest
    taskTypes: list[str]  # allowed task types
    label: str


def calculate_user_level(
    totalTasks: int,
    tasksAccepted: int,
    currentStreak: int,
    bestStreak: int,
) -> int:
    """Calculate user level from 1 to 5 based on engagement history."""
    if totalTasks == 0:
        return 1

    acceptanceRate = tasksAccepted / totalTasks if totalTasks > 0 else 0

    # base score from total engagement
    engagementScore = min(totalTasks / 20, 1.0) * 2.0

    # streak bonus
    streakScore = min(currentStreak / 14, 1.0) * 1.5

    # acceptance rate bonus
    acceptanceScore = acceptanceRate * 1.5

    totalScore = engagementScore + streakScore + acceptanceScore

    if totalScore < 1.0:
        return 1
    elif totalScore < 2.0:
        return 2
    elif totalScore < 3.5:
        return 3
    elif totalScore < 4.5:
        return 4
    else:
        return 5


def get_difficulty_profile(
    level: int,
    riskTolerance: str,
) -> DifficultyProfile:
    """Get task difficulty constraints for a user level + risk combo."""
    profiles = {
        1: DifficultyProfile(
            level=1,
            maxComplexity=1,
            suggestedAmount='5-10%',
            taskTypes=['Stake', 'ClaimRewards'],
            label='Beginner',
        ),
        2: DifficultyProfile(
            level=2,
            maxComplexity=2,
            suggestedAmount='10-15%',
            taskTypes=['Stake', 'ClaimRewards', 'Unstake', 'Swap'],
            label='Learning',
        ),
        3: DifficultyProfile(
            level=3,
            maxComplexity=3,
            suggestedAmount='10-20%',
            taskTypes=['Stake', 'ClaimRewards', 'Unstake', 'Swap', 'Rebalance'],
            label='Intermediate',
        ),
        4: DifficultyProfile(
            level=4,
            maxComplexity=3,
            suggestedAmount='15-25%',
            taskTypes=['Stake', 'ClaimRewards', 'Unstake', 'Swap', 'Rebalance'],
            label='Advanced',
        ),
        5: DifficultyProfile(
            level=5,
            maxComplexity=4,
            suggestedAmount='15-30%',
            taskTypes=['Stake', 'ClaimRewards', 'Unstake', 'Swap', 'Rebalance', 'AddLiquidity'],
            label='Expert',
        ),
    }

    profile = profiles.get(min(max(level, 1), 5), profiles[1])

    # risk tolerance adjustments
    if riskTolerance == 'Conservative':
        profile.maxComplexity = min(profile.maxComplexity, 2)
        profile.suggestedAmount = '5-10%'
        profile.taskTypes = [
            t for t in profile.taskTypes
            if TASK_COMPLEXITY.get(t, 0) <= 2
        ]
    elif riskTolerance == 'Aggressive':
        profile.maxComplexity = min(profile.maxComplexity + 1, 4)

    return profile


def format_difficulty_for_prompt(profile: DifficultyProfile) -> str:
    """Format difficulty constraints for Claude prompt."""
    return (
        f'User level: {profile.level} ({profile.label})\n'
        f'Allowed task types: {", ".join(profile.taskTypes)}\n'
        f'Suggested amount: {profile.suggestedAmount} of portfolio\n'
        f'Max complexity: {profile.maxComplexity}/4'
    )
