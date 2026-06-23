"""
Mocked tests for hybrid retrieval escalation logic (Task hybrid-retrieval).
Verifies the three escalation scenarios without any real API calls.
"""
import os
import sys
import unittest
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))


def _make_claude_stub(text: str = "Some response"):
    content_block = MagicMock()
    content_block.text = text
    message = MagicMock()
    message.content = [content_block]
    client = MagicMock()
    client.messages.create.return_value = message
    return client


class TestHybridEscalation(unittest.TestCase):
    """
    Three scenarios for the new escalation rule:
      escalate = not (has_semantic OR has_keyword)
    """

    def setUp(self):
        # Clear query cache between tests to avoid cross-test pollution
        from agent.llm import _query_cache
        _query_cache.clear()

    def test_semantic_hit_no_escalation(self):
        """Chunk with similarity >= 0.4 (floor) → has_semantic=True → escalate=False."""
        chunks = [
            {
                "id": "s1",
                "content": "Onboarding info here.",
                "source_doc": "onboarding.pdf",
                "metadata": {},
                "similarity": 0.6,
                "keyword_hit": False,
            }
        ]
        with (
            patch("agent.llm.retrieve_chunks", return_value=chunks),
            patch("agent.llm._claude", return_value=_make_claude_stub()),
        ):
            from agent.llm import chat
            from api.models import Message

            result = chat("What is the onboarding process?", [])

        self.assertFalse(result["escalate"])
        self.assertGreater(len(result["citations"]), 0)
        self.assertGreater(len(result["sources"]), 0)

    def test_keyword_hit_only_no_escalation(self):
        """Chunk with similarity < threshold but keyword_hit=True → escalate=False."""
        chunks = [
            {
                "id": "k1",
                "content": "Slack is the main communication tool.",
                "source_doc": "tools.pdf",
                "metadata": {},
                "similarity": 0.2,  # below 0.4 floor
                "keyword_hit": True,
            }
        ]
        with (
            patch("agent.llm.retrieve_chunks", return_value=chunks),
            patch("agent.llm._claude", return_value=_make_claude_stub()),
        ):
            from agent.llm import _query_cache
            _query_cache.clear()

            from agent.llm import chat
            from api.models import Message

            result = chat("Which tools does the team use?", [])

        self.assertFalse(result["escalate"])
        self.assertGreater(len(result["citations"]), 0)

    def test_neither_hit_escalates_with_empty_context(self):
        """Chunk with similarity < threshold and keyword_hit=False → escalate=True, citations=[]."""
        chunks = [
            {
                "id": "n1",
                "content": "Some weakly related content.",
                "source_doc": "misc.pdf",
                "metadata": {},
                "similarity": 0.2,  # below 0.4 floor
                "keyword_hit": False,
            }
        ]
        with (
            patch("agent.llm.retrieve_chunks", return_value=chunks),
            patch("agent.llm._claude", return_value=_make_claude_stub()),
        ):
            from agent.llm import _query_cache
            _query_cache.clear()

            from agent.llm import chat
            from api.models import Message

            result = chat("What is the price of a spaceship?", [])

        self.assertTrue(result["escalate"])
        self.assertEqual(result["citations"], [])
        self.assertEqual(result["sources"], [])

    def test_empty_chunks_escalates(self):
        """Zero chunks returned → escalate=True, citations=[], sources=[]."""
        with (
            patch("agent.llm.retrieve_chunks", return_value=[]),
            patch("agent.llm._claude", return_value=_make_claude_stub()),
        ):
            from agent.llm import _query_cache
            _query_cache.clear()

            from agent.llm import chat
            from api.models import Message

            result = chat("Random off-topic question.", [])

        self.assertTrue(result["escalate"])
        self.assertEqual(result["citations"], [])
        self.assertEqual(result["sources"], [])


if __name__ == "__main__":
    unittest.main(verbosity=2)
