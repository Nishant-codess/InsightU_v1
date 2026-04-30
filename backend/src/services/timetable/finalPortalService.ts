/**
 * FINAL Production-Ready Portal Service
 * Uses existing Python scraper with Redis caching
 */

import redisClient from '../../config/redis';
import { spawn } from 'child_process';
import path from 'path';

interface PortalResult {
  success: boolean;
  data?: any;
  html?: string;
  error?: string;
}

export class FinalPortalService {
  private readonly CACHE_TTL = 3600 * 4; // 4 hours

  /**
   * Fetch all data (timetable, attendance, marks) using Python scraper
   */
  async fetchAllData(email: string, password: string): Promise<PortalResult> {
    // Check cache first
    const cacheKey = `srm_data:${email}`;
    
    try {
      if (redisClient) {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          console.log('✅ Using cached data for', email);
          return {
            success: true,
            data: JSON.parse(cached),
          };
        }
      }
    } catch (error) {
      console.log('⚠️  Redis cache miss, fetching fresh data');
    }

    // Fetch fresh data using Python scraper
    return new Promise((resolve) => {
      const scriptPath = path.join(__dirname, '../../../python_scraper/srm_full_scraper.py');
      const pythonProcess = spawn('python', [scriptPath, email, password]);
      
      let stdout = '';
      let stderr = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      pythonProcess.on('close', async (code) => {
        if (code !== 0) {
          console.error('❌ Python scraper failed:', stderr);
          resolve({
            success: false,
            error: 'Failed to fetch data from portal',
          });
          return;
        }
        
        try {
          const result = JSON.parse(stdout);
          
          if (result.success) {
            // Cache the result
            try {
              if (redisClient) {
                await redisClient.setEx(
                  cacheKey,
                  this.CACHE_TTL,
                  JSON.stringify(result)
                );
                console.log('💾 Data cached for', email);
              }
            } catch (error) {
              console.log('⚠️  Could not cache data:', error);
            }
            
            resolve({
              success: true,
              data: result,
            });
          } else {
            resolve({
              success: false,
              error: result.error || 'Unknown error',
            });
          }
        } catch (error) {
          console.error('❌ Failed to parse Python output:', error);
          resolve({
            success: false,
            error: 'Failed to parse portal response',
          });
        }
      });
      
      pythonProcess.on('error', (error) => {
        console.error('❌ Failed to start Python:', error);
        resolve({
          success: false,
          error: 'Python scraper not available',
        });
      });
    });
  }

  /**
   * Get timetable only
   */
  async getTimetable(email: string, password: string): Promise<PortalResult> {
    const result = await this.fetchAllData(email, password);
    
    if (result.success && result.data) {
      return {
        success: true,
        data: result.data.timetable || [],
      };
    }
    
    return result;
  }

  /**
   * Get attendance only
   */
  async getAttendance(email: string, password: string): Promise<PortalResult> {
    const result = await this.fetchAllData(email, password);
    
    if (result.success && result.data) {
      return {
        success: true,
        data: result.data.attendance || [],
      };
    }
    
    return result;
  }

  /**
   * Get marks only
   */
  async getMarks(email: string, password: string): Promise<PortalResult> {
    const result = await this.fetchAllData(email, password);
    
    if (result.success && result.data) {
      return {
        success: true,
        data: result.data.marks || [],
      };
    }
    
    return result;
  }

  /**
   * Clear cached data
   */
  async clearCache(email: string): Promise<void> {
    try {
      if (redisClient) {
        await redisClient.del(`srm_data:${email}`);
        console.log('🗑️  Cleared cache for', email);
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }
}

// Export singleton
export const portalService = new FinalPortalService();
