const fs = require('fs');
const path = require('path');

async function testUpload() {
  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
  const fileContent = 'Dummy PDF content';
  const payload = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test.pdf"\r\nContent-Type: application/pdf\r\n\r\n${fileContent}\r\n--${boundary}--\r\n`;

  try {
    const res = await fetch('http://localhost:3000/api/sessions/upload', {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        // We will pass the teacher ID manually to bypass auth for this test or generate a fake JWT
      },
      body: payload
    });
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Body:', text);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}
testUpload();
