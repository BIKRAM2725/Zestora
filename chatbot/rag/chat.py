
import base64
import json
import math
import os
import re
import time
from urllib.parse import urlparse

import faiss
import numpy as np
import requests
from dotenv import load_dotenv
from google import genai
from groq import Groq

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY is missing from .env")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is missing from .env (needed for embeddings)")

groq_client = Groq(api_key=GROQ_API_KEY)
gemini = genai.Client(api_key=GEMINI_API_KEY)

FAST_MODEL = os.getenv("GROQ_FAST_MODEL", "openai/gpt-oss-20b")
SMART_MODEL = os.getenv("GROQ_SMART_MODEL", "openai/gpt-oss-120b")

NODE_API = os.getenv("NODE_API_URL", "http://localhost:5000").rstrip("/")
# Tried in order until one returns a list of products. Set PRODUCT_ENDPOINTS in .env
# to your real "get all products" route to skip the guessing.
PRODUCT_ENDPOINTS = [
    e.strip()
    for e in os.getenv(
        "PRODUCT_ENDPOINTS",
        "/api/post/get-post,/api/post/get-posts,/api/post/all,/api/post/get-all,"
        "/api/post/all-posts,/api/post/get-products,/api/post/list,/api/post",
    ).split(",")
    if e.strip()
]
CATEGORY_ENDPOINT = os.getenv("CATEGORY_ENDPOINT", "/api/category/get-category")
PRODUCT_PATH_TEMPLATE = os.getenv("PRODUCT_PATH_TEMPLATE", "/product/{slug}")

INDEX_PATH = "data/hotcolours.index"
CHUNKS_PATH = "data/hotcolours_chunks.txt"
SOURCES_PATH = "data/hotcolours_sources.txt"

index = faiss.read_index(INDEX_PATH)
with open(CHUNKS_PATH, "r", encoding="utf-8") as f:
    chunks = f.read().split("\n---CHUNK---\n")
sources = []
if os.path.exists(SOURCES_PATH):
    with open(SOURCES_PATH, "r", encoding="utf-8") as f:
        sources = [line.strip() for line in f if line.strip()]

# --------------------------------------------------------------------------- #
# Security layer
# --------------------------------------------------------------------------- #
PUBLIC_PATHS = set(PRODUCT_ENDPOINTS) | {CATEGORY_ENDPOINT}
BLOCKED_PATH = re.compile(
    r"/admin|/track|return-orders|/payment|/status/|delivery-token|send-otp|verify-payment|resend-otp|/public/|/deliver",
    re.I,
)
BLOCKED_SOURCE_PREFIXES = ("/admin", "/user", "/track")
# Pages the bot may never link to or send the user to.
BLOCKED_NAV_PREFIXES = ("/admin", "/track")

RESTRICTED_RE = re.compile(
    r"\b(admin|administrator|admin panel|"
    r"all (the )?(users|customers|orders)|every ?one'?s orders|"
    r"other (user|customer|person|people)(?:'?s)?'?\s*(orders?|data|details|address|info|account)|"
    r"someone else'?s orders?|total (sales|revenue)|revenue|"
    r"delivery token|generate (a )?token|update (the )?order status|mark (it |order )?(as )?delivered|"
    r"approve (the )?(return|refund)|payment details of|user list|jwt|password of)\b",
    re.I,
)

REFUSAL = (
    "I can't help with admin functions or other customers' information. "
    "I can help with your own orders and cart, products, and store questions."
)


def is_allowed(path, uid=None):
    """Deny by default."""
    if BLOCKED_PATH.search(path):
        return False
    if path in PUBLIC_PATHS:
        return True
    if uid and path in (f"/api/orders/user/{uid}", f"/api/cart/{uid}"):
        return True
    return False


def uid_from_token(token):
    """User id from the JWT payload. The Node API verifies the signature on every
    call, so a forged token still fails there; we simply never trust a body field."""
    try:
        payload = token.split(".")[1]
        payload += "=" * (-len(payload) % 4)
        data = json.loads(base64.urlsafe_b64decode(payload))
        return str(data.get("id") or data.get("_id") or "") or None
    except Exception:
        return None


