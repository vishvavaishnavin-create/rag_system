import json
import urllib.parse
import urllib.request

_WIKIPEDIA_API = (
    "https://en.wikipedia.org/w/api.php"
    "?action=query&titles={title}&prop=extracts"
    "&explaintext=true&format=json&exsectionformat=plain"
)


def fetch_article(topic: str) -> dict | None:
    """Fetch a Wikipedia article. Returns {"title": str, "text": str} or None if not found."""
    query = urllib.parse.quote(topic.replace(" ", "_"))
    url = _WIKIPEDIA_API.format(title=query)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "WikiRAG/2.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
        pages = data["query"]["pages"]
        for page_id, page in pages.items():
            if page_id == "-1":
                return None
            text: str = page.get("extract", "").strip()
            title: str = page.get("title", topic)
            if text:
                return {"title": title, "text": text}
    except Exception:
        return None
    return None


def validate_topic_exists(topic: str) -> bool:
    return fetch_article(topic) is not None
