### Requirement: Streak display
The dashboard SHALL prominently display the user's current streak length and longest streak.

#### Scenario: Active streak shown
- **WHEN** user has a streak of 12 days
- **THEN** dashboard displays "12 dagen" as the current streak

#### Scenario: No active streak
- **WHEN** user's streak is 0
- **THEN** dashboard displays streak as 0

### Requirement: Freeze inventory display
The dashboard SHALL display the number of freezes currently available and the progress toward earning the next freeze.

#### Scenario: Freezes and progress shown
- **WHEN** user has 1 freeze and earn-counter is at 3
- **THEN** dashboard displays "1/2 freezes" and "volgende freeze in: 2 dagen"

#### Scenario: Maximum freezes reached
- **WHEN** user has 2 freezes
- **THEN** dashboard displays "2/2 freezes" and indicates maximum reached

### Requirement: Weekly step overview
The dashboard SHALL display a week view showing each day's step count and whether the goal was met, a freeze was used, or the goal was missed.

#### Scenario: Week with mixed results
- **WHEN** the current week has days with goal met, a freeze day, and a missed day
- **THEN** each day shows step count with visual indicator (check for met, snowflake for freeze, X for missed)

#### Scenario: Navigate to previous weeks
- **WHEN** user clicks "previous week"
- **THEN** dashboard shows the prior week's step data

### Requirement: Unauthenticated state
The dashboard SHALL show a "Connect Garmin" button when no user session exists.

#### Scenario: No session
- **WHEN** user visits the dashboard without a valid session
- **THEN** dashboard shows a login prompt with "Connect Garmin" button

### Requirement: Logout
The dashboard SHALL provide a way to disconnect/logout.

#### Scenario: User logs out
- **WHEN** user clicks "Logout"
- **THEN** session is cleared and dashboard returns to unauthenticated state