def node_get(path, token=None, uid=None):
    if not is_allowed(path, uid):
        raise PermissionError(f"Blocked path: {path}")
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    r = requests.get(f"{NODE_API}{path}", headers=headers, timeout=15)
    r.raise_for_status()
    return r.json()


# --------------------------------------------------------------------------- #
# LLM helper
# --------------------------------------------------------------------------- #
SYSTEM = (
    "You are HotBot, the friendly assistant of HotColours, an online store. "
    "Be concise (max 4 short sentences), warm and clear. You may use **bold** for key values. "
    "Use ONLY the data provided in the message; never invent orders, prices, stock or policies. "
    "Prices are in Indian rupees (\u20b9). Never mention tools, APIs, context, embeddings or databases. "
    "Never output URLs or 'Source' lines. You serve customers only: never discuss admin features, "
    "other customers' data, or internal systems; politely decline if asked."
)


def llm(messages, model=SMART_MODEL, json_mode=False, temperature=0.3, max_tokens=1200):
    kwargs = dict(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
        reasoning_effort="low",
    )
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    last = None
    for attempt in range(3):
        try:
            r = groq_client.chat.completions.create(**kwargs)
            text = (r.choices[0].message.content or "").strip()
            if text:
                return text
            raise RuntimeError("Empty response from model")
        except Exception as e:
            last = e
            print(f"GROQ ERROR ({kwargs['model']}) attempt {attempt + 1}: {e}")
            if "model_not_found" in str(e) or "404" in str(e):
                if kwargs["model"] != FAST_MODEL:
                    kwargs["model"] = FAST_MODEL
                    continue
                break
            if attempt == 1 and kwargs["model"] != FAST_MODEL:
                kwargs["model"] = FAST_MODEL
            time.sleep(1.5 * (attempt + 1))
    raise last


def clean(text):
    return re.sub(r"\n*\s*Source:.*$", "", text, flags=re.I | re.S).strip()


# --------------------------------------------------------------------------- #
# Step 1: rewrite + route
# --------------------------------------------------------------------------- #
PLANNER = """You are the planner for HotBot, the assistant of HotColours (an online store).
Read the chat history and the latest user message, then return JSON only:
{
  "rewritten": "the latest message as a clear standalone English question. Fix typos and resolve words like 'it', 'that order', 'the same'",
  "intent": "greeting | order_lookup | cancel_or_return | cart | product_search | site_info | restricted | other",
  "params": {}
}
Intent rules:
- order_lookup: asks about THEIR OWN orders, status, tracking, last/recent/all of their orders. params: {"which": "last" | "all"}
- cancel_or_return: wants to cancel an order or get a refund. params: {}
- cart: asks what is in THEIR cart / cart total. params: {}
- product_search: products, prices, cheapest/lowest/highest, stock, details, features of a product or category. params: {"keyword": "" or product/category words, "sort": "price_asc" | "price_desc" | "none", "max_price": number or null, "limit": 1-6}
  ("cheapest product" -> keyword "", sort price_asc, limit 3)
- site_info: policies, shipping, delivery time, payment methods, contact, how-to, general store questions.
- restricted: anything about admin features/panel, other customers' data, all orders of the store, sales/revenue, payments of others, OTPs, delivery tokens, changing order status, approving refunds.
- greeting: hi/hello/thanks/bye/smalltalk.
- other: anything else."""


def plan(question, history):
    convo = "\n".join(f"{h['role']}: {h['content']}" for h in history)
    try:
        raw = llm(
            [
                {"role": "system", "content": PLANNER},
                {"role": "user", "content": f"Chat history:\n{convo or '(none)'}\n\nLatest message: {question}"},
            ],
            model=FAST_MODEL,
            json_mode=True,
            temperature=0,
            max_tokens=800,
        )
        data = json.loads(raw)
        return {
            "rewritten": data.get("rewritten") or question,
            "intent": data.get("intent") or "site_info",
            "params": data.get("params") or {},
        }
    except Exception as e:
        print("PLAN ERROR:", e)
        return {"rewritten": question, "intent": "site_info", "params": {}}


# --------------------------------------------------------------------------- #
# Tools (all read-only)
# --------------------------------------------------------------------------- #
_cache = {}


