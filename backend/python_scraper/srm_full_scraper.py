#!/usr/bin/env python3
"""
SRM Academia Full Data Scraper
Fetches: profile, timetable, attendance, marks
"""

import sys
import json
import time
import os
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from bs4 import BeautifulSoup

BRAVE_PATH = r"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
CHROMEDRIVER_PATH = os.path.join(
    os.environ.get('USERPROFILE', ''),
    'chromedriver147', 'chromedriver-win64', 'chromedriver.exe'
)

class SRMFullScraper:
    def __init__(self, headless=True):
        self.options = Options()
        if headless:
            self.options.add_argument('--headless=new')
        self.options.add_argument('--no-sandbox')
        self.options.add_argument('--disable-dev-shm-usage')
        self.options.add_argument('--disable-gpu')
        self.options.add_argument('--window-size=1920,1080')
        self.options.add_argument('--disable-blink-features=AutomationControlled')
        self.options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36')
        self.options.add_argument('--ignore-certificate-errors')
        self.options.add_argument('--ignore-ssl-errors')
        self.options.add_argument('--allow-insecure-localhost')
        self.options.add_argument('--disable-web-security')
        self.options.add_argument('--disable-extensions')
        self.options.add_argument('--disable-popup-blocking')
        self.options.add_argument('--disable-notifications')
        self.options.add_experimental_option("excludeSwitches", ["enable-automation"])
        self.options.add_experimental_option('useAutomationExtension', False)
        self.options.binary_location = BRAVE_PATH
        self.driver = None
        self.wait = None

    def start(self):
        try:
            service = Service(CHROMEDRIVER_PATH)
            self.driver = webdriver.Chrome(service=service, options=self.options)
            self.wait = WebDriverWait(self.driver, 30)
            return True
        except Exception as e:
            return {"error": str(e)}

    def login(self, email, password):
        try:
            self.driver.get('https://academia.srmist.edu.in/')
            time.sleep(4)

            # Login form is inside an iframe
            iframes = self.driver.find_elements(By.TAG_NAME, 'iframe')
            switched = False
            for iframe in iframes:
                try:
                    self.driver.switch_to.frame(iframe)
                    inputs = self.driver.find_elements(By.ID, 'login_id')
                    if inputs:
                        switched = True
                        break
                    self.driver.switch_to.default_content()
                except:
                    self.driver.switch_to.default_content()

            if not switched:
                return {"error": "Login iframe not found"}

            # Enter email in login_id field
            email_field = self.wait.until(EC.presence_of_element_located((By.ID, 'login_id')))
            email_field.clear()
            email_field.send_keys(email)
            time.sleep(0.5)

            # Click Next button
            try:
                next_btn = self.driver.find_element(By.ID, 'nextbtn')
                next_btn.click()
                time.sleep(2)
            except NoSuchElementException:
                pass

            # Enter password
            pwd_field = self.wait.until(EC.presence_of_element_located((By.ID, 'password')))
            pwd_field.clear()
            pwd_field.send_keys(password)
            time.sleep(0.5)

            # Click signin button via JavaScript (handles hidden/overlay issues)
            try:
                signin_btn = self.driver.find_element(By.ID, 'signin_submit')
                self.driver.execute_script("arguments[0].click();", signin_btn)
            except NoSuchElementException:
                # Fallback: Enter key on password field
                from selenium.webdriver.common.keys import Keys
                pwd_field.send_keys(Keys.RETURN)

            time.sleep(5)
            self.driver.switch_to.default_content()

            # Handle Zoho intermediate pages
            self._handle_blockers()
            
            # Wait for actual portal to load
            time.sleep(3)
            current_url = self.driver.current_url
            
            # If still on login/accounts page, try navigating directly
            if 'accounts' in current_url or 'login' in current_url.lower():
                self.driver.get('https://academia.srmist.edu.in/srm_university/academia-academic-services/page/My_Time_Table')
                time.sleep(4)
                self._handle_blockers()
                current_url = self.driver.current_url

            if 'login' in current_url.lower() and 'academia.srmist.edu.in' not in current_url:
                return {"error": "Login failed - still on login page"}

            return {"success": True, "url": current_url}

        except Exception as e:
            self.driver.switch_to.default_content()
            return {"error": f"Login error: {str(e)}"}

    def _handle_blockers(self):
        """Handle Zoho intermediate pages (block-sessions, announcements)"""
        for _ in range(5):
            url = self.driver.current_url
            if 'block-sessions' in url or 'announcement' in url or 'sessions-reminder' in url:
                try:
                    # Use JavaScript click to bypass overlay
                    btn = self.driver.find_element(By.ID, 'continue_button')
                    self.driver.execute_script("arguments[0].click();", btn)
                    time.sleep(3)
                    continue
                except NoSuchElementException:
                    pass
                # Try any button via JS
                try:
                    buttons = self.driver.find_elements(By.TAG_NAME, 'button')
                    visible = [b for b in buttons if b.is_displayed()]
                    if visible:
                        self.driver.execute_script("arguments[0].click();", visible[-1])
                        time.sleep(3)
                        continue
                except:
                    pass
            break

    def _wait_for_content(self, timeout=20):
        """Wait for page content to load - handles SPA hash navigation"""
        time.sleep(5)  # Increased wait for JS to start
        try:
            WebDriverWait(self.driver, timeout).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, 
                    'table, .zc-table, [class*="table"], .report-table, .zc-report-table'))
            )
        except TimeoutException:
            pass
        time.sleep(5)  # Increased wait for full render

    def _get_full_html(self):
        """Get HTML from main page and all iframes"""
        htmls = [self.driver.page_source]
        iframes = self.driver.find_elements(By.TAG_NAME, 'iframe')
        for iframe in iframes:
            try:
                self.driver.switch_to.frame(iframe)
                htmls.append(self.driver.page_source)
                self.driver.switch_to.default_content()
            except:
                self.driver.switch_to.default_content()
        return '\n'.join(htmls)

    def _parse_tables(self, html):
        """Extract all tables from HTML"""
        soup = BeautifulSoup(html, 'html.parser')
        result = []
        for table in soup.find_all('table'):
            rows = []
            for tr in table.find_all('tr'):
                row = [td.get_text(strip=True) for td in tr.find_all(['td', 'th'])]
                if any(row):
                    rows.append(row)
            if rows:
                result.append(rows)
        return result

    def _parse_text_content(self, html):
        """Get all visible text content"""
        soup = BeautifulSoup(html, 'html.parser')
        # Remove scripts and styles
        for tag in soup(['script', 'style', 'meta', 'link']):
            tag.decompose()
        return soup.get_text(separator='\n', strip=True)

    def fetch_page(self, url):
        """Fetch a page and return parsed data"""
        self.driver.switch_to.default_content()
        self._handle_blockers()
        self.driver.get(url)
        self._wait_for_content()

        final_url = self.driver.current_url
        html = self._get_full_html()
        tables = self._parse_tables(html)
        text = self._parse_text_content(html)

        # DEBUG: Print what we got
        print(f"DEBUG: URL={final_url}", file=sys.stderr)
        print(f"DEBUG: HTML length={len(html)}", file=sys.stderr)
        print(f"DEBUG: Tables found={len(tables)}", file=sys.stderr)
        print(f"DEBUG: Text preview={text[:500]}", file=sys.stderr)

        return {
            "url": final_url,
            "tables": tables,
            "text_preview": text[:3000],
            "html_length": len(html)
        }

    def fetch_all(self, email, password):
        result = {"success": False, "email": email}

        login_res = self.login(email, password)
        if "error" in login_res:
            result["error"] = login_res["error"]
            return result

        result["login_url"] = login_res["url"]

        pages = {
            "timetable":  "https://academia.srmist.edu.in/#Page:My_Time_Table_2023_24",
            "attendance": "https://academia.srmist.edu.in/#Page:My_Attendance",
        }

        result["pages"] = {}
        for name, url in pages.items():
            try:
                result["pages"][name] = self.fetch_page(url)
            except Exception as e:
                result["pages"][name] = {"error": str(e)}

        result["success"] = True
        return result

    def close(self):
        if self.driver:
            try:
                self.driver.quit()
            except:
                pass


def main():
    if len(sys.argv) != 3:
        print(json.dumps({"error": "Usage: python srm_full_scraper.py <email> <password>"}))
        sys.exit(1)

    scraper = SRMFullScraper(headless=True)  # Headless mode - no browser window
    try:
        start = scraper.start()
        if isinstance(start, dict) and "error" in start:
            print(json.dumps(start))
            sys.exit(1)

        data = scraper.fetch_all(sys.argv[1], sys.argv[2])
        
        # Parse the raw data into structured format
        import sys as _sys
        _sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from srm_data_parser import parse_all
        parsed = parse_all(data)
        
        # Return both raw and parsed
        output = {
            "success": data["success"],
            "email": data["email"],
            "profile": parsed["profile"],
            "timetable": parsed["timetable"],
            "attendance": parsed["attendance"],
            "marks": parsed["marks"],
        }
        if "error" in data:
            output["error"] = data["error"]
        
        print(json.dumps(output, ensure_ascii=False, indent=2))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
    finally:
        scraper.close()


if __name__ == "__main__":
    main()
