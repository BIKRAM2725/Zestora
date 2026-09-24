
import json
import os
import re
import time
from urllib.parse import urljoin, urlparse, urldefrag

import faiss
import numpy as np
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from google import genai
from playwright.sync_api import sync_playwright

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY is missing from .env")

client = genai.Client(api_key=GEMINI_API_KEY)

# ---- configuration -------------------------------------------------------- #
BASE_URL = os.getenv("SITE_URL", "https://Zestoras-c44r.vercel.app/")
if not BASE_URL.endswith("/"):
    BASE_URL += "/"
_parsed = urlparse(BASE_URL)
DOMAIN = _parsed.netloc
ORIGIN = f"{_parsed.scheme}://{DOMAIN}"

MAX_PAGES = 200
CHUNK_SIZE = 900
CHUNK_OVERLAP = 150
DELAY = 0.3
EMBED_BATCH = 20

EXCLUDED_PREFIXES = ("/admin", "/user", "/track", "/checkout", "/cart", "/login", "/register")
# API calls we never look at (private or irrelevant data).
EXCLUDED_API = re.compile(r"order|cart|payment|auth|admin|user|review|track|otp", re.I)

DATA_DIR = "data"
INDEX_FILE = os.path.join(DATA_DIR, "Zestoras.index")
CHUNKS_FILE = os.path.join(DATA_DIR, "Zestoras_chunks.txt")
SOURCES_FILE = os.path.join(DATA_DIR, "Zestoras_sources.txt")
PRODUCTS_FILE = os.path.join(DATA_DIR, "products.json")
CATEGORIES_FILE = os.path.join(DATA_DIR, "categories.json")

PRODUCT_KEYS = ("_id", "title", "description", "category", "images", "isAvailable", "stock", "price", "facilities", "slug")


# ---- URL helpers ---------------------------------------------------------- #
def normalize_url(url):
    url, _ = urldefrag(url)
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or parsed.netloc != DOMAIN:
        return None
    clean = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
    if clean.endswith("/") and clean != BASE_URL:
        clean = clean.rstrip("/")
    return clean


def is_valid_url(url):
    path = urlparse(url).path.lower()
    ignored = (".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp", ".ico", ".pdf", ".zip", ".mp4",
               ".mp3", ".css", ".js", ".json", ".xml", ".woff", ".woff2", ".ttf")
    if path.endswith(ignored):
        return False
    return not path.startswith(EXCLUDED_PREFIXES)


def clean_lines(text):
    lines = [re.sub(r"\s+", " ", ln).strip() for ln in text.splitlines()]
    return "\n".join(ln for ln in lines if ln)


# ---- capturing products from the site's own API calls ---------------------- #
def walk(node, products, categories, depth=0):
    if depth > 8:
        return
    if isinstance(node, dict):
        if "title" in node and "price" in node and node.get("slug"):
            products.append(node)
        elif "name" in node and node.get("slug") and ("image" in node or "public_id" in node) and "price" not in node:
            categories.append(node)
        for v in node.values():
            walk(v, products, categories, depth + 1)
    elif isinstance(node, list):
        for v in node:
            walk(v, products, categories, depth + 1)


def harvest(captured, products, categories, api_hits):
    for resp in captured:
        try:
            data = resp.json()
        except Exception:
            continue
        found_p, found_c = [], []
        walk(data, found_p, found_c)
        if found_p:
            api_hits.add(urlparse(resp.url)._replace(query="").geturl())
        for p in found_p:
            products[str(p["slug"]).lower()] = {k: p[k] for k in PRODUCT_KEYS if k in p}
            cat = p.get("category")
            if isinstance(cat, dict) and cat.get("_id"):
                categories.setdefault(str(cat["_id"]), {"_id": cat["_id"], "name": cat.get("name"), "slug": cat.get("slug")})
        for c in found_c:
            key = str(c.get("_id") or c["slug"])
            categories[key] = {"_id": c.get("_id"), "name": c.get("name"), "slug": c.get("slug")}
    captured.clear()


