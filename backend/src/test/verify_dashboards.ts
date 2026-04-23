import axios from 'axios';

// This script verifies the connectivity and response structure of the new dashboard APIs.
// To run: npx ts-node backend/src/test/verify_dashboards.ts

const API_BASE = 'http://localhost:3000/api';

async function verify() {
    console.log('--- Verifying Dashboard APIs ---');

    try {
        // 1. Admin Stats
        console.log('\n[1/4] Testing Admin Stats...');
        const adminRes = await axios.get(`${API_BASE}/admin/stats`);
        console.log('✅ Admin Stats Success:', adminRes.data);

        // Note: For Student, Teacher, and Parent, we need a valid JWT token.
        // Since we can't easily generate one here without a real user, 
        // we'll at least verify the routes are registered and return 401.
        
        const endpoints = [
            { name: 'Student Dashboard', url: `${API_BASE}/student/dashboard` },
            { name: 'Teacher Dashboard', url: `${API_BASE}/teacher/dashboard` },
            { name: 'Parent Dashboard', url: `${API_BASE}/parent/dashboard` }
        ];

        for (const endpoint of endpoints) {
            console.log(`\nTesting ${endpoint.name} (Authorization check)...`);
            try {
                await axios.get(endpoint.url);
            } catch (e: any) {
                if (e.response?.status === 401) {
                    console.log(`✅ ${endpoint.name} Route Protected (Expected 401)`);
                } else {
                    console.error(`❌ ${endpoint.name} failed with status:`, e.response?.status);
                }
            }
        }

        console.log('\n--- Verification Completed ---');

    } catch (error: any) {
        console.error('❌ Verification Failed:', error.message);
    }
}

verify();
