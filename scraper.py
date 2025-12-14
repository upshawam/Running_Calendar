import json
import os
import argparse
from playwright.sync_api import sync_playwright

def auto_login(page, username, password):
    """Automatically log in to Runalyze using provided credentials."""
    print(f"Navigating to login page...")
    page.goto("https://runalyze.com/login", wait_until="domcontentloaded")

    # Wait for the page to load and check if we're already logged in
    page.wait_for_load_state("networkidle", timeout=30000)
    print("Page loaded, checking login form...")

    # Check if we're already logged in (redirected to dashboard)
    if "login" not in page.url and ("dashboard" in page.url or "athlete" in page.url):
        print("Already logged in, skipping login")
        return

    # Try multiple selector strategies for username field
    username_selectors = [
        "input[name='username']",
        "input[name='email']",
        "input[type='email']",
        "input[placeholder*='email']",
        "input[placeholder*='Email']",
        "#username",
        "#email",
        ".username",
        ".email"
    ]

    username_field = None
    for selector in username_selectors:
        try:
            page.wait_for_selector(selector, timeout=5000)
            username_field = page.query_selector(selector)
            if username_field:
                print(f"Found username field with selector: {selector}")
                break
        except:
            continue

    if not username_field:
        print("Available input fields:")
        inputs = page.query_selector_all("input")
        for i, inp in enumerate(inputs):
            print(f"  {i}: {inp.get_attribute('name')} - {inp.get_attribute('type')} - {inp.get_attribute('placeholder')}")

        raise Exception("Could not find username/email input field")

    # Fill username
    username_field.fill(username)
    print("Filled username")

    # Try multiple selector strategies for password field
    password_selectors = [
        "input[name='password']",
        "input[type='password']",
        "#password",
        ".password"
    ]

    password_field = None
    for selector in password_selectors:
        try:
            password_field = page.query_selector(selector)
            if password_field:
                print(f"Found password field with selector: {selector}")
                break
        except:
            continue

    if not password_field:
        raise Exception("Could not find password input field")

    # Fill password
    password_field.fill(password)
    print("Filled password")

    # Try multiple selector strategies for submit button
    submit_selectors = [
        "button[type='submit']",
        "input[type='submit']",
        "button:has-text('Login')",
        "button:has-text('Sign in')",
        "button:has-text('Log in')",
        ".btn-primary",
        "#login-submit"
    ]

    submit_button = None
    for selector in submit_selectors:
        try:
            submit_button = page.query_selector(selector)
            if submit_button:
                print(f"Found submit button with selector: {selector}")
                break
        except:
            continue

    if not submit_button:
        print("Available buttons:")
        buttons = page.query_selector_all("button, input[type='submit']")
        for i, btn in enumerate(buttons):
            print(f"  {i}: {btn.get_attribute('type')} - {btn.text_content()}")

        raise Exception("Could not find submit button")

    # Click submit and wait for navigation
    submit_button.click()
    print("Clicked submit button")

    # Wait for successful login (either redirect or login success indicator)
    try:
        page.wait_for_url(lambda url: "login" not in url, timeout=30000)
        print("Login successful - redirected away from login page")
    except:
        # Check if we're still on login page (login failed)
        if "login" in page.url:
            print("Still on login page - login may have failed")
            # Check for error messages
            error_selectors = [".alert-danger", ".error", ".login-error", "[class*='error']"]
            for selector in error_selectors:
                error_elem = page.query_selector(selector)
                if error_elem:
                    print(f"Login error: {error_elem.text_content()}")
                    break
            raise Exception("Login failed - still on login page")
        else:
            print("Login appears successful")

def parse_training_paces_html(html_content):
    """Parse training paces from the HTML content of the training paces panel."""
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html_content, 'html.parser')
    
    paces = {}
    pace_rows = soup.find_all('tr')
    for row in pace_rows:
        cells = row.find_all('td')
        if len(cells) >= 2:
            pace_type = cells[0].get_text(strip=True)
            
            # Handle different table formats
            if len(cells) >= 3:
                # Format: Pace Type | Pace Range | % vVO2max
                pace_range = cells[1].get_text(strip=True)
                vo2_percent = cells[2].get_text(strip=True)
                pace_data = {
                    "pace_range": pace_range,
                    "vo2_percent": vo2_percent
                }
            else:
                # Fallback: just pace value
                pace_value = cells[1].get_text(strip=True)
                pace_data = {
                    "pace_range": pace_value,
                    "vo2_percent": ""
                }
            
            if pace_type:
                paces[pace_type] = pace_data
    return paces

