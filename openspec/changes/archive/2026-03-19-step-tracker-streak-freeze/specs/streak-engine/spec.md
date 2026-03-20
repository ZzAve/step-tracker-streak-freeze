## ADDED Requirements

### Requirement: Streak calculation
The system SHALL calculate the user's current streak as the number of consecutive days (including freeze days) where either the step goal was met or a freeze was applied. The default step goal is 10,000 steps.

#### Scenario: Consecutive days meeting goal
- **WHEN** user has met the 10,000 step goal for 7 consecutive days
- **THEN** current streak SHALL be 7

#### Scenario: Streak broken without freeze
- **WHEN** user misses the step goal and has 0 freezes available
- **THEN** current streak SHALL reset to 0

#### Scenario: Streak includes freeze days
- **WHEN** user has a 5-day streak, misses day 6 (freeze applied), then meets goal on day 7
- **THEN** current streak SHALL be 7

### Requirement: Earning streak freezes
The system SHALL award 1 streak freeze for every 5 days the user meets their step goal. The counter resets to 0 after earning a freeze and after a freeze is used.

#### Scenario: Earn freeze after 5 days
- **WHEN** user meets step goal for 5 consecutive counted days
- **THEN** user receives +1 freeze and the earn-counter resets to 0

#### Scenario: Counter resets after freeze used
- **WHEN** a freeze is applied on a missed day
- **THEN** the earn-counter resets to 0 and counting restarts from the next goal-met day

#### Scenario: Earning continues after reset
- **WHEN** user earns a freeze (counter resets to 0) and then meets the goal for 5 more days
- **THEN** user receives another +1 freeze

### Requirement: Maximum freeze cap
The system SHALL enforce a maximum of 2 streak freezes in the user's inventory at any time.

#### Scenario: At maximum freezes
- **WHEN** user has 2 freezes and would earn another (5 days met)
- **THEN** freeze count stays at 2 and the earn-counter resets to 0

### Requirement: Automatic freeze application
The system SHALL automatically apply a freeze when the user misses their step goal and has at least 1 freeze available.

#### Scenario: Auto-apply freeze on missed day
- **WHEN** user does not meet the 10,000 step goal and has ≥1 freeze
- **THEN** system applies 1 freeze, freeze count decreases by 1, streak continues, earn-counter resets to 0

#### Scenario: No freeze available on missed day
- **WHEN** user does not meet the 10,000 step goal and has 0 freezes
- **THEN** streak resets to 0, earn-counter resets to 0

### Requirement: Longest streak tracking
The system SHALL track the user's longest streak ever achieved.

#### Scenario: New longest streak
- **WHEN** current streak exceeds the stored longest streak
- **THEN** longest streak is updated to current streak value

#### Scenario: Streak breaks below record
- **WHEN** streak resets to 0
- **THEN** longest streak value SHALL remain unchanged