def cached(key, ttl, fn):
    hit = _cache.get(key)
    if hit and time.time() - hit[0] < ttl:
        return hit[1]
    val = fn()
    _cache[key] = (time.time(), val)
    return val


def extract_list(data, *keys):
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for k in (*keys, "data", "items", "results"):
            if isinstance(data.get(k), list):
                return data[k]
    return []


# ---- catalogue (public) ---- #
def _load_products():
    for ep in PRODUCT_ENDPOINTS:
        try:
            items = extract_list(node_get(ep), "posts", "products", "post")
            if items:
                return items
        except Exception as e:
            print(f"PRODUCT ENDPOINT {ep} failed: {e}")
    return []


def get_products():
    return cached("products", 60, _load_products)


def get_categories():
    def load():
        try:
            return extract_list(node_get(CATEGORY_ENDPOINT), "categories")
        except Exception as e:
            print("CATEGORY ERROR:", e)
            return []

    return cached("categories", 300, load)


def price_of(p):
    try:
        return float(p.get("price"))
    except (TypeError, ValueError):
        return None


def category_id(p):
    c = p.get("category")
    return str(c.get("_id") if isinstance(c, dict) else c)


def in_stock(p):
    return bool(p.get("isAvailable", True)) and (p.get("stock") or 0) > 0


def slim_product(p, cats):
    slug = p.get("slug") or p.get("_id")
    images = p.get("images") or []
    return {
        "id": str(p.get("_id") or slug),
        "name": p.get("title"),
        "price": price_of(p),
        "path": PRODUCT_PATH_TEMPLATE.format(slug=slug),
        "image": images[0] if images and str(images[0]).startswith("http") else None,
        "category": cats.get(category_id(p), ""),
        "inStock": in_stock(p),
        "stock": p.get("stock"),
        "facilities": (p.get("facilities") or [])[:6],
        "description": (p.get("description") or "")[:300],
    }


STOP = set(
    "the a an of for in on at to is are was be do does did can could would you your my me i we show tell find "
    "give get any some what which who how why where when please about product products item items under below "
    "above over less more than price prices cost cheap cheapest lowest highest expensive available have has "
    "with and or it this that there here list all".split()
)


def search_products(params):
    products = get_products()
    cats = {str(c.get("_id")): (c.get("name") or "") for c in get_categories()}
    words = [
        w for w in re.findall(r"\w+", (params.get("keyword") or "").lower()) if w not in STOP and len(w) > 1
    ]

    if words:
        need = 1 if len(words) <= 2 else math.ceil(len(words) / 2)
        scored = []
        for p in products:
            hay = " ".join(
                [
                    str(p.get("title", "")),
                    str(p.get("description", "")),
                    " ".join(p.get("facilities") or []),
                    cats.get(category_id(p), ""),
                ]
            ).lower()
            s = sum(1 for w in words if w in hay)
            if s >= need:
                scored.append((s, p))
        products = [p for _, p in sorted(scored, key=lambda x: -x[0])]

    products = [p for p in products if price_of(p) is not None]
    available = [p for p in products if in_stock(p)]
    products = available or products

    max_price = params.get("max_price")
    if isinstance(max_price, (int, float)):
        products = [p for p in products if price_of(p) <= max_price]

    if params.get("sort") == "price_asc":
        products.sort(key=price_of)
    elif params.get("sort") == "price_desc":
        products.sort(key=price_of, reverse=True)

    try:
        limit = max(1, min(int(params.get("limit") or 3), 6))
    except (TypeError, ValueError):
        limit = 3
    return [slim_product(p, cats) for p in products[:limit]]


# ---- the signed-in customer's own data ---- #
def item_line(it):
    p = it.get("product") if isinstance(it, dict) else None
    title = (p or {}).get("title") or (p or {}).get("name") or "Product"
    return f"{title} x{it.get('quantity', 1)}"


def slim_order(o):
    """Safe subset only: no address, phone, OTP, payment or delivery-token data."""
    rr = o.get("returnRefund") or {}
    rr_status = rr.get("status")
    if rr_status == "Not Requested":
        rr_status = None
    return {
        "id": str(o.get("_id") or o.get("id") or ""),
        "status": o.get("status") or "Pending",
        "total": o.get("total"),
        "date": o.get("createdAt"),
        "paymentMethod": o.get("paymentMethod"),
        "items": [item_line(i) for i in (o.get("items") or [])[:4]],
        "returnStatus": rr_status,
        "returnType": rr.get("requestType") if rr_status else None,
    }


