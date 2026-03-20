## MODIFIED Requirements

### Requirement: Widget toont streak informatie
De Connect IQ widget SHALL de huidige streak-telling prominent tonen op het scherm, samen met een shoe icon. De step progress arc SHALL een pen width van minimaal 4px hebben voor duidelijke zichtbaarheid op MIP displays.

#### Scenario: Streak data beschikbaar
- **WHEN** de widget streak data heeft opgehaald
- **THEN** toont het scherm de streak-telling (groot getal), het shoe icon bovenaan, en een step progress arc met pen width 4

#### Scenario: Step progress arc zichtbaarheid
- **WHEN** de widget rendert op een MIP display
- **THEN** is de oranje step progress arc duidelijk zichtbaar met een dikte die vergelijkbaar is met native Garmin widgets

### Requirement: Widget toont weekly status row
De widget SHALL een weekly status row tonen onderaan het scherm met voor elke dag een checkmark (hit), snowflake (freeze), of dag-letter (pending/not_met). Checkmarks SHALL een grootte van minimaal 7px hebben met pen width 3 voor goede leesbaarheid.

#### Scenario: Dag met behaald doel
- **WHEN** een dag in de week de status "hit" heeft
- **THEN** toont de widget een groen vinkje met grootte 7-8px en pen width 3

#### Scenario: Dag zonder data (pending/not_met)
- **WHEN** een dag de status "pending" of "not_met" heeft
- **THEN** toont de widget de dag-letter in `COLOR_LT_GRAY` voor voldoende contrast op MIP displays
