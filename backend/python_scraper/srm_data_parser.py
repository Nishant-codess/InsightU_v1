#!/usr/bin/env python3
"""
SRM Academia Data Parser
Parses raw scraped table data into structured JSON
"""

import re

def parse_profile(tables):
    """Extract student profile from tables"""
    profile = {}
    for table in tables:
        for row in table:
            if len(row) < 2:
                continue
            for i, cell in enumerate(row):
                c = cell.strip()
                if c == 'Registration Number:' and i+1 < len(row):
                    profile['registrationNumber'] = row[i+1].strip()
                elif c == 'Name:' and i+1 < len(row):
                    profile['name'] = row[i+1].strip()
                elif c == 'Batch:' and i+1 < len(row):
                    profile['batch'] = row[i+1].strip()
                elif c == 'Mobile:' and i+1 < len(row):
                    profile['mobile'] = row[i+1].strip()
                elif c == 'Program:' and i+1 < len(row):
                    profile['program'] = row[i+1].strip()
                elif c == 'Department:' and i+1 < len(row):
                    profile['department'] = row[i+1].strip()
                elif c == 'Semester:' and i+1 < len(row):
                    profile['semester'] = row[i+1].strip()
                elif c == 'Specialization:' and i+1 < len(row):
                    profile['specialization'] = row[i+1].strip()
    return profile

def parse_timetable(tables):
    """Extract course/timetable data"""
    courses = []
    for table in tables:
        if not table:
            continue
        header_idx = None
        for i, row in enumerate(table):
            if 'Course Code' in row and 'Course Title' in row:
                header_idx = i
                break
        if header_idx is None:
            continue
        header = table[header_idx]
        for row in table[header_idx+1:]:
            if len(row) < 5:
                continue
            if not row[0].strip() or not row[0].strip()[0].isdigit():
                continue
            course = {}
            for j, col in enumerate(header):
                if j >= len(row):
                    continue
                col_c = col.strip()
                val = row[j].strip()
                if col_c == 'S.No': course['sno'] = val
                elif col_c == 'Course Code': course['courseCode'] = val
                elif col_c == 'Course Title': course['courseTitle'] = val
                elif col_c == 'Credit': course['credit'] = val
                elif col_c == 'Category': course['category'] = val
                elif col_c == 'Course Type': course['courseType'] = val
                elif col_c == 'Faculty Name': course['faculty'] = val
                elif col_c == 'Slot': course['slot'] = val
                elif col_c == 'Room No.': course['room'] = val
                elif col_c == 'Academic Year': course['academicYear'] = val
            if course.get('courseCode') and course.get('courseTitle'):
                courses.append(course)
    # Deduplicate by courseCode+slot
    seen, unique = set(), []
    for c in courses:
        key = c.get('courseCode','') + c.get('slot','')
        if key not in seen:
            seen.add(key)
            unique.append(c)
    return unique

def parse_attendance_and_marks(tables):
    """
    Extract attendance and internal marks from My_Attendance page.
    """
    attendance = []
    marks = []

    for table in tables:
        if not table:
            continue

        # --- Attendance table: has 'Hours Conducted' or 'Attn %' in header ---
        header_idx = None
        for i, row in enumerate(table):
            row_str = ' '.join(row).lower()
            if ('hours conducted' in row_str or 'attn %' in row_str) and 'course code' in row_str:
                header_idx = i
                break

        if header_idx is not None:
            header = table[header_idx]
            for row in table[header_idx+1:]:
                if len(row) < 5:
                    continue
                record = {}
                for j, col in enumerate(header):
                    if j >= len(row):
                        continue
                    col_c = col.strip().lower()
                    val = row[j].strip()
                    if 'course code' in col_c:
                        # Strip "Regular"/"Elective" suffix
                        record['courseCode'] = re.sub(r'(Regular|Elective|Mandatory|Optional).*', '', val).strip()
                    elif 'course title' in col_c:
                        record['courseTitle'] = val
                    elif 'faculty' in col_c:
                        record['faculty'] = val
                    elif col_c == 'slot':
                        record['slot'] = val
                    elif 'room' in col_c:
                        record['room'] = val
                    elif 'hours conducted' in col_c or 'conducted' in col_c:
                        record['hoursConducted'] = val
                    elif 'hours absent' in col_c or 'absent' in col_c:
                        record['hoursAbsent'] = val
                    elif 'attn' in col_c or '%' in col_c:
                        record['attendancePercent'] = val
                if record.get('courseCode') and record.get('attendancePercent'):
                    attendance.append(record)
            continue

        # --- Marks table: has 'Test Performance' in header ---
        header_idx = None
        for i, row in enumerate(table):
            row_str = ' '.join(row).lower()
            if 'test performance' in row_str and 'course code' in row_str:
                header_idx = i
                break

        if header_idx is not None:
            header = table[header_idx]
            for row in table[header_idx+1:]:
                if len(row) < 2:
                    continue
                # Only process rows that start with a valid course code (e.g. 21CSE215J)
                course_code = row[0].strip() if row else ''
                if not re.match(r'^\d{2}[A-Z]{3}\d{3}[A-Z]$', course_code):
                    continue
                record = {
                    'courseCode': course_code,
                    'courseType': row[1].strip() if len(row) > 1 else '',
                    'rawPerformance': row[2].strip() if len(row) > 2 else '',
                    'tests': parse_test_performance(row[2].strip() if len(row) > 2 else '')
                }
                if record['courseCode']:
                    marks.append(record)

    return attendance, marks

def parse_test_performance(raw):
    """
    Parse test performance string where numbers are concatenated.
    e.g. 'FT-I/15.006.50FT-II/15.008.00' means:
         FT-I: max=15.00, scored=6.50
         FT-II: max=15.00, scored=8.00
    Max marks are always whole numbers (5, 10, 15, 30, 40) followed by .00
    """
    tests = []
    # Pattern: TestName/MaxInt.00ScoredFloat
    pattern = r'([A-Z]+[-\s][IVX]+(?:[-][IVX]+)?|R\s+[IVI]+|FML-[IVX]+)\s*/\s*(\d+)\.00(\d+\.\d+|\d+)'
    matches = re.findall(pattern, raw)
    for match in matches:
        name, max_int, scored_str = match
        try:
            tests.append({
                'name': name.strip(),
                'maxMarks': float(max_int),
                'scored': float(scored_str)
            })
        except:
            pass
    return tests

def parse_all(scraped_data):
    """Parse all scraped data into structured format"""
    result = {
        "profile": {},
        "timetable": [],
        "attendance": [],
        "marks": []
    }

    pages = scraped_data.get("pages", {})

    # Timetable page -> profile + timetable
    if "timetable" in pages:
        tables = pages["timetable"].get("tables", [])
        result["profile"] = parse_profile(tables)
        result["timetable"] = parse_timetable(tables)

    # Attendance page -> profile (fallback) + attendance + marks
    if "attendance" in pages:
        tables = pages["attendance"].get("tables", [])
        if not result["profile"]:
            result["profile"] = parse_profile(tables)
        att, mrk = parse_attendance_and_marks(tables)
        result["attendance"] = att
        result["marks"] = mrk

    return result