def fetch_orders(uid, token):
    data = node_get(f"/api/orders/user/{uid}", token=token, uid=uid)
    orders = extract_list(data, "orders")
    orders.sort(key=lambda o: o.get("createdAt") or "", reverse=True)
    return orders


def fetch_cart(uid, token):
    data = node_get(f"/api/cart/{uid}", token=token, uid=uid)
    cart = data.get("cart") or {}
    items, total = [], 0
    for it in cart.get("items") or []:
        p = it.get("product") or {}
        price, qty = p.get("price") or 0, it.get("quantity") or 1
        items.append({"name": p.get("title"), "price": price, "quantity": qty})
        total += price * qty
    return items, total


# ---- website knowledge (RAG) ---- #
def source_ok(i):
    if i >= len(sources):
        return True
    return not urlparse(sources[i]).path.lower().startswith(BLOCKED_SOURCE_PREFIXES)


def retrieve(query, k=6):
    emb = gemini.models.embed_content(model="gemini-embedding-001", contents=query)
    vec = np.array(emb.embeddings[0].values, dtype="float32").reshape(1, -1)
    faiss.normalize_L2(vec)
    _, ids = index.search(vec, min(k * 3, index.ntotal))
    picked = []
    for i in ids[0]:
        if 0 <= i < len(chunks) and source_ok(int(i)):
            picked.append(chunks[i])
            if len(picked) == k:
                break
    return "\n\n".join(picked)


# --------------------------------------------------------------------------- #
# Step 3: answer
# --------------------------------------------------------------------------- #
def compose(question, rewritten, label, data, history, extra=""):
    msgs = [{"role": "system", "content": SYSTEM + extra}]
    msgs += [{"role": h["role"], "content": h["content"]} for h in history[-4:]]
    msgs.append(
        {
            "role": "user",
            "content": f"{label}:\n{data}\n\nUser message: {question}\n(Understood as: {rewritten})",
        }
    )
    return clean(llm(msgs))


def reply(answer, cards=None, actions=None):
    safe = [
        a for a in (actions or [])
        if not str(a.get("path", "")).lower().startswith(BLOCKED_NAV_PREFIXES)
    ]
    return {"answer": answer, "cards": cards, "actions": safe, "sources": []}


LOGIN_ACTION = [{"type": "navigate", "label": "Log in", "path": "/login"}]
WHATSAPP_ACTION = [{"type": "whatsapp", "label": "Chat on WhatsApp"}]
ACCOUNT_INTENTS = ("order_lookup", "cancel_or_return", "cart")


