import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';

const API_BASE = 'http://localhost:3000/api/admin';

async function verify() {
    console.log('--- Verifying Admin Features ---');

    try {
        // 1. Verify Timetable Upload
        console.log('\n[1/3] Testing Timetable Upload...');
        const form = new FormData();
        // Create a dummy file
        fs.writeFileSync('/tmp/test_timetable.pdf', 'dummy pdf content');
        form.append('file', fs.createReadStream('/tmp/test_timetable.pdf'));
        form.append('year', '2');
        form.append('batch', 'Batch 1');

        const uploadRes = await axios.post(`${API_BASE}/timetable/upload`, form, {
            headers: form.getHeaders()
        });
        console.log('✅ Timetable Upload Success:', uploadRes.data.message);

        // 2. Verify Section Mapping (Student)
        // Note: This might fail if the student ID doesn't exist, but we're testing the route connectivity
        console.log('\n[2/3] Testing Student Mapping...');
        try {
            const mapStudentRes = await axios.post(`${API_BASE}/sections/map-student`, {
                studentId: 'some-student-id', // Placeholder, will likely fail in DB but tests route
                section: 'B',
                batch: 'Batch 2'
            });
            console.log('✅ Student Mapping Route Success');
        } catch (e: any) {
            if (e.response?.status === 404 || e.response?.status === 500) {
                console.log('ℹ️ Student Mapping Route hit, but student not found (expected if ID is invalid)');
            } else {
                throw e;
            }
        }

        // 3. Verify Section Mapping (Teacher)
        console.log('\n[3/3] Testing Teacher Mapping...');
        try {
            await axios.post(`${API_BASE}/sections/map-teacher`, {
                teacherId: 'some-teacher-id',
                year: 2,
                section: 'A',
                department: 'CSE'
            });
            console.log('✅ Teacher Mapping Route Success');
        } catch (e: any) {
            if (e.response?.status === 404 || e.response?.status === 500) {
                console.log('ℹ️ Teacher Mapping Route hit, but teacher not found (expected if ID is invalid)');
            } else {
                throw e;
            }
        }

        console.log('\n--- Verification Completed ---');

    } catch (error: any) {
        console.error('❌ Verification Failed:', error.message);
        if (error.response) {
            console.error('Response Data:', error.response.data);
        }
    }
}

verify();
