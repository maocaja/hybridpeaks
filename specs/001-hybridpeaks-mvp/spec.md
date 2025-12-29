# Feature Specification: HybridPeaks MVP Baseline

**Feature ID**: 001-hybridpeaks-mvp  
**Version**: 1.0  
**Last Updated**: 2025-12-28  
**Status**: Draft

---

## Overview

### Problem Statement

Hybrid athletes who combine strength and endurance training lack a specialized platform that understands the unique challenges of managing both domains simultaneously. Existing platforms like TrainingPeaks focus primarily on endurance sports, while strength training apps ignore cardiovascular fitness. Athletes and coaches need a unified system that:

- Plans and tracks training across both strength and endurance modalities
- Uses validated metrics specific to each domain (%1RM for strength, FTP and heart rate zones for endurance)
- Manages total training load to prevent overtraining or interference effects
- Provides intelligent analysis of weekly execution and adherence

Without such a platform, hybrid athletes must manually coordinate multiple apps, leading to fragmented data, missed interference patterns, and suboptimal programming decisions.

### User Goals

**For Coaches:**
- Design weekly training programs that balance strength and endurance adaptations
- Monitor athlete execution and adherence across both domains
- Receive AI-powered insights about training patterns, inconsistencies, and needed adjustments
- Communicate programming intent and make data-driven adjustments

**For Athletes:**
- See what training they need to do today without navigating complex menus
- Log workout execution quickly during or immediately after training sessions
- Understand their weekly training load and progress across both modalities
- Receive contextual guidance when training patterns suggest adjustments
- Execute training reliably even without internet connectivity

### Success Criteria

