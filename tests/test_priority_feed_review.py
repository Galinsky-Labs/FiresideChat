import unittest
from scripts.priority_feed_review import classify_directory_result

class DirectoryReviewTests(unittest.TestCase):
    def test_directory_is_never_proof_of_official_host(self):
        row=classify_directory_result(101,{"trackId":101,"feedUrl":"https://show.example/feed"})
        self.assertEqual(row["status"],"FEED_FOUND_REQUIRES_HOST_AND_RSS_REVIEW")
        self.assertFalse(row["host_verified"])
    def test_wrong_entry_and_unsafe_urls_rejected(self):
        self.assertEqual(classify_directory_result(101,{"trackId":102})["status"],"ID_MISMATCH")
        for url in ("http://localhost/feed","https://u:p@example.org/","https://show.example/feed?token=x","javascript:foo"):
            self.assertEqual(classify_directory_result(101,{"trackId":101,"feedUrl":url})["status"],"UNSAFE_FEED_URL")

    def test_ports_controls_and_noncanonical_forms_are_rejected(self):
        for url in ("https://example.org:8443/feed", "https://example.org:443/feed",
                    "https://example.org:/feed", "https://example.org/feed?", "https://example.org/feed#",
                    "https://example.org/\nfeed", "https://example.org/a\\b", " https://example.org/feed"):
            self.assertEqual(classify_directory_result(101,{"trackId":101,"feedUrl":url})["status"],"UNSAFE_FEED_URL")
    def test_noninteger_directory_identity_is_not_an_exact_match(self):
        for value in (101.0,"101",True,None):
            self.assertEqual(classify_directory_result(101,{"trackId":value})["status"],"ID_MISMATCH")

    def test_actual_lookup_uses_classifier_before_exposing_directory_metadata(self):
        import contextlib
        import csv
        import importlib.util
        import io
        import json
        import sys
        import tempfile
        from pathlib import Path
        from unittest.mock import patch
        from scripts import priority_feed_review
        root=Path(__file__).resolve().parents[1]
        spec=importlib.util.spec_from_file_location('priority_lookup',root/'scripts/resolve-priority-podcast-feeds.py')
        module=importlib.util.module_from_spec(spec)
        with patch.dict(sys.modules,{'priority_feed_review':priority_feed_review}):
            spec.loader.exec_module(module)
        class Response(io.BytesIO):
            def read(self, size=-1):
                if size != 1024*1024+1:
                    raise AssertionError('directory response must be bounded')
                return super().read(size)
        payload=json.dumps({'results':[{'trackId':101,'feedUrl':'https://show.example:8443/feed','trackViewUrl':'https://directory.example/show'}]}).encode()
        with tempfile.TemporaryDirectory() as folder:
            output=str(Path(folder)/'lookup.csv')
            with patch.object(module,'PRIORITY',{101:('Synthetic Official','Synthetic Show')}), patch.object(module,'urlopen',return_value=Response(payload)), patch.object(module.time,'sleep'), patch.object(sys,'argv',['lookup','--output',output]), contextlib.redirect_stdout(io.StringIO()):
                module.main()
            with open(output,newline='') as file:
                rows=list(csv.DictReader(file))
            self.assertEqual(rows[0]['status'],'UNSAFE_FEED_URL')
            self.assertEqual(rows[0]['rss_url'],'')
            self.assertEqual(rows[0]['directory_url'],'')
