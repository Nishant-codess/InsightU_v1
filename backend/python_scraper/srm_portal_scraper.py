#!/usr/bin/env python3
"""
SRM Academia Portal Scraper
Logs into SRM portal and fetches timetable data
"""

import sys
import json
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.common.exceptions import TimeoutException, NoSuchElementException

class SRMPortalScraper:
    def __init__(self, headless=True):
        """Initialize the scraper with Chrome options"""
        self.options = Options()
        if headless:
            self.options.add_argument('--headless')
        self.options.add_argument('--no-sandbox')
        self.options.add_argument('--disable-dev-shm-usage')
        self.options.add_argument('--disable-gpu')
        self.options.add_argument('--window-size=1920,1080')
        self.options.add_argument('--disable-blink-features=AutomationControlled')
        self.options.add_experimental_option("excludeSwitches", ["enable-automation"])
        self.options.add_experimental_option('useAutomationExtension', False)
        
        self.driver = None
        self.wait = None
        
    def start(self):
        """Start the browser"""
        try:
            self.driver = webdriver.Chrome(options=self.options)
            self.wait = WebDriverWait(self.driver, 20)
            return True
        except Exception as e:
            return {"error": f"Failed to start browser: {str(e)}"}
    
    def login(self, email, password):
        """Login to SRM Academia portal"""
        try:
            # Navigate to portal
            self.driver.get('https://academia.srmist.edu.in/')
            time.sleep(2)
            
            # Try multiple possible selectors for username field
            username_selectors = [
                'input[name="username"]',
                'input[type="email"]',
                'input#login_id',
                'input[placeholder*="mail"]',
                'input[placeholder*="User"]'
            ]
            
            username_field = None
            for selector in username_selectors:
                try:
                    username_field = self.wait.until(
                        EC.presence_of_element_located((By.CSS_SELECTOR, selector))
                    )
                    break
                except TimeoutException:
                    continue
            
            if not username_field:
                return {"error": "Login form not found. Portal structure may have changed."}
            
            # Enter email
            username_field.clear()
            username_field.send_keys(email)
            time.sleep(0.5)
            
            # Check if there's a "Next" button (two-step login)
            try:
                next_button = self.driver.find_element(By.CSS_SELECTOR, 'button#nextbtn, button[type="submit"]#nextbtn')
                next_button.click()
                time.sleep(1.5)
            except NoSuchElementException:
                pass
            
            # Try multiple possible selectors for password field
            password_selectors = [
                'input[name="password"]',
                'input[type="password"]',
                'input#password'
            ]
            
            password_field = None
            for selector in password_selectors:
                try:
                    password_field = self.wait.until(
                        EC.presence_of_element_located((By.CSS_SELECTOR, selector))
                    )
                    break
                except TimeoutException:
                    continue
            
            if not password_field:
                return {"error": "Password field not found. Portal structure may have changed."}
            
            # Enter password
            password_field.clear()
            password_field.send_keys(password)
            time.sleep(0.5)
            
            # Find and click submit button
            submit_selectors = [
                'button[type="submit"]',
                'input[type="submit"]',
                'button#signin_submit',
                'button.btn-primary'
            ]
            
            submit_button = None
            for selector in submit_selectors:
                try:
                    submit_button = self.driver.find_element(By.CSS_SELECTOR, selector)
                    break
                except NoSuchElementException:
                    continue
            
            if not submit_button:
                return {"error": "Submit button not found. Portal structure may have changed."}
            
            submit_button.click()
            time.sleep(3)
            
            # Check if login was successful
            current_url = self.driver.current_url
            page_text = self.driver.find_element(By.TAG_NAME, 'body').text.lower()
            
            if 'login' in current_url or 'signin' in current_url:
                if 'invalid' in page_text or 'incorrect' in page_text or 'wrong' in page_text:
                    return {"error": "Invalid credentials. Please check your email and password."}
                return {"error": "Login failed. Please try again."}
            
            return {"success": True, "message": "Login successful"}
            
        except TimeoutException:
            return {"error": "Timeout waiting for page elements. Portal may be slow or down."}
        except Exception as e:
            return {"error": f"Login error: {str(e)}"}
    
    def fetch_timetable(self):
        """Navigate to timetable page and fetch HTML"""
        try:
            # Navigate to timetable page
            timetable_url = 'https://academia.srmist.edu.in/srm_university/academia-academic-services/page/My_Time_Table'
            self.driver.get(timetable_url)
            time.sleep(3)
            
            # Check if we're still authenticated
            current_url = self.driver.current_url
            if 'login' in current_url or 'signin' in current_url:
                return {"error": "Session expired. Please try again."}
            
            # Get page HTML
            html_content = self.driver.page_source
            
            # Check if timetable content exists
            if 'My_Time_Table' not in html_content and 'timetable' not in html_content.lower():
                return {"error": "Timetable page not found. You may not have access."}
            
            return {
                "success": True,
                "html": html_content,
                "url": current_url
            }
            
        except Exception as e:
            return {"error": f"Failed to fetch timetable: {str(e)}"}
    
    def close(self):
        """Close the browser"""
        if self.driver:
            try:
                self.driver.quit()
            except:
                pass

def main():
    """Main function to run the scraper"""
    if len(sys.argv) != 3:
        print(json.dumps({"error": "Usage: python srm_portal_scraper.py <email> <password>"}))
        sys.exit(1)
    
    email = sys.argv[1]
    password = sys.argv[2]
    
    scraper = SRMPortalScraper(headless=True)
    
    try:
        # Start browser
        start_result = scraper.start()
        if isinstance(start_result, dict) and "error" in start_result:
            print(json.dumps(start_result))
            sys.exit(1)
        
        # Login
        login_result = scraper.login(email, password)
        if "error" in login_result:
            print(json.dumps(login_result))
            sys.exit(1)
        
        # Fetch timetable
        timetable_result = scraper.fetch_timetable()
        print(json.dumps(timetable_result))
        
        if "error" in timetable_result:
            sys.exit(1)
        
    except Exception as e:
        print(json.dumps({"error": f"Unexpected error: {str(e)}"}))
        sys.exit(1)
    finally:
        scraper.close()

if __name__ == "__main__":
    main()
