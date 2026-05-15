"""Tavily web search integration."""

from __future__ import annotations

from tavily import AsyncTavilyClient

from app.core.config import settings


class SearchService:
    @staticmethod
    async def search(query: str, max_results: int = 5) -> list[dict]:
        """
        Search the web via Tavily and return a list of result dicts with
        keys: title, url, content (snippet).
        """
        if not settings.TAVILY_API_KEY:
            return []

        client = AsyncTavilyClient(api_key=settings.TAVILY_API_KEY)
        response = await client.search(
            query=query,
            search_depth="basic",
            max_results=max_results,
        )
        return [
            {
                "title": r.get("title", ""),
                "url": r.get("url", ""),
                "content": r.get("content", ""),
            }
            for r in response.get("results", [])
        ]

    @staticmethod
    def format_for_prompt(results: list[dict]) -> str:
        """Format search results as a Markdown block for injection into a prompt."""
        if not results:
            return ""
        lines = ["### Web Search Results\n"]
        for i, r in enumerate(results, start=1):
            lines.append(f"{i}. **{r['title']}** ({r['url']})\n   {r['content']}\n")
        return "\n".join(lines)