# ---- crawling ------------------------------------------------------------- #
def extract_page(page, url, captured, products, categories, api_hits, state):
    print(f"\nCollecting: {url}")
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=60000)
        try:
            page.wait_for_load_state("networkidle", timeout=15000)
        except Exception:
            pass
        for _ in range(3):  # trigger lazy-loaded product lists
            page.mouse.wheel(0, 3000)
            page.wait_for_timeout(400)
        page.wait_for_timeout(1000)

        harvest(captured, products, categories, api_hits)

        soup = BeautifulSoup(page.content(), "html.parser")

        # links first (nav/footer links are useful for discovery)
        links = []
        for a in soup.find_all("a", href=True):
            full = normalize_url(urljoin(url, a["href"]))
            if full and is_valid_url(full):
                links.append(full)

        # keep the footer (contact, policies) once, from the home page
        if url == BASE_URL and state.get("footer") is None:
            footer = soup.find("footer")
            state["footer"] = clean_lines(footer.get_text("\n")) if footer else ""

        for tag in soup.find_all(["script", "style", "noscript", "svg", "iframe", "canvas", "nav", "footer"]):
            tag.decompose()

        text = clean_lines(soup.get_text("\n"))
        print(f"Characters extracted: {len(text)}")
        if len(text) < 50:
            print("WARNING: Very little text found.")
            return None, links
        return text, links

    except Exception as e:
        print(f"ERROR: {url}\n{e}")
        return None, []


def crawl_website():
    visited, queue = set(), [BASE_URL]
    pages, products, categories, api_hits = [], {}, {}, set()
    state, captured = {"footer": None}, []

    def on_response(resp):
        try:
            if resp.request.resource_type not in ("xhr", "fetch") or resp.status != 200:
                return
            if "json" not in resp.headers.get("content-type", "") or EXCLUDED_API.search(resp.url):
                return
            captured.append(resp)
        except Exception:
            pass

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.on("response", on_response)

        while queue and len(visited) < MAX_PAGES:
            url = queue.pop(0)
            if not url or url in visited:
                continue
            visited.add(url)

            text, links = extract_page(page, url, captured, products, categories, api_hits, state)
            if text:
                pages.append({"url": url, "text": text})

            for link in links:
                if link not in visited and link not in queue:
                    queue.append(link)
            print(f"Queue: {len(queue)} | Products captured so far: {len(products)}")
            time.sleep(DELAY)

        browser.close()

    return pages, products, categories, api_hits, state.get("footer") or ""


# ---- documents ------------------------------------------------------------ #
def is_available(p):
    return p.get("isAvailable", True) is not False and (p.get("stock") or 0) > 0


def build_documents(pages, products, categories, footer):
    cat_names = {str(k): v.get("name") for k, v in categories.items() if v.get("name")}

    def cat_name(p):
        c = p.get("category")
        return (c.get("name") if isinstance(c, dict) else cat_names.get(str(c))) or ""

    docs = []
    known_slugs = set(products)

    # cleaned page text (skip product pages: the structured product doc is better)
    for pg in pages:
        m = re.match(r"^/product/([^/]+)/?$", urlparse(pg["url"]).path, re.I)
        if m and m.group(1).lower() in known_slugs:
            continue
        docs.append(pg)

    # one document per product
    for slug, p in products.items():
        lines = [f"PRODUCT: {p.get('title')}", f"Price: \u20b9{p.get('price')}"]
        if cat_name(p):
            lines.append(f"Category: {cat_name(p)}")
        stock = p.get("stock")
        lines.append("Availability: " + ("In stock" + (f" ({stock} available)" if stock else "") if is_available(p) else "Out of stock"))
        if p.get("description"):
            lines.append(f"Description: {' '.join(str(p['description']).split())}")
        if p.get("facilities"):
            lines.append("Features: " + ", ".join(map(str, p["facilities"])))
        docs.append({"url": f"{ORIGIN}/product/{p.get('slug', slug)}", "text": "\n".join(lines)})

    # one document per category
    for cid, c in categories.items():
        items = [p for p in products.values()
                 if str((p.get("category") or {}).get("_id") if isinstance(p.get("category"), dict) else p.get("category")) == str(cid)]
        if items and c.get("name"):
            body = "\n".join(f"{p['title']} - \u20b9{p['price']}" for p in items)
            docs.append({"url": f"{ORIGIN}/category/{cid}", "text": f"CATEGORY: {c['name']}\nProducts in this category:\n{body}"})

    # catalogue overview (answers "what do you sell?")
    if products:
        rows = [f"{p['title']} - \u20b9{p['price']}" + (f" - {cat_name(p)}" if cat_name(p) else "") for p in products.values()]
        docs.append({"url": BASE_URL, "text": f"ALL PRODUCTS ({len(rows)} items):\n" + "\n".join(rows)})

    if footer:
        docs.append({"url": BASE_URL, "text": "STORE CONTACT AND SUPPORT INFORMATION:\n" + footer})

    return docs


