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
