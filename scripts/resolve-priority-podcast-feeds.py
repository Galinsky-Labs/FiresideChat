#!/usr/bin/env python3
"""Resolve podcast directory IDs to canonical RSS feeds for editorial review."""
import argparse
import csv
import json
import time
from priority_feed_review import classify_directory_result
from urllib.parse import urlencode
from urllib.request import Request, urlopen

PRIORITY = {
    1759425935: ("Peter Roskam", "The Cloakroom with Peter Roskam - BakerHosts"),
    1877621582: ("Claire McCaskill", "How to Win"),
    1801534903: ("Cori Bush and Jamaal Bowman", "Bowman and Bush"),
    1606026612: ("John Kasich", "Kasich & Klepper"),
    1869131540: ("Tim Hutchinson", "Cigar Caucus"),
    1455383209: ("Steve Pearce", "Inside New Mexico with Steve Pearce"),
    1622471150: ("Jon Porter", "PoliticsAside"),
    1741663279: ("Denver Riggleman", "Coalition of the Sane"),
    1779749359: ("Patrick J. Murphy", "Warrior Money"),
    1629021100: ("Marjorie Taylor Greene", "MTG"),
    1784810554: ("George Santos", "Pants On Fire With George Santos"),
}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--output", default="priority-podcast-feed-lookups.csv")
    args = p.parse_args()
    rows = []
    for app_id, (member, expected_show) in PRIORITY.items():
        url = "https://itunes.apple.com/lookup?" + urlencode(
            {"id": str(app_id), "country": "US"})
        row = {
            "member": member, "expected_show": expected_show,
            "apple_id": app_id, "directory_url": "",
            "found_title": "", "found_publisher": "",
            "rss_url": "", "status": "UNVERIFIED", "error": "",
        }
        try:
            req = Request(url, headers={
                "User-Agent": "FiresideChat-HistoricalPodcastLookup/1.0",
                "Accept": "application/json"})
            with urlopen(req, timeout=25) as response:
                raw = response.read(1024 * 1024 + 1)
                if len(raw) > 1024 * 1024:
                    raise ValueError("directory response exceeds 1 MiB")
                payload = json.loads(raw.decode("utf-8"))
                if not isinstance(payload, dict) or not isinstance(payload.get("results"), list):
                    raise ValueError("invalid directory response")
                results = payload["results"]
            show = next((x for x in results if type(x) is dict and type(x.get("trackId")) is int and x["trackId"] == app_id), None)
            if show:
                classification = classify_directory_result(app_id, show)
                if classification["status"] in {"UNSAFE_FEED_URL", "UNSAFE_DIRECTORY_URL", "ID_MISMATCH"}:
                    row["status"] = classification["status"]
                    rows.append(row)
                    print(json.dumps(row, ensure_ascii=False), flush=True)
                    continue
                row.update({
                    "found_title": show.get("collectionName", "") or "",
                    "found_publisher": show.get("artistName", "") or "",
                    "rss_url": show.get("feedUrl", "") or "",
                    "directory_url": show.get("trackViewUrl", "") or "",
                    "status": classification["status"],
                })
            else:
                row["status"] = "NO_DIRECTORY_ENTRY"
        except Exception as e:
            row["status"] = "API_ERROR"
            row["error"] = str(e)[:250]
        rows.append(row)
        print(json.dumps(row, ensure_ascii=False), flush=True)
        time.sleep(2)
    with open(args.output, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)


if __name__ == "__main__":
    main()
