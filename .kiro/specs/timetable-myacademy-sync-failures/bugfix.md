# Bugfix Requirements Document

## Introduction

The InsightU platform's timetable system has multiple critical failures affecting the MyAcademy sync functionality. Students are experiencing issues with manual upload prompts despite auto-sync capabilities, confusing credential forms, sync failures, engine errors on the timetable page, and a missing world clock on the dashboard. These issues prevent students from accessing their timetable data and create a poor user experience.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a student views the timetable sync section THEN the system displays a manual file upload option ("Sync My Attendance" button) even though the platform has MyAcademy scraping capability

1.2 WHEN a student opens the portal sync modal THEN the system displays the label "SRM Email ID" with placeholder "e.g. xyz@srmist.edu.in" but the backend scraper may expect a different format (the original bug report mentioned "SRM credentials" with example "ra24")

1.3 WHEN a student enters their SRM institutional email and password and submits the sync form THEN the sync fails and does not retrieve timetable data from MyAcademy

1.4 WHEN a student navigates to the timetable page after a failed sync THEN the system displays an "engine failure" error instead of showing the timetable or a helpful fallback message

1.5 WHEN a student views the main dashboard THEN the world clock component is not visible or not rendering properly

### Expected Behavior (Correct)

2.1 WHEN a student views the timetable sync section THEN the system SHALL automatically scrape timetable data from the student's MyAcademy account using their stored credentials OR prompt for credentials only if not previously provided

2.2 WHEN a student opens the portal sync modal THEN the system SHALL display clear and accurate credential field labels that match the expected input format for the MyAcademy scraper (institutional email format: xyz@srmist.edu.in)

2.3 WHEN a student enters valid SRM institutional email and password and submits the sync form THEN the system SHALL successfully authenticate with MyAcademy, scrape the timetable data, and store PersonalSlot records in the database

2.4 WHEN a student navigates to the timetable page THEN the system SHALL display the student's schedule if sync was successful, OR display a helpful fallback message with sync instructions if no timetable data exists

2.5 WHEN a student views the main dashboard THEN the system SHALL display a functional world clock showing Asia/Kolkata time

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a student has successfully synced their timetable in the past THEN the system SHALL CONTINUE TO display their daily schedule with correct day order, periods, subjects, rooms, and timing information

3.2 WHEN a student uploads a "My Attendance" PDF manually THEN the system SHALL CONTINUE TO process the PDF and extract PersonalSlot mappings correctly

3.3 WHEN the current time falls within a class period THEN the system SHALL CONTINUE TO mark that period as "Ongoing" with appropriate visual indicators

3.4 WHEN a date is marked as a holiday in the calendar THEN the system SHALL CONTINUE TO display the holiday message instead of a schedule

3.5 WHEN admin uploads unified timetable or calendar data THEN the system SHALL CONTINUE TO process and activate the new version correctly

3.6 WHEN a student's credentials are used for portal sync THEN the system SHALL CONTINUE TO discard credentials immediately after the Puppeteer session closes and never store them in the database
