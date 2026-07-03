#!/usr/bin/env python3
"""
Auto-translate all [EN] marked strings in all language files using Google Translate (unofficial API).
"""

import json
import re
import time
import urllib.request
import urllib.parse
import sys
import os

LANGUAGES = ["ar", "es", "fr", "id", "ja", "ko", "ru", "tr"]

def translate_text(text, dest_lang, src="en"):
    """Translate text using Google Translate unofficial API."""
    # Remove [EN] marker for translation
    clean = text.replace(" [EN]", "").strip()
    if not clean:
        return text.replace(" [EN]", "").strip()
    
    # Preserve placeholders like {name}, {team}, {count}, etc.
    placeholders = {}
    counter = [0]
    
    def replace_placeholder(m):
        token = f"XPLACEHOLDERX{counter[0]}X"
        placeholders[token] = m.group(0)
        counter[0] += 1
        return token
    
    clean_with_tokens = re.sub(r'\{[^}]+\}', replace_placeholder, clean)
    
    # Google Translate URL
    url = "https://translate.googleapis.com/translate_a/single"
    params = urllib.parse.urlencode({
        "client": "gtx",
        "sl": src,
        "tl": dest_lang,
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


def traverse_and_translate(obj, dest_lang, path="", total_count=[0], translated_count=[0]):
    """Recursively traverse JSON and translate [EN] strings."""
    if isinstance(obj, dict):
        result = {}
        for key, value in obj.items():
            result[key] = traverse_and_translate(value, dest_lang, f"{path}.{key}", total_count, translated_count)
        return result
    elif isinstance(obj, list):
        return [traverse_and_translate(item, dest_lang, f"{path}[{i}]", total_count, translated_count) 
                for i, item in enumerate(obj)]
    elif isinstance(obj, str) and "[EN]" in obj:
        total_count[0] += 1
        translated = translate_text(obj, dest_lang)
        translated_count[0] += 1
        if total_count[0] % 50 == 0:
            print(f"  Progress: {translated_count[0]} strings translated...")
        time.sleep(0.05)  # Small delay to avoid rate limiting
        return translated
    else:
        return obj


def process_file(filepath, dest_lang):
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    # Count [EN] strings
    content = json.dumps(data)
    en_count = content.count("[EN]")
    
    if en_count == 0:
        return
    
    print(f"Translating {filepath} ({en_count} strings) into {dest_lang}...")
    
    total_count = [0]
    translated_count = [0]
    
    translated_data = traverse_and_translate(data, dest_lang, filepath, total_count, translated_count)
    
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(translated_data, f, ensure_ascii=False, indent=2)
    
    print(f"  ✓ Done! {translated_count[0]} strings translated.")


def main():
    for lang in LANGUAGES:
        print(f"\n{'='*60}")
        print(f"Processing language: {lang}")
        print(f"{'='*60}")
        
        # Walk directory and find all JSON files
        lang_dir = lang
        if os.path.exists(lang_dir):
            for root, dirs, files in os.walk(lang_dir):
                for file in files:
                    if file.endswith(".json"):
                        filepath = os.path.join(root, file)
                        try:
                            process_file(filepath, lang)
                        except Exception as e:
                            print(f"Error processing {filepath}: {e}")
        else:
            print(f"Directory not found: {lang_dir}")
            
    print(f"\n{'='*60}")
    print("All languages processed!")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
