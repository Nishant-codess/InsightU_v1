# SRM Portal Python Scraper

A more reliable Python-based scraper for the SRM Academia portal using Selenium.

## Setup

1. **Install Python dependencies:**
   ```bash
   cd backend/python_scraper
   pip3 install -r requirements.txt
   ```

2. **Install Chrome/Chromium:**
   - macOS: `brew install chromium`
   - Linux: `sudo apt-get install chromium-browser`
   - Windows: Download from https://www.google.com/chrome/

3. **Install ChromeDriver:**
   ```bash
   # macOS
   brew install chromedriver
   
   # Or use webdriver-manager (automatic)
   pip3 install webdriver-manager
   ```

## Usage

### Direct Python Usage:
```bash
python3 srm_portal_scraper.py "your@srmist.edu.in" "your_password"
```

### From Node.js:
```typescript
import { execPythonScraper } from './pythonScraperWrapper';

const result = await execPythonScraper(email, password);
if (result.success) {
  const html = result.html;
  // Parse HTML...
}
```

## Output Format

### Success:
```json
{
  "success": true,
  "html": "<html>...</html>",
  "url": "https://academia.srmist.edu.in/..."
}
```

### Error:
```json
{
  "error": "Error message here"
}
```

## Error Codes

- **"Login form not found"** - Portal structure changed
- **"Invalid credentials"** - Wrong email/password
- **"Session expired"** - Authentication failed during navigation
- **"Timetable page not found"** - User doesn't have access
- **"Timeout"** - Portal is slow or down

## Security

- Credentials are passed as command-line arguments (never logged)
- Browser runs in headless mode
- All data is in-memory only
- Browser is closed after each run

## Advantages over Puppeteer

1. **More reliable selectors** - Tries multiple selector strategies
2. **Better error handling** - Specific error messages
3. **Easier debugging** - Can run with headless=False to see browser
4. **More stable** - Selenium is more mature for web scraping
