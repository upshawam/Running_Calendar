import json
import os
import argparse
from playwright.sync_api import sync_playwright

def auto_login(storage_path, username, password, debug=False):
    """Automatically log in to Runalyze and save storage state."""
    # Force headless mode in CI environments
    import os
    is_ci = os.getenv('CI') == 'true' or os.getenv('GITHUB_ACTIONS') == 'true'
    if is_ci:
        debug = False
        print("Running in CI environment, forcing headless mode")
    
    print(f"Starting auto-login for {username}...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not debug)
        context = browser.new_context()

        try:
            page = context.new_page()
            print("Navigating to login page...")
            page.goto("https://runalyze.com/login", wait_until="domcontentloaded")

            # Wait for the page to load
            page.wait_for_load_state("networkidle", timeout=30000)
            print("Page loaded, attempting login...")

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

            # Save storage state
            os.makedirs(os.path.dirname(storage_path), exist_ok=True)
            context.storage_state(path=storage_path)
            print(f"Storage state saved to {storage_path}")

        finally:
            browser.close()

def fetch_data(storage_path, user, output_dir="docs/data", debug=False):
    """Fetch training data using saved storage state."""
    # Force headless mode in CI environments
    import os
    is_ci = os.getenv('CI') == 'true' or os.getenv('GITHUB_ACTIONS') == 'true'
    if is_ci:
        debug = False
        print("Running in CI environment, forcing headless mode")
    
    print(f"Starting data fetch for {user}...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not debug)

        # Load storage state if it exists
        context_options = {}
        if os.path.exists(storage_path):
            context_options["storage_state"] = storage_path
            print(f"Loaded storage state from {storage_path}")
        else:
            print(f"Storage state file {storage_path} not found, will need to login first")

        context = browser.new_context(**context_options)
        page = context.new_page()

        try:
            # Fetch training paces
            print("Fetching training paces...")
            page.goto("https://runalyze.com/dashboard", wait_until="domcontentloaded")
            page.wait_for_load_state("networkidle", timeout=30000)

            # Wait for the panel to load - try multiple selectors
            panel_html = None
            try:
                page.wait_for_selector(".panel-content", timeout=10000)
                panel_html = page.query_selector(".panel-content").inner_html()
                print("Found panel using .panel-content selector")
            except:
                print("Could not find .panel-content, trying alternative selectors...")
                # Try other common selectors
                for selector in [".panel-body", "[class*='panel']", "main", "[role='main']", ".content"]:
                    try:
                        element = page.query_selector(selector)
                        if element:
                            panel_html = element.inner_html()
                            print(f"Found content using selector: {selector}")
                            break
                    except:
                        continue
                
                if not panel_html:
                    print("Could not find panel with any selector. Page HTML:")
                    print(page.content()[:2000])
                    raise Exception("Could not find training paces panel on page")

            paces = parse_training_paces_html(panel_html)

            # Accumulate history
            paces_file = os.path.join(output_dir, f"{user}_paces.json")
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

            print(f"Saved {len(paces)} pace entries to {paces_file}")

            # Fetch prognosis
            print("Fetching prognosis...")
            page.goto("https://runalyze.com/athlete/prognosis", wait_until="domcontentloaded")
            page.wait_for_load_state("networkidle", timeout=30000)

            # Wait for the panel to load - try multiple selectors
            panel_html = None
            try:
                page.wait_for_selector(".panel-content", timeout=10000)
                panel_html = page.query_selector(".panel-content").inner_html()
                print("Found prognosis panel using .panel-content selector")
            except:
                print("Could not find .panel-content for prognosis, trying alternative selectors...")
                for selector in [".panel-body", "[class*='panel']", "main", "[role='main']", ".content"]:
                    try:
                        element = page.query_selector(selector)
                        if element:
                            panel_html = element.inner_html()
                            print(f"Found prognosis using selector: {selector}")
                            break
                    except:
                        continue
                
                if not panel_html:
                    print("Could not find prognosis panel, skipping...")
                    prognosis = {}
                    panel_html = ""

            if panel_html:
                prognosis = parse_prognosis_html(panel_html)
            else:
                prognosis = {}

            # Accumulate history for prognosis
            prognosis_file = os.path.join(output_dir, f"{user}_prognosis.json")
            if os.path.exists(prognosis_file):
                with open(prognosis_file, 'r') as f:
                    history = json.load(f)
            else:
                history = []

            if prognosis:  # Only append if we have data
                from datetime import datetime
                history.append({
                    "date": datetime.now().isoformat(),
                    "prognosis": prognosis
                })

                with open(prognosis_file, 'w') as f:
                    json.dump(history, f, indent=4)

                print(f"Saved {len(prognosis)} prognosis entries to {prognosis_file}")
            else:
                print("No prognosis data to save")

            # Fetch VO2 max
            print("Fetching VO2 max...")
            page.goto("https://runalyze.com/athlete/vo2max", wait_until="domcontentloaded")
            page.wait_for_load_state("networkidle", timeout=30000)

            # Wait for the panel to load - try multiple selectors
            panel_html = None
            try:
                page.wait_for_selector(".panel-content", timeout=10000)
                panel_html = page.query_selector(".panel-content").inner_html()
                print("Found VO2 panel using .panel-content selector")
            except:
                print("Could not find .panel-content for VO2, trying alternative selectors...")
                for selector in [".panel-body", "[class*='panel']", "main", "[role='main']", ".content"]:
                    try:
                        element = page.query_selector(selector)
                        if element:
                            panel_html = element.inner_html()
                            print(f"Found VO2 using selector: {selector}")
                            break
                    except:
                        continue
                
                if not panel_html:
                    print("Could not find VO2 panel, skipping...")
                    vo2 = {}
                    panel_html = ""

            if panel_html:
                vo2 = parse_vo2_html(panel_html)
            else:
                vo2 = {}

            # Accumulate history for VO2
            vo2_file = os.path.join(output_dir, f"{user}_vo2.json")
            if os.path.exists(vo2_file):
                with open(vo2_file, 'r') as f:
                    history = json.load(f)
            else:
                history = []

            if vo2:  # Only append if we have data
                from datetime import datetime
                history.append({
                    "date": datetime.now().isoformat(),
                    "vo2": vo2
                })

                with open(vo2_file, 'w') as f:
                    json.dump(history, f, indent=4)

                print(f"Saved {len(vo2)} VO2 entries to {vo2_file}")
            else:
                print("No VO2 data to save")

        finally:
            browser.close()

def parse_training_paces_html(html_content):
    """Parse training paces from the HTML content of the training paces panel."""
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html_content, 'html.parser')

    paces = {}
    
    # Parse <p> tags containing pace info
    # Structure: <p><span class="right">pace_range</span><strong>type</strong><small>vo2%</small></p>
    pace_paragraphs = soup.find_all('p')
    for p in pace_paragraphs:
        strong = p.find('strong')
        span_right = p.find('span', class_='right')
        small = p.find('small')
        
        if strong and span_right:
            pace_type = strong.get_text(strip=True)
            pace_range = span_right.get_text(strip=True)
            
            # Extract VO2 percentage from small tag (e.g., "(64 - 75%)")
            vo2_percent = ""
            if small:
                vo2_text = small.get_text(strip=True)
                # Extract just the percentage part
                import re
                match = re.search(r'(\d+\s*-\s*\d+%)', vo2_text)
                if match:
                    vo2_percent = match.group(1)
            
            paces[pace_type] = {
                "pace_range": pace_range,
                "vo2_percent": vo2_percent
            }
    
    return paces

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

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scrape training data from Runalyze")
    subparsers = parser.add_subparsers(dest='command', help='Available commands')

    # Auto-login command
    login_parser = subparsers.add_parser('auto-login', help='Login and save storage state')
    login_parser.add_argument('--storage', required=True, help='Path to save storage state')
    login_parser.add_argument('--username', required=True, help='Runalyze username')
    login_parser.add_argument('--password', required=True, help='Runalyze password')
    login_parser.add_argument('--debug', action='store_true', help='Enable debug mode')

    # Fetch command
    fetch_parser = subparsers.add_parser('fetch', help='Fetch data using saved storage state')
    fetch_parser.add_argument('--storage', required=True, help='Path to load storage state')
    fetch_parser.add_argument('--user', required=True, help='User identifier (aaron or kristin)')
    fetch_parser.add_argument('--output-dir', default='docs/data', help='Output directory for JSON files')
    fetch_parser.add_argument('--debug', action='store_true', help='Enable debug mode')

    args = parser.parse_args()

    if args.command == 'auto-login':
        auto_login(args.storage, args.username, args.password, debug=args.debug)
    elif args.command == 'fetch':
        # Ensure output directory exists
        os.makedirs(args.output_dir, exist_ok=True)
        fetch_data(args.storage, args.user, args.output_dir, debug=args.debug)
    else:
        parser.print_help()
