import axios from 'axios';

async function main() {
    try {
        console.log("Logging into server...");
        // 1. Login
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'nr0070@srmist.edu.in',
            password: 'Nishant@1'
        });
        const token = loginRes.data.tokens.accessToken;
        console.log("Logged in! Token acquired. Querying the schedule endpoint...");

        // 2. Fetch schedule
        const schedRes = await axios.get('http://localhost:5000/api/student/today-schedule', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("SUCCESS");
        console.log(JSON.stringify(schedRes.data, null, 2));

    } catch (e: any) {
        console.log("ERROR ===");
        console.log("Status:", e.response?.status);
        console.log("Response Body:", typeof e.response?.data);
        console.log(e.response?.data);
        if (typeof e.response?.data === 'string') {
           console.log("String payload matched HTML router error fallback.");
        }
    }
}
main();
