import { spawn } from 'child_process';
import path from 'path';
import { PortalAuthError } from './portalFetcher';

interface PythonScraperResult {
  success?: boolean;
  html?: string;
  url?: string;
  error?: string;
}

/**
 * Execute the Python scraper to fetch timetable HTML from SRM portal
 * 
 * This is a more reliable alternative to the Puppeteer-based scraper.
 * Uses Selenium with multiple selector strategies.
 * 
 * @param loginId - SRM email ID
 * @param password - SRM password
 * @returns Promise with HTML content or error
 */
export async function execPythonScraper(
  loginId: string,
  password: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '../../../python_scraper/srm_portal_scraper.py');
    
    // Spawn Python process
    const pythonProcess = spawn('python3', [scriptPath, loginId, password]);
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        // Parse error from stdout
        try {
          const result: PythonScraperResult = JSON.parse(stdout);
          if (result.error) {
            // Map error to appropriate PortalAuthError
            if (result.error.includes('Invalid credentials') || result.error.includes('incorrect')) {
              reject(new PortalAuthError('INVALID_CREDENTIALS', result.error));
            } else if (result.error.includes('Session expired')) {
              reject(new PortalAuthError('SESSION_TIMEOUT', result.error));
            } else {
              reject(new PortalAuthError('PORTAL_UNREACHABLE', result.error));
            }
            return;
          }
        } catch {
          // If can't parse JSON, use stderr
          reject(new PortalAuthError(
            'PORTAL_UNREACHABLE',
            stderr || 'Python scraper failed with unknown error'
          ));
          return;
        }
      }
      
      // Parse success result
      try {
        const result: PythonScraperResult = JSON.parse(stdout);
        if (result.success && result.html) {
          resolve(result.html);
        } else if (result.error) {
          reject(new PortalAuthError('PORTAL_UNREACHABLE', result.error));
        } else {
          reject(new PortalAuthError('PORTAL_UNREACHABLE', 'Invalid response from scraper'));
        }
      } catch (err) {
        reject(new PortalAuthError(
          'PORTAL_UNREACHABLE',
          `Failed to parse scraper output: ${err}`
        ));
      }
    });
    
    pythonProcess.on('error', (err) => {
      reject(new PortalAuthError(
        'PORTAL_UNREACHABLE',
        `Failed to start Python scraper: ${err.message}. Make sure Python 3 and dependencies are installed.`
      ));
    });
  });
}

/**
 * Check if Python scraper is available
 */
export async function isPythonScraperAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const pythonProcess = spawn('python3', ['--version']);
    
    pythonProcess.on('close', (code) => {
      resolve(code === 0);
    });
    
    pythonProcess.on('error', () => {
      resolve(false);
    });
  });
}
