"""
Mocked tests for Task #3 — inline citations in chat response.
No real Voyage/Claude/Supabase calls are made.
"""
import os
import sys
import types
import unittest
from unittest.mock import MagicMock, patch

# Ensure we run from backend root without activating the venv explicitly
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# ---------------------------------------------------------------------------
# Minimal stubs so the lazy @lru_cache factories don't need real credentials
# ---------------------------------------------------------------------------

FAKE_CHUNKS = [
    {
        "id": "abc1",
        "content": "Usamos Notion, Slack y Linear como herramientas principales.",
        "source_doc": "onboarding.pdf",
        "metadata": {},
        "similarity": 0.82,
    },
    {
        "id": "abc2",
        "content": "El stack técnico incluye Next.js, FastAPI y Supabase.",
        "source_doc": "tech_stack.pdf",
        "metadata": {},
        "similarity": 0.71,
    },
]

FAKE_RESPONSE_TEXT = "El equipo usa Notion, Slack y Linear como herramientas principales."


class TestCitationsWithChunks(unittest.TestCase):
    """When chunks are returned, citations must match them exactly."""

    def _make_claude_stub(self):
        content_block = MagicMock()
        content_block.text = FAKE_RESPONSE_TEXT
        message = MagicMock()
        message.content = [content_block]
        client = MagicMock()
        client.messages.create.return_value = message
        return client

    def test_citations_populated(self):
        with (
            patch("agent.llm.retrieve_chunks", return_value=FAKE_CHUNKS),
            patch("agent.llm._claude", return_value=self._make_claude_stub()),
        ):
            # Clear query cache between test runs
            from agent.llm import _query_cache
            _query_cache.clear()

            from agent.llm import chat
            from api.models import Message

            result = chat("¿Qué herramientas usa el equipo?", [])

        self.assertEqual(result["response"], FAKE_RESPONSE_TEXT)
        self.assertFalse(result["escalate"])
        self.assertEqual(result["sources"], ["onboarding.pdf", "tech_stack.pdf"])
        self.assertEqual(len(result["citations"]), 2)

        c0 = result["citations"][0]
        self.assertEqual(c0["source_doc"], "onboarding.pdf")
        self.assertEqual(c0["content"], FAKE_CHUNKS[0]["content"])
        self.assertAlmostEqual(c0["similarity"], 0.82)

        c1 = result["citations"][1]
        self.assertEqual(c1["source_doc"], "tech_stack.pdf")
        self.assertAlmostEqual(c1["similarity"], 0.71)

    def test_citations_in_cache_hit(self):
        """Cache hits must also return citations (they were stored with citations)."""
        with (
            patch("agent.llm.retrieve_chunks", return_value=FAKE_CHUNKS),
            patch("agent.llm._claude", return_value=self._make_claude_stub()),
        ):
            from agent.llm import _query_cache
            _query_cache.clear()

            from agent.llm import chat
            result_first = chat("¿Qué herramientas usa el equipo?", [])
            # Second call — should be a cache hit, no retrieve_chunks call needed
            result_cached = chat("¿Qué herramientas usa el equipo?", [])

        self.assertIn("citations", result_cached)
        self.assertEqual(len(result_cached["citations"]), 2)
        self.assertEqual(result_first["citations"], result_cached["citations"])


class TestCitationsEscalated(unittest.TestCase):
    """When no chunks are found, citations must be [] and escalate must be True."""

    def test_escalated_no_citations(self):
        with patch("agent.llm.retrieve_chunks", return_value=[]):
            claude_stub = MagicMock()
            content_block = MagicMock()
            content_block.text = "No tengo información sobre eso. Te comunico con el equipo."
            claude_stub.messages.create.return_value = MagicMock(content=[content_block])

            with patch("agent.llm._claude", return_value=claude_stub):
                from agent.llm import _query_cache
                _query_cache.clear()

                from agent.llm import chat
                result = chat("¿Cuánto cuesta una nave espacial?", [])

        self.assertTrue(result["escalate"])
        self.assertEqual(result["citations"], [])
        self.assertEqual(result["sources"], [])


if __name__ == "__main__":
    unittest.main(verbosity=2)