def chunk_text(text, url):
    header = f"PAGE: {url}\n"
    chunks, cur, size = [], [], 0
    for line in text.splitlines():
        if cur and size + len(line) + 1 > CHUNK_SIZE:
            chunks.append(header + "\n".join(cur))
            keep, k = [], 0
            for ln in reversed(cur):
                if k + len(ln) > CHUNK_OVERLAP:
                    break
                keep.insert(0, ln)
                k += len(ln) + 1
            cur, size = keep, k
        cur.append(line)
        size += len(line) + 1
    if cur:
        chunks.append(header + "\n".join(cur))
    return chunks


def create_chunks(docs):
    chunks, sources = [], []
    for d in docs:
        for c in chunk_text(d["text"], d["url"]):
            chunks.append(c)
            sources.append(d["url"])
    return chunks, sources


# ---- embeddings + saving --------------------------------------------------- #
def embed_batch(texts):
    for attempt in range(5):
        try:
            res = client.models.embed_content(model="gemini-embedding-001", contents=texts)
            vecs = [e.values for e in res.embeddings]
            if len(vecs) != len(texts):
                raise RuntimeError("Embedding count mismatch")
            return vecs
        except Exception as e:
            wait = 2 * 2**attempt
            print(f"Embedding retry in {wait}s: {str(e)[:120]}")
            time.sleep(wait)
    raise RuntimeError("Embedding failed after retries")


def create_embeddings(chunks):
    vectors = []
    for i in range(0, len(chunks), EMBED_BATCH):
        batch = chunks[i:i + EMBED_BATCH]
        print(f"Embedding {i + len(batch)}/{len(chunks)}")
        vectors.extend(embed_batch(batch))
        time.sleep(0.3)
    return np.array(vectors, dtype="float32")


def save_data(chunks, sources, vectors, products, categories):
    os.makedirs(DATA_DIR, exist_ok=True)
    faiss.normalize_L2(vectors)
    index = faiss.IndexFlatIP(vectors.shape[1])
    index.add(vectors)
    faiss.write_index(index, INDEX_FILE)

    with open(CHUNKS_FILE, "w", encoding="utf-8") as f:
        for c in chunks:
            f.write(c + "\n---CHUNK---\n")
    with open(SOURCES_FILE, "w", encoding="utf-8") as f:
        for s in sources:
            f.write(s + "\n")
    with open(PRODUCTS_FILE, "w", encoding="utf-8") as f:
        json.dump(list(products.values()), f, ensure_ascii=False, indent=1)
    with open(CATEGORIES_FILE, "w", encoding="utf-8") as f:
        json.dump(list(categories.values()), f, ensure_ascii=False, indent=1)

    print("\n" + "=" * 60 + "\nINGESTION COMPLETE\n" + "=" * 60)
    print(f"Pages indexed : {len(set(sources))}")
    print(f"Chunks        : {len(chunks)}")
    print(f"Vectors       : {index.ntotal}")
    print(f"Products saved: {len(products)}  ({PRODUCTS_FILE})")
    print(f"Categories    : {len(categories)}")


if __name__ == "__main__":
    print("=" * 60 + "\nZestoraS RAG INGESTION\n" + "=" * 60)
    print(f"Starting URL: {BASE_URL}")

    pages, products, categories, api_hits, footer = crawl_website()
    if not pages and not products:
        raise RuntimeError("Nothing was collected.")

    print(f"\nPages collected   : {len(pages)}")
    print(f"Products captured : {len(products)}")

    if api_hits:
        print("\nProduct API calls the site makes (use these in backend/.env):")
        for u in sorted(api_hits):
            pr = urlparse(u)
            print(f"  NODE_API_URL={pr.scheme}://{pr.netloc}   PRODUCT_ENDPOINTS={pr.path}")
    else:
        print("\nWARNING: no product API calls were seen. Products will only come from page text.")

    docs = build_documents(pages, products, categories, footer)
    chunks, sources = create_chunks(docs)
    print(f"Total chunks: {len(chunks)}")
    if not chunks:
        raise RuntimeError("No chunks were created.")

    vectors = create_embeddings(chunks)
    save_data(chunks, sources, vectors, products, categories)
    print("\nZestoraS RAG READY")
