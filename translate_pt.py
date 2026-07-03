#!/usr/bin/env python3
"""
Auto-translate all [EN] marked strings in PT JSON files using Google Translate (unofficial API).
"""

import json
import re
import time
import urllib.request
import urllib.parse
import sys
import os

# Files to translate
FILES = [
    "pt/events.json",
    "pt/database.json",
    "pt/news.json",
    "pt/stats.json",
    "pt/media.json",
    "pt/trophies.json",
    "pt/legacy.json",
]

def translate_text(text, src="en", dest="pt"):
    """Translate text using Google Translate unofficial API."""
    # Remove [EN] marker for translation
    clean = text.replace(" [EN]", "").strip()
    if not clean:
        return text.replace(" [EN]", "").strip()
    
    # Preserve placeholders like {name}, {team}, {count}, etc.
    # Replace them with unique tokens before translation
    placeholders = {}
    counter = [0]
    
    def replace_placeholder(m):
        token = f"XPLACEHOLDERX{counter[0]}X"
        placeholders[token] = m.group(0)
        counter[0] += 1
        return token
    
    clean_with_tokens = re.sub(r'\{[^}]+\}', replace_placeholder, clean)
    
    # Also preserve emoji sequences
    emoji_pattern = re.compile(
        "[\U0001F600-\U0001F64F"
        "\U0001F300-\U0001F5FF"
        "\U0001F680-\U0001F6FF"
        "\U0001F1E0-\U0001F1FF"
        "\U00002700-\U000027BF"
        "\U0001F900-\U0001F9FF"
        "\U00002600-\U000026FF"
        "\U00002B00-\U00002BFF"
        "\U0001FA00-\U0001FA6F"
        "\U0001FA70-\U0001FAFF"
        "\U00023000-\U000233FF"
        "\u2702-\u27B0"
        "\u24C2-\U0001F251"
        "]+", flags=re.UNICODE)
    
    # Google Translate URL
    url = "https://translate.googleapis.com/translate_a/single"
    params = urllib.parse.urlencode({
        "client": "gtx",
        "sl": src,
        "tl": dest,
        "dt": "t",
        "q": clean_with_tokens
    })
    
    full_url = f"{url}?{params}"
    
    try:
        req = urllib.request.Request(
            full_url,
            headers={
                "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
            }
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode("utf-8"))
            
        # Extract translated text
        translated = ""
        if data and data[0]:
            for segment in data[0]:
                if segment[0]:
                    translated += segment[0]
        
        # Restore placeholders
        for token, original in placeholders.items():
            translated = translated.replace(token, original)
            # Also try with spaces that Google might add
            translated = translated.replace(f" {token} ", f" {original} ")
            translated = translated.replace(f"{token} ", f"{original} ")
            translated = translated.replace(f" {token}", f" {original}")
        
        return translated if translated else clean
        
    except Exception as e:
        print(f"  WARNING: Translation failed for '{clean[:50]}...': {e}")
        return clean  # Return original without [EN] tag


def traverse_and_translate(obj, path="", total_count=[0], translated_count=[0]):
    """Recursively traverse JSON and translate [EN] strings."""
    if isinstance(obj, dict):
        result = {}
        for key, value in obj.items():
            result[key] = traverse_and_translate(value, f"{path}.{key}", total_count, translated_count)
        return result
    elif isinstance(obj, list):
        return [traverse_and_translate(item, f"{path}[{i}]", total_count, translated_count) 
                for i, item in enumerate(obj)]
    elif isinstance(obj, str) and "[EN]" in obj:
        total_count[0] += 1
        translated = translate_text(obj)
        translated_count[0] += 1
        if total_count[0] % 50 == 0:
            print(f"  Progress: {translated_count[0]} strings translated...")
        time.sleep(0.05)  # Small delay to avoid rate limiting
        return translated
    else:
        return obj


def process_file(filepath):
    print(f"\n{'='*60}")
    print(f"Processing: {filepath}")
    print(f"{'='*60}")
    
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    # Count [EN] strings
    content = json.dumps(data)
    en_count = content.count("[EN]")
    print(f"Found {en_count} strings to translate...")
    
    if en_count == 0:
        print("  Nothing to translate. Skipping.")
        return
    
    total_count = [0]
    translated_count = [0]
    
    translated_data = traverse_and_translate(data, filepath, total_count, translated_count)
    
    # Write back
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(translated_data, f, ensure_ascii=False, indent=2)
    
    print(f"  ✓ Done! {translated_count[0]} strings translated.")
    
    # Verify no [EN] remaining
    with open(filepath, "r", encoding="utf-8") as f:
        new_content = f.read()
    remaining = new_content.count("[EN]")
    if remaining > 0:
        print(f"  ⚠️  WARNING: {remaining} [EN] markers still remaining!")
    else:
        print(f"  ✓ All [EN] markers removed.")


def main():
    if len(sys.argv) > 1:
        files = sys.argv[1:]
    else:
        files = FILES
    
    for filepath in files:
        if os.path.exists(filepath):
            process_file(filepath)
        else:
            print(f"WARNING: File not found: {filepath}")
    
    print(f"\n{'='*60}")
    print("All files processed!")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