def ask_question(question, history=None, token=None, admin_session=False):
    history = [h for h in (history or []) if h.get("role") in ("user", "assistant")][-6:]

    # Hard pre-filter: no LLM involved.
    if RESTRICTED_RE.search(question):
        return reply(REFUSAL, actions=WHATSAPP_ACTION)

    p = plan(question, history)
    intent, rewritten, params = p["intent"], p["rewritten"], p["params"]
    print(f"INTENT={intent} | REWRITTEN={rewritten} | PARAMS={params}")

    if intent == "restricted" or RESTRICTED_RE.search(rewritten):
        return reply(REFUSAL, actions=WHATSAPP_ACTION)

    if intent == "greeting":
        return reply(
            compose(
                question, rewritten, "Note",
                "The user is greeting or chatting. Reply briefly and offer help with orders, "
                "cart, products or store info.",
                history,
            )
        )

    # ---- the customer's own account data --------------------------------- #
    if intent in ACCOUNT_INTENTS:
        if admin_session:
            return reply(
                "For security, I never access admin accounts. Please use the admin dashboard, "
                "or log in with a customer account to check orders and cart."
            )
        uid = uid_from_token(token) if token else None
        if not uid:
            return reply("Please log in first so I can look up your account.", actions=LOGIN_ACTION)

        if intent == "cart":
            try:
                items, total = fetch_cart(uid, token)
            except Exception as e:
                print("CART ERROR:", e)
                return reply("I couldn't load your cart right now. Please try again in a moment.")
            if not items:
                return reply("Your cart is empty. Want me to suggest some products?")
            answer = compose(
                question, rewritten, "The user's cart (authoritative)",
                json.dumps({"items": items, "total": total}, ensure_ascii=False), history,
            )
            return reply(answer, actions=[{"type": "navigate", "label": "Open cart", "path": "/cart"}])

        try:
            orders = fetch_orders(uid, token)
        except Exception as e:
            print("ORDERS ERROR:", e)
            return reply("I couldn't load your orders right now. Please try again in a moment.")

        if not orders:
            return reply("You don't have any orders yet. Want me to show you some products?")

        if intent == "cancel_or_return":
            items = [slim_order(o) for o in orders[:5]]
            return reply(
                "Here are your recent orders. Use **Cancel order** on Pending/Accepted orders, or "
                "**Request refund** on Delivered ones. I'll ask you to confirm first.",
                cards={"type": "orders", "items": items},
            )

        last_only = params.get("which") == "last"
        items = [slim_order(o) for o in (orders[:1] if last_only else orders[:5])]
        answer = compose(
            question, rewritten, "The user's own order data (authoritative)",
            json.dumps(items, ensure_ascii=False), history,
            extra=" Refer to an order by the last 6 characters of its id.",
        )
        return reply(answer, cards={"type": "orders", "items": items})

    # ---- product catalogue ------------------------------------------------ #
    if intent == "product_search":
        try:
            items = search_products(params)
        except Exception as e:
            print("PRODUCT ERROR:", e)
            items = []
        if items:
            answer = compose(
                question, rewritten, "Matching products from the store (sorted as requested)",
                json.dumps(items, ensure_ascii=False), history,
            )
            return reply(answer, cards={"type": "products", "items": items})

    # ---- website knowledge (RAG) ------------------------------------------ #
    try:
        context = retrieve(rewritten)
    except Exception as e:
        print("RETRIEVE ERROR:", e)
        return reply("Sorry, I couldn't process that right now. Please try again.")

    answer = compose(
        question, rewritten, "HotColours website content", context, history,
        extra=" If the content does not contain the answer, reply exactly: NOT_FOUND",
    )
    if "NOT_FOUND" not in answer:
        return reply(answer)

    # Last chance: maybe the question is about a product after all.
    if intent != "product_search":
        try:
            items = search_products({"keyword": rewritten, "sort": "none", "limit": 3})
        except Exception:
            items = []
        if items:
            answer = compose(
                question, rewritten, "Products that may match",
                json.dumps(items, ensure_ascii=False), history,
            )
            return reply(answer, cards={"type": "products", "items": items})

    return reply(
        "I couldn't find that on our website. Our team can help you directly on WhatsApp.",
        actions=WHATSAPP_ACTION,
    )


# --------------------------------------------------------------------------- #
# Diagnostics (enabled only when DEBUG_ENDPOINTS=true; read-only, no user data)
# --------------------------------------------------------------------------- #
def debug_catalog(q=""):
    q = (q or "").lower().strip()
    out = {"node_api": NODE_API, "product_endpoints": []}
    for ep in PRODUCT_ENDPOINTS:
        try:
            data = node_get(ep)
            items = extract_list(data, "posts", "products", "post")
            out["product_endpoints"].append(
                {
                    "path": ep,
                    "ok": True,
                    "count": len(items),
                    "response_keys": list(data.keys()) if isinstance(data, dict) else "list",
                    "sample_titles": [i.get("title") for i in items[:5]],
                }
            )
        except Exception as e:
            out["product_endpoints"].append({"path": ep, "ok": False, "error": str(e)[:160]})
    out["categories_loaded"] = len(get_categories())
    out["rag_chunks"] = len(chunks)
    out["rag_pages_indexed"] = sorted({urlparse(s).path or "/" for s in sources})[:40]
    if q:
        out["query"] = q
        out["products_matching"] = [
            p.get("title") for p in get_products() if q in str(p.get("title", "")).lower()
        ]
        out["rag_chunks_containing"] = sum(q in c.lower() for c in chunks)
    return out