def fetch_training_paces(username, password, output_dir="data", debug=False):
    """Fetch training paces from Runalyze and save to JSON."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not debug)
        page = browser.new_page()
        
        try:
            auto_login(page, username, password)
            page.goto("https://runalyze.com/athlete/training-paces")
            page.wait_for_load_state("load")
            
            # Wait for the panel to load
            page.wait_for_selector(".panel-body", timeout=60000)
            
            # Get the HTML of the training paces panel
            panel_html = page.query_selector(".panel-body").inner_html()
            
            paces = parse_training_paces_html(panel_html)
            
            # Accumulate history
            paces_file = os.path.join(output_dir, f"{username}_paces.json")
            if os.path.exists(paces_file):
                with open(paces_file, 'r') as f:
                    history = json.load(f)
            else:
                history = []
            
            from datetime import datetime
            history.append({
                "date": datetime.now().isoformat(),
                "paces": paces
            })
            
            with open(paces_file, 'w') as f:
                json.dump(history, f, indent=4)
            
            return paces
        finally:
            browser.close()

def parse_prognosis_html(html_content):
    """Parse prognosis data from the HTML content."""
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html_content, 'html.parser')
    
    prognosis = {}
    rows = soup.find_all('tr')
    for row in rows:
        cells = row.find_all('td')
        if len(cells) >= 2:
            key = cells[0].get_text(strip=True)
            value = cells[1].get_text(strip=True)
            if key and value:
                prognosis[key] = value
    return prognosis

def fetch_prognosis(username, password, output_dir="data", debug=False):
    """Fetch prognosis from Runalyze and save to JSON."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not debug)
        page = browser.new_page()
        
        try:
            auto_login(page, username, password)
            page.goto("https://runalyze.com/athlete/prognosis")
            page.wait_for_load_state("load")
            
            # Wait for the panel to load
            page.wait_for_selector(".panel-body", timeout=60000)
            
            # Get the HTML of the prognosis panel
            panel_html = page.query_selector(".panel-body").inner_html()
            
            prognosis = parse_prognosis_html(panel_html)
            
            # Accumulate history
            prognosis_file = os.path.join(output_dir, f"{username}_prognosis.json")
            if os.path.exists(prognosis_file):
                with open(prognosis_file, 'r') as f:
                    history = json.load(f)
            else:
                history = []
            
            from datetime import datetime
            history.append({
                "date": datetime.now().isoformat(),
                "prognosis": prognosis
            })
            
            with open(prognosis_file, 'w') as f:
                json.dump(history, f, indent=4)
            
            return prognosis
        finally:
            browser.close()

def parse_vo2_html(html_content):
    """Parse VO2 max data from the HTML content."""
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html_content, 'html.parser')
    
    vo2 = {}
    rows = soup.find_all('tr')
    for row in rows:
        cells = row.find_all('td')
        if len(cells) >= 2:
            key = cells[0].get_text(strip=True)
            value = cells[1].get_text(strip=True)
            if key and value:
                vo2[key] = value
    return vo2

def fetch_vo2(username, password, output_dir="data", debug=False):
    """Fetch VO2 max from Runalyze and save to JSON."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not debug)
        page = browser.new_page()
        
        try:
            auto_login(page, username, password)
            page.goto("https://runalyze.com/athlete/vo2max")
            page.wait_for_load_state("load")
            
            # Wait for the panel to load
            page.wait_for_selector(".panel-body", timeout=60000)
            
            # Get the HTML of the VO2 panel
            panel_html = page.query_selector(".panel-body").inner_html()
            
            vo2 = parse_vo2_html(panel_html)
            
            # Accumulate history
            vo2_file = os.path.join(output_dir, f"{username}_vo2.json")
            if os.path.exists(vo2_file):
                with open(vo2_file, 'r') as f:
                    history = json.load(f)
            else:
                history = []
            
            from datetime import datetime
            history.append({
                "date": datetime.now().isoformat(),
                "vo2": vo2
            })
            
            with open(vo2_file, 'w') as f:
                json.dump(history, f, indent=4)
            
            return vo2
        finally:
            browser.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scrape training data from Runalyze")
    parser.add_argument("--username", required=True, help="Runalyze username")
    parser.add_argument("--password", required=True, help="Runalyze password")
    parser.add_argument("--user", required=True, help="User identifier (aaron or kristin)")
    parser.add_argument("--output-dir", default="public/data", help="Output directory for JSON files")
    parser.add_argument("--debug", action="store_true", help="Enable debug output")

    args = parser.parse_args()

    # Ensure output directory exists
    os.makedirs(args.output_dir, exist_ok=True)

    print(f"Fetching training paces for {args.user}...")
    paces = fetch_training_paces(args.username, args.password, args.output_dir, debug=args.debug)
    print(f"Found {len(paces)} pace entries")

    print(f"Fetching prognosis for {args.user}...")
    prognosis = fetch_prognosis(args.username, args.password, args.output_dir, debug=args.debug)
    print(f"Found {len(prognosis)} prognosis entries")

    print(f"Fetching VO2 max for {args.user}...")
    vo2 = fetch_vo2(args.username, args.password, args.output_dir, debug=args.debug)
    print(f"Found {len(vo2)} VO2 entries")

    print("Scraping complete!")