1. **Daily Execution Efficiency**: Athletes can view today's training and start logging a workout in under 10 seconds from app launch
2. **Logging Speed**: Athletes complete a full workout log (strength or endurance session) in under 2 minutes on average
3. **Mobile Usability**: 90% of athlete interactions occur on mobile devices, with all core functions accessible on phones
4. **Coach Programming Time**: Coaches can create a complete weekly training plan (6-8 sessions) for an athlete in under 15 minutes
5. **AI Utility**: 70% of athletes and coaches find weekly AI summaries helpful for making training adjustments
6. **Offline Reliability**: Core training functions (viewing today's plan, logging workouts) work without internet connectivity
7. **User Retention**: Athletes log at least 3 training sessions per week for 4 consecutive weeks (indicating consistent platform adoption)
8. **Cross-Modal Visibility**: Coaches can assess combined training load across strength and endurance in a single view
9. **Adherence Tracking**: The platform surfaces weekly adherence rate (planned vs. executed) within 5 seconds
10. **AI Transparency**: Every AI recommendation includes an explanation that 80% of users rate as "clear and understandable"

---

## User Scenarios

### Primary User Flows

**Scenario 1: Coach Creates Weekly Training Plan**

1. Coach logs into the platform and selects an athlete
2. Coach views the current training week template (Monday-Sunday)
3. For each training day, coach adds sessions (strength, endurance, or both)
4. For strength sessions, coach defines:
   - Exercise selection with sets, reps, and intensity (%1RM or RPE)
   - Rest periods and tempo if relevant
   - Session focus (e.g., "Lower Body Power")
5. For endurance sessions, coach defines:
   - Modality (run, bike, row, swim)
   - Duration or distance
   - Intensity zones (based on FTP, heart rate zones, or pace)
   - Session focus (e.g., "Zone 2 Aerobic Base")
6. Coach saves the weekly plan
7. Athlete receives notification that the new plan is available

**Scenario 2: Athlete Views Today's Training (Mobile-First)**

1. Athlete opens the app
2. App immediately displays "Today" view with scheduled sessions
3. For each session, athlete sees:
   - Session type (strength/endurance) and focus
   - Key parameters (exercises + sets/reps for strength, duration/zones for endurance)
   - Estimated time to complete
4. Athlete taps "Start Workout" on a session to begin logging

**Scenario 3: Athlete Logs Strength Workout**

1. Athlete taps "Start Workout" on a strength session
2. App displays exercises in order with prescribed sets, reps, and load (%1RM)
3. For each set, athlete inputs:
   - Actual weight used
   - Actual reps completed
   - Optional: RPE (Rate of Perceived Exertion)
4. App automatically calculates whether athlete met, exceeded, or missed prescription
5. After final set, athlete marks workout complete
6. App prompts for optional overall session notes and perceived difficulty
7. Workout is saved and syncs when connectivity is available

**Scenario 4: Athlete Logs Endurance Workout**

1. Athlete taps "Start Workout" on an endurance session
2. App displays prescribed duration, intensity zones, and modality
3. Athlete can:
   - Manually input completed duration, distance, and average heart rate/power
   - Or connect to wearable device to auto-import data
4. Athlete inputs perceived exertion and optional notes
5. App compares actual execution to prescription
6. Workout is saved and syncs when connectivity is available

**Scenario 5: Weekly AI Review Summary (End of Week)**

1. At the end of each training week (Sunday evening), the AI assistant generates a summary
2. Summary includes:
   - Adherence rate (percentage of planned sessions completed)
   - Combined training load (strength volume + endurance duration/TSS)
   - Perceived fatigue trends based on athlete RPE inputs
   - Patterns: "3 of 4 strength sessions logged RPE 9+, suggesting insufficient recovery"
   - Suggestions: "Consider reducing intensity in next week's lower body sessions or adding a rest day"
3. Coach and athlete both receive the summary
4. Coach can accept, modify, or ignore AI suggestions when planning next week

**Scenario 6: Coach Reviews Athlete Progress**

1. Coach opens athlete profile
2. Coach views weekly summary including:
   - Planned vs. executed sessions
   - Total strength volume (sets × reps × load)
   - Total endurance volume (time in zone, TSS, or distance)
   - Athlete-reported RPE trends
3. Coach reviews AI-generated insights
4. Coach makes programming adjustments for the upcoming week based on data

### Edge Cases

1. **Athlete Modifies Workout Mid-Session**: Athlete starts logging, then needs to substitute an exercise or adjust prescription (e.g., injury, equipment unavailable)
   - System allows editing prescribed exercises or skipping without penalty
   - Log captures actual work performed, flags as "modified"

2. **Missed Training Days**: Athlete skips planned sessions
   - AI summary notes missed sessions and impact on weekly volume
   - Coach can decide whether to roll forward missed work or adjust plan

3. **Athlete Trains Ahead or Off-Schedule**: Athlete completes a workout on a different day than planned
   - System allows logging against any planned session within the current week
   - AI summary accounts for actual timing when analyzing recovery patterns

4. **Multiple Sessions Per Day**: Athlete performs both strength and endurance in one day (double session)
   - Each session is logged separately
   - Weekly summary aggregates total load accurately

5. **Coach Updates Plan After Athlete Has Started Week**: Coach modifies upcoming sessions while athlete is mid-week
   - Athlete sees updated plan for future days
   - Already-logged sessions are not affected
   - System notifies athlete of changes

6. **First Week Using Platform (No Historical Data)**: New athlete with no prior training logs
   - AI summary acknowledges insufficient data for trend analysis
   - Provides baseline observations only (e.g., adherence rate, total volume)
   - Full AI insights activate after 2-3 weeks of consistent logging

### Error Scenarios

1. **No Internet Connectivity During Logging**:
   - App allows full workout logging offline
   - Data is stored locally on device
   - System syncs automatically when connectivity is restored
   - User sees "sync pending" indicator

2. **Invalid Input Data**: Athlete enters impossible values (e.g., 500kg squat, negative reps)
   - System flags obviously incorrect data with warning
   - Allows user to confirm if intentional or correct the error
   - Does not block saving; captures data as entered

3. **AI Assistant Fails to Generate Summary**: Backend service error prevents AI summary generation
   - User sees message: "Weekly summary is being generated and will appear shortly"
   - System retries automatically
   - Does not block access to other features

4. **Coach Assigns Conflicting Sessions**: Coach schedules overlapping or excessively high-volume sessions
   - AI assistant flags potential conflicts in planning phase (e.g., "High-intensity strength and HIIT endurance on same day may impact recovery")
   - Warning is advisory; coach can proceed if intentional

5. **User Loses Device/Unsynced Data**: Athlete logs workouts offline, then loses device before syncing
   - Data is lost (acceptable MVP limitation)
   - Post-MVP: Implement periodic background sync to minimize risk

---

## Functional Requirements

### Must Have (MVP)

**Planning & Program Design**

- **REQ-1**: Coach can create weekly training plans for individual athletes
  - Acceptance: Coach can define 7-day training templates with multiple sessions per day

- **REQ-2**: Coach can define strength sessions with exercises, sets, reps, and intensity prescriptions
  - Acceptance: Each exercise supports load prescription as %1RM or RPE, with set/rep schemes

- **REQ-3**: Coach can define endurance sessions with modality, duration, and intensity zones
  - Acceptance: Sessions support duration/distance targets and zone prescription (HR zones, FTP %, or pace zones)

- **REQ-4**: System stores validated training metrics (%1RM, FTP, heart rate zones) per athlete
  - Acceptance: Coaches can input and update athlete-specific benchmark values that inform prescriptions

**Daily Execution (Mobile-First)**

- **REQ-5**: Athlete sees today's scheduled training sessions immediately upon app launch
  - Acceptance: Default app view is "Today" showing all sessions planned for current date

- **REQ-6**: Athlete can start and log a strength workout with per-set data entry
  - Acceptance: For each prescribed set, athlete records actual weight and reps; app calculates completion vs. prescription

- **REQ-7**: Athlete can start and log an endurance workout with duration and intensity data
  - Acceptance: Athlete records completed duration, distance, and average heart rate or power; app compares to prescription

- **REQ-8**: Athlete can add optional RPE and session notes to any logged workout
  - Acceptance: Free-text notes field and RPE scale (1-10) available for every logged session

- **REQ-9**: All workout logging functions work offline
  - Acceptance: Athlete can view today's plan, log workouts, and save data without internet connectivity; data syncs automatically when online

**Progress Visualization**

- **REQ-10**: Athlete can view weekly training summary showing planned vs. executed sessions
  - Acceptance: Weekly view displays all sessions with status indicators (completed, missed, modified)

- **REQ-11**: Athlete and coach can view combined training load across strength and endurance
  - Acceptance: Weekly summary shows total strength volume (sets × reps × load) and endurance volume (time or TSS)

- **REQ-12**: System displays adherence rate for the current and past weeks
  - Acceptance: Percentage of planned sessions successfully completed is visible in weekly summary

**AI Assistant**

- **REQ-13**: AI assistant generates a weekly review summary at the end of each training week
  - Acceptance: Summary includes adherence rate, training load, perceived fatigue trends, and identified patterns

- **REQ-14**: Every AI recommendation includes a clear, user-readable explanation
  - Acceptance: Each suggestion is accompanied by reasoning (e.g., "Suggested because RPE was consistently high, indicating insufficient recovery")

- **REQ-15**: AI recommendations are optional and never block user workflows
  - Acceptance: Users can view, ignore, or dismiss AI suggestions without affecting core functionality

- **REQ-16**: AI assistant disclaims that it does not provide medical advice
  - Acceptance: All AI-generated content includes disclaimer: "This is training guidance, not medical advice. Consult a healthcare professional for injury or health concerns."

- **REQ-17**: AI assistant respects user control and allows overrides
  - Acceptance: Athletes and coaches can proceed with any training decision regardless of AI suggestions

**User Management**

- **REQ-18**: Platform supports two user types: coaches and athletes
  - Acceptance: Users register and authenticate as either coach or athlete role

- **REQ-19**: Coaches can manage multiple athletes
  - Acceptance: Coach dashboard lists all assigned athletes with quick access to each athlete's plan and progress

- **REQ-20**: Athletes can view only their own training plans and logs
  - Acceptance: Athlete view is scoped to their own data; no access to other athletes' information

### Should Have (Post-MVP)

- **REQ-21**: Wearable device integration for automatic endurance workout data import (Garmin, Wahoo, Apple Watch)
- **REQ-22**: Historical trend charts for key metrics (strength PRs, endurance fitness markers)
- **REQ-23**: Template library for common hybrid training programs (e.g., "12-Week Half Marathon + Strength")
- **REQ-24**: Athlete can communicate with coach via in-app messaging
- **REQ-25**: Coach can duplicate and modify previous weekly plans to accelerate programming

### Could Have (Future)

- **REQ-26**: Multi-week periodization planning with mesocycle and macrocycle views
- **REQ-27**: Video exercise library with technique demonstrations
- **REQ-28**: Advanced AI features: auto-adjusting training loads based on recovery signals
- **REQ-29**: Team management for coaches working with multiple athletes in group programs
- **REQ-30**: Export training data for external analysis

---

## Key Entities

**Athlete**
- Description: End user who executes training programs
- Key attributes: Name, benchmark metrics (1RM values, FTP, HR zones), current training plan, workout history, perceived fatigue ratings
- Relationships: Assigned to one coach; owns multiple workout logs and weekly plans

**Coach**
- Description: User who designs and manages training programs for athletes
- Key attributes: Name, athlete roster, programming preferences
- Relationships: Manages multiple athletes; creates training plans and reviews athlete progress

**Training Plan**
- Description: Weekly template of scheduled training sessions for an athlete
- Key attributes: Week start date, daily sessions, status (active, completed, archived)
- Relationships: Belongs to one athlete; created by one coach; contains multiple sessions

**Training Session**
- Description: A single workout (strength or endurance) scheduled for a specific date
- Key attributes: Date, type (strength/endurance), modality, prescribed parameters (exercises, sets, reps, loads, zones, duration), completion status
- Relationships: Part of one training plan; may have one workout log if executed

**Workout Log**
- Description: Record of an athlete's actual execution of a training session
- Key attributes: Date completed, session type, actual work performed (sets/reps/loads for strength, duration/distance/HR for endurance), RPE, notes, completion timestamp
- Relationships: Linked to one training session; belongs to one athlete

**Exercise**
- Description: A strength training movement or drill
- Key attributes: Name, category (squat, hinge, press, pull, accessory), typical rep ranges
- Relationships: Used in strength sessions; may have historical performance data per athlete

**Benchmark Metric**
- Description: Validated performance marker used for intensity prescription
- Key attributes: Metric type (%1RM, FTP, HR zones, pace zones), value, date established
- Relationships: Belongs to one athlete; informs training session prescriptions

**AI Weekly Summary**
- Description: AI-generated analysis of an athlete's training week
- Key attributes: Week end date, adherence rate, total volume (strength + endurance), perceived fatigue analysis, identified patterns, suggestions, explanation text
- Relationships: Linked to one athlete and one weekly training plan; visible to both athlete and coach

---

## Non-Functional Requirements

### Performance

- App launches to "Today" view in under 2 seconds on mobile devices with moderate internet connectivity
- Workout logging interface responds to user input within 200 milliseconds
- Weekly summary generation completes within 10 seconds of week end
- Offline data syncs within 5 seconds of connectivity restoration for typical weekly workout volume (6-8 sessions)

### Usability

- Mobile-first design: All core user flows optimized for phones (iOS and Android)
- Input minimization: Pre-fill or infer every possible field; require manual input only for data that cannot be defaulted
- Default to today: App always opens to current day's training; historical and future views require intentional navigation
- Progressive disclosure: Advanced features hidden until needed; beginner-friendly default interface
- Accessible design: Minimum WCAG 2.1 Level AA compliance for color contrast, text sizing, and touch targets

### Reliability

- Core training functions (view today, log workout) available 99.5% of the time
- Offline mode supports viewing current week's plan and logging workouts without data loss
- Data syncing is automatic and transparent; users never manually trigger sync
- AI assistant failures do not impact core training or logging functionality
- System gracefully handles invalid input data with warnings, not blocking errors

### Security

- User authentication required for all access (standard session-based or OAuth2)
- Athletes can access only their own training data
- Coaches can access only data for athletes they manage
- Passwords stored using industry-standard hashing (e.g., bcrypt, Argon2)
- All data transmission encrypted in transit (HTTPS/TLS)
- User data retained according to privacy policy; users can request data export or deletion

### Data Integrity

- Workout logs are immutable once saved (edits create new version, preserving history)
- Training plan changes preserve historical versions; athlete sees only current plan
- AI summaries stored with timestamp; past summaries remain accessible for historical review
- System prevents data loss during offline logging via local persistence and automatic sync

---

## Assumptions

1. **Athlete Training Literacy**: Athletes have basic understanding of training terminology (%1RM, RPE, heart rate zones). The platform provides brief explanations but is not an educational resource for complete beginners.

2. **Coach-Athlete Relationship Pre-Exists**: Athletes using the platform are already working with a coach or are experienced enough to self-coach. The platform does not match athletes to coaches.

3. **Single Athlete-Coach Assignment**: Each athlete works with one primary coach. Multi-coach scenarios (e.g., strength coach + endurance coach) are out of scope for MVP.

4. **Weekly Planning Cycle**: Training is planned in one-week increments. Multi-week periodization is deferred to post-MVP.

5. **Standard Training Metrics**: The platform uses widely accepted metrics (%1RM for strength, FTP and HR zones for endurance). Niche or proprietary metrics are not supported in MVP.

6. **Mobile Device Availability**: Athletes have access to a smartphone (iOS or Android) for workout logging. Desktop access is secondary.

7. **Internet Connectivity**: While core functions work offline, users have regular internet access (at least daily) for syncing and receiving updates.

8. **AI as Advisor, Not Authority**: Users understand AI recommendations are suggestions, not mandates. Athletes and coaches retain final decision-making authority.

9. **No Real-Time Biometric Monitoring**: The platform logs completed workout data; it does not provide live tracking or guidance during sessions (e.g., no real-time heart rate alerts).

10. **English Language Only (MVP)**: Initial release supports English; internationalization is post-MVP.

---

## Dependencies

**External Dependencies:**
- Authentication service (if using OAuth2 with third-party providers like Google, Apple)
- AI/ML service for generating weekly summaries (may be internal or external API)

**Internal Dependencies:**
- Athlete benchmark metrics must be established before coaches can prescribe intensity-based training
- Athletes must have an assigned coach to receive training plans
- Weekly AI summaries require at least one week of logged workout data to generate meaningful insights

**Optional Dependencies (Post-MVP):**
- Wearable device APIs (Garmin Connect, Wahoo, Apple HealthKit) for automatic endurance data import

---

## Out of Scope

**Explicitly NOT Included in MVP:**

1. **Social Features**: No public profiles, activity feeds, follower systems, or social sharing
2. **Nutrition Tracking**: No meal logging, macro tracking, or calorie counting
3. **Multi-Week Periodization**: No mesocycle or macrocycle planning views (weekly planning only)
4. **Video Exercise Library**: No instructional videos or form demonstrations
5. **In-App Messaging**: No direct coach-athlete chat (communication happens outside platform)
6. **Wearable Device Integration**: No automatic data import from Garmin, Wahoo, Apple Watch, etc. (manual entry only)
7. **Payment Processing**: No subscription billing or payment handling in MVP (assumed handled externally or deferred)
8. **Team/Group Management**: Coaches manage athletes individually; no group programs or team views
9. **Competition/Event Management**: No race registration, event calendars, or competition tracking
10. **Advanced Analytics**: No trend forecasting, training stress balance, or predictive modeling beyond weekly AI summaries
11. **Customizable AI Personality**: AI assistant has a single, standardized tone and style
12. **Multi-Language Support**: English only for MVP

---

## Open Questions

This specification has been designed with reasonable defaults for all critical decisions. No clarifications are required to proceed to planning phase.

**Documented Assumptions (not blockers):**
- **Athlete Benchmark Updates**: Assumed that coaches manually update athlete 1RM and FTP values periodically. Auto-calculation from workout logs is a post-MVP enhancement.
- **AI Summary Timing**: Weekly summaries generate Sunday evening (end of training week). Configurable timing is deferred to post-MVP.
- **Offline Storage Duration**: Offline data persists on device until successfully synced. If user reinstalls app before syncing, unsynced data is lost (acceptable MVP limitation).

---

## Alignment with HybridPeaks Constitution

This specification adheres to the principles established in the HybridPeaks Constitution v1.0.0:

**Product Principles:**
- **Clarity Over Features**: MVP focuses on essential planning, execution, and review functions; advanced features deferred
- **Execution-First Mindset**: Specification emphasizes shipping working software with clear success criteria
- **Progressive Disclosure**: Advanced features hidden; default interface serves beginners to intermediate athletes
- **Data in Service of Performance**: All metrics are actionable; AI explains why metrics matter
- **Respect for Training Time**: "Today" view loads in <2 seconds; logging completes in <2 minutes

**Domain Principles:**
- **Strength and Endurance Are Complementary**: Weekly summary aggregates load across both domains
- **Progressive Overload Across Modalities**: Platform tracks volume and intensity for strength and endurance
- **Individual Response Variability**: RPE and perceived fatigue inputs allow for personalization
- **Context-Dependent Programming**: AI considers life context (perceived fatigue, adherence) in suggestions

**UX Principles:**
- **Mobile-First, Always**: All core flows optimized for mobile devices
- **Default to Today**: App opens to today's training
- **Input Minimization**: Pre-fill fields; minimal manual data entry
- **Offline-First Reliability**: Core functions work without connectivity

**Engineering Principles:**
- **Simplicity as a Feature**: Specification avoids premature complexity; clear scope boundaries
- **Evolvability Over Premature Optimization**: Post-MVP and future features clearly delineated
- **Explicit Over Implicit**: Functional requirements are testable and unambiguous
- **Fail Visibly**: Error scenarios defined with clear user feedback

**AI Principles:**
- **Explainability is Mandatory**: Every AI recommendation includes reasoning
- **User Control Always Retained**: AI suggestions are optional and never block workflows
- **No Black Box Training Plans**: AI explains patterns and suggests adjustments, but does not auto-generate plans

**Non-Goals Alignment:**
- Social features, nutrition micro-management, competition management, and coaching marketplace explicitly excluded

---

## Validation Checklist

- [x] No implementation details (languages, frameworks, APIs)
- [x] All requirements are testable and unambiguous
- [x] Success criteria are measurable and technology-agnostic
- [x] User scenarios cover primary flows
- [x] Edge cases identified
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Assumptions and dependencies documented
- [x] Aligned with HybridPeaks Constitution v1.0.0

