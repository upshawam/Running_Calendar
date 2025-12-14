import json
import os
import argparse
from playwright.sync_api import sync_playwright

def auto_login(page, username, password):
    """Automatically log in to Runalyze using provided credentials."""
    page.goto("https://runalyze.com/login")
    page.fill("input[name='username']", username)
    page.fill("input[name='password']", password)
    page.click("button[type='submit']")
    page.wait_for_load_state("networkidle")

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
            pace_value = cells[1].get_text(strip=True)
            if pace_type and pace_value:
                paces[pace_type] = pace_value
    return paces

def fetch_training_paces(username, password, output_dir="data"):
    """Fetch training paces from Runalyze and save to JSON."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
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

def fetch_prognosis(username, password, output_dir="data"):
    """Fetch prognosis from Runalyze and save to JSON."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
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

def fetch_vo2(username, password, output_dir="data"):
    """Fetch VO2 max from Runalyze and save to JSON."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
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

    args = parser.parse_args()

    # Ensure output directory exists
    os.makedirs(args.output_dir, exist_ok=True)

    print(f"Fetching training paces for {args.user}...")
    paces = fetch_training_paces(args.username, args.password, args.output_dir)
    print(f"Found {len(paces)} pace entries")

    print(f"Fetching prognosis for {args.user}...")
    prognosis = fetch_prognosis(args.username, args.password, args.output_dir)
    print(f"Found {len(prognosis)} prognosis entries")

    print(f"Fetching VO2 max for {args.user}...")
    vo2 = fetch_vo2(args.username, args.password, args.output_dir)
    print(f"Found {len(vo2)} VO2 entries")

    print("Scraping complete!")
