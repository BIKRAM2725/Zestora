import React, { useEffect, useRef, useState } from "react";
import {
  FiX,
  FiPhone,
  FiList,
  FiClock,
  FiUser,
  FiSend,
  FiLogOut,
  FiSettings,
  FiChevronRight,
  FiRefreshCw,
} from "react-icons/fi";
import { FaRobot, FaUserCircle } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/UserContext";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";
const RAG_API = process.env.REACT_APP_RAG_API_URL || "http://127.0.0.1:8000";
const WHATSAPP = process.env.REACT_APP_WHATSAPP_NUMBER || "+918337882902";

const GRADIENT_BG = "bg-gradient-to-r from-orange-500 to-red-500";
const BOT_NAME = "ZestBot Assistant";

const WELCOME = {
  type: "bot",
  message:
    "Hi! I'm ZestBot, your Zestoras assistant. I can check your orders, find products and prices, and answer store questions.",
};

const QUICK_CHIPS = [
  "Show my last order",
  "What is the cheapest product?",
  "How do I return an item?",
  "Shipping and delivery info",
];

const EMPTY_RETURN = {
  open: false,
  orderId: null,
  type: "Refund",
  reason: "",
  upi: "",
  submitting: false,
};

const short = (id) => String(id || "").slice(-6);
const authHeader = (token) => (token ? { Authorization: `Bearer ${token}` } : {});
const fmtDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso || "";
  }
};

const apiCancelOrder = async (orderId, token) => {
  try {
    const res = await axios.put(
      `${API_BASE}/api/orders/cancel/${orderId}`,
      {},
      { headers: authHeader(token) },
    );
    return res.data;
  } catch (e) {
    return { success: false, message: e.response?.data?.message || "Cancellation failed." };
  }
};

const apiSubmitReturn = async (orderId, payload, token) => {
  try {
    const res = await axios.post(`${API_BASE}/api/orders/return/${orderId}`, payload, {
      headers: authHeader(token),
    });
    return res.data;
  } catch (e) {
    return { success: false, message: e.response?.data?.message || "Submission failed." };
  }
};

/* ---------- small UI pieces ---------- */

const BotIcon = ({ className = "w-6 h-6", colorClass = "text-white" }) => (
  <FaRobot className={`${className} ${colorClass}`} />
);

const RichText = ({ text }) =>
  String(text || "")
    .split(/(\*\*[^*]+\*\*)/g)
    .map((p, i) =>
      p.startsWith("**") && p.endsWith("**") ? (
        <strong key={i}>{p.slice(2, -2)}</strong>
      ) : (
        <span key={i}>{p}</span>
      ),
    );

const BotReply = ({ children }) => (
  <div className="flex items-start gap-2 mb-2">
    <div className="w-7 h-7 shrink-0 rounded-full bg-white border border-orange-200 flex items-center justify-center">
      <BotIcon className="w-4 h-4" colorClass="text-orange-600" />
    </div>
    <div className="px-3 py-2 rounded-2xl rounded-tl-sm bg-white border border-gray-200 text-gray-800 text-sm max-w-[85%] whitespace-pre-wrap shadow-sm">
      {children}
    </div>
  </div>
);

const UserMessage = ({ children }) => (
  <div className="flex justify-end mb-3">
    <div className={`px-3 py-2 rounded-2xl rounded-br-sm ${GRADIENT_BG} text-white text-sm max-w-[85%] whitespace-pre-wrap`}>
      {children}
    </div>
  </div>
);

const TypingDots = () => (
  <div className="flex gap-1 py-1" aria-label="ZestBot is typing">
    {[0, 150, 300].map((d) => (
      <span
        key={d}
        className="w-2 h-2 rounded-full bg-orange-400 animate-bounce"
        style={{ animationDelay: `${d}ms` }}
      />
    ))}
  </div>
);

const ChatBubble = ({ children, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200 text-left text-sm font-medium hover:bg-orange-50 transition shadow-sm w-full"
  >
    {children}
    <FiChevronRight className="ml-auto text-gray-400" />
  </button>
);

const statusColor = (s = "") => {
  const v = s.toLowerCase();
  if (v.includes("deliver")) return "bg-green-100 text-green-700";
  if (v.includes("cancel")) return "bg-red-100 text-red-700";
  if (v.includes("ship") || v.includes("process") || v.includes("accept"))
    return "bg-blue-100 text-blue-700";
  return "bg-gray-100 text-gray-600";
};

const OrderCard = ({ o, onCancel, onReturn }) => {
  const [confirming, setConfirming] = useState(false);
  const canCancel = ["Pending", "Accepted"].includes(o.status);
  const canReturn = o.status === "Delivered" && !o.returnStatus;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 text-sm ml-9">
      <div className="flex justify-between items-start gap-2">
        <div>
          <div className="font-semibold text-gray-800">Order #{short(o.id)}</div>
          <div className="text-xs text-gray-400">{fmtDate(o.date)}</div>
        </div>
        <div className="text-right">
          <div className="font-semibold">{o.total != null ? `\u20b9${o.total}` : ""}</div>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${statusColor(o.status)}`}>
            {o.status}
          </span>
        </div>
      </div>

      {o.items?.length > 0 && (
        <div className="mt-2 text-xs text-gray-500 line-clamp-2">{o.items.join(", ")}</div>
      )}

      {o.returnStatus && (
        <div className="mt-2 text-xs p-2 rounded bg-yellow-50 border border-yellow-200 text-gray-700">
          Return: <span className="font-medium">{o.returnStatus}</span>
          {o.returnType ? ` (${o.returnType})` : ""}
        </div>
      )}

      {(canCancel || canReturn) && (
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          {canCancel && !confirming && (
            <button
              onClick={() => setConfirming(true)}
              className="text-xs px-3 py-1 rounded-full border border-red-300 text-red-600 hover:bg-red-50"
            >
              Cancel order
            </button>
          )}
          {canCancel && confirming && (
            <div className="flex items-center gap-2 text-xs bg-red-50 border border-red-200 rounded-full px-3 py-1">
              Cancel this order?
              <button
                onClick={() => {
                  setConfirming(false);
                  onCancel(o.id);
                }}
                className="px-2 py-0.5 bg-red-500 text-white rounded-full"
              >
                Yes
              </button>
              <button onClick={() => setConfirming(false)} className="px-2 py-0.5 border rounded-full">
                No
              </button>
            </div>
          )}
          {canReturn && (
            <button
              onClick={() => onReturn(o.id)}
              className="text-xs px-3 py-1 rounded-full border border-yellow-400 text-yellow-700 hover:bg-yellow-50"
            >
              Request refund
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const ProductCard = ({ p, onOpen }) => (
  <button
    onClick={() => onOpen(p.path)}
    className="flex items-center gap-3 p-2 bg-white border border-gray-200 rounded-xl shadow-sm hover:bg-orange-50 transition text-left w-full"
  >
    {p.image ? (
      <img src={p.image} alt={p.name} className="w-12 h-12 rounded-lg object-cover bg-gray-100" />
    ) : (
      <div className="w-12 h-12 rounded-lg bg-orange-100" />
    )}
    <div className="min-w-0">
      <div className="text-sm font-medium text-gray-800 truncate">{p.name}</div>
      <div className="text-sm font-semibold text-orange-600">{"\u20b9"}{p.price}</div>
    </div>
    <FiChevronRight className="ml-auto text-gray-400 shrink-0" />
  </button>
);

/* ---------- main component ---------- */

export default function Chatbot() {
  const [open, setOpen] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("chatbot_open")) || false;
    } catch {
      return false;
    }
  });
  const [history, setHistory] = useState([WELCOME]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [returnPanel, setReturnPanel] = useState(EMPTY_RETURN);

  const [auth, setAuth] = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // Admins never use the chatbot with their privileges: no token is ever sent.
  const isAdmin = auth?.user?.role === "admin";
  const authToken = isAdmin ? "" : auth?.token;
  const bodyRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [history, returnPanel.open]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggle = () =>
    setOpen((v) => {
      const next = !v;
      try {
        localStorage.setItem("chatbot_open", JSON.stringify(next));
      } catch {}
      return next;
    });

  const say = (msg) => setHistory((h) => [...h, { type: "bot", ...msg }]);
  const go = (path) => {
    // The bot never sends people to admin or order-tracking pages.
    if (/^\/(admin|track)/i.test(String(path))) return;
    navigate(path);
    setOpen(false);
  };
  const resetChat = () => {
    setHistory([WELCOME]);
    setReturnPanel(EMPTY_RETURN);
  };

  const patchOrder = (id, patch) =>
    setHistory((h) =>
      h.map((m) =>
        m.cards?.type === "orders"
          ? {
              ...m,
              cards: {
                ...m.cards,
                items: m.cards.items.map((o) => (o.id === id ? { ...o, ...patch } : o)),
              },
            }
          : m,
      ),
    );

  const openWhatsApp = () => {
    const text = encodeURIComponent("Hello Zestoras! I need help.");
    window.open(`https://wa.me/${WHATSAPP.replace(/^\+/, "")}?text=${text}`, "_blank");
  };

  const runAction = (a) => {
    if (a.type === "navigate") go(a.path);
    if (a.type === "whatsapp") openWhatsApp();
  };

  /* ----- the agent: every free-text message goes through the backend ----- */
  const askAgent = async (raw) => {
    const question = String(raw || "").trim();
    if (!question || busy) return;

    const past = history
      .filter((m) => !m.loading && m.message)
      .slice(-6)
      .map((m) => ({ role: m.type === "user" ? "user" : "assistant", content: m.message }));

    setHistory((h) => [...h, { type: "user", message: question }, { type: "bot", loading: true }]);
    setInput("");
    setBusy(true);

    const finish = (msg) =>
      setHistory((h) => {
        const u = [...h];
        for (let i = u.length - 1; i >= 0; i--) {
          if (u[i].loading) {
            u[i] = { type: "bot", ...msg };
            break;
          }
        }
        return u;
      });

    try {
      const { data } = await axios.post(
        `${RAG_API}/chat`,
        { question, history: past, admin_session: isAdmin },
        { timeout: 60000, headers: authHeader(authToken) },
      );
      finish({
        message: data?.answer || "I couldn't find that. Could you rephrase?",
        cards: data?.cards || null,
        actions: data?.actions || [],
      });
    } catch (err) {
      console.error("ZestBot error:", err);
      finish({ message: "I can't reach ZestBot right now. Please try again in a moment." });
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      askAgent(input);
    }
  };

  /* ----- order actions ----- */
  const cancelOrder = async (orderId) => {
    if (isAdmin) return;
    const res = await apiCancelOrder(orderId, authToken);
    if (res?.success) {
      patchOrder(orderId, { status: "Cancelled" });
      say({ message: `Order #${short(orderId)} was cancelled.` });
    } else {
      say({ message: res?.message || `I couldn't cancel order #${short(orderId)}.` });
    }
  };

  const openReturnPanel = (orderId) => setReturnPanel({ ...EMPTY_RETURN, open: true, orderId });

  const submitReturn = async () => {
    const { orderId, type, reason, upi } = returnPanel;
    if (!reason || (type === "Refund" && !upi)) {
      say({ message: "Please fill in the reason (and UPI ID for refunds) before submitting." });
      return;
    }
    setReturnPanel((r) => ({ ...r, submitting: true }));
    const res = await apiSubmitReturn(orderId, { type: "Refund", reason, upi }, authToken);
    if (res?.success) {
      patchOrder(orderId, { returnStatus: "Requested", returnType: type });
      say({ message: `${type} request for order #${short(orderId)} was submitted.` });
      setReturnPanel(EMPTY_RETURN);
    } else {
      say({ message: res?.message || `I couldn't submit the request for order #${short(orderId)}.` });
      setReturnPanel((r) => ({ ...r, submitting: false }));
    }
  };

  /* ----- categories ----- */
  const loadCategories = async () => {
    setHistory((h) => [...h, { type: "user", message: "Browse categories" }]);
    try {
      const res = await axios.get(`${API_BASE}/api/category/get-category`);
      const cats = res.data?.categories || res.data?.data || res.data || [];
      say({
        message: "Which category are you interested in?",
        cards: { type: "categories", items: Array.isArray(cats) ? cats : [] },
      });
    } catch {
      say({ message: "I couldn't load the categories right now. Try the main website." });
    }
  };

  const openCategory = async (cat) => {
    setHistory((h) => [...h, { type: "user", message: cat.name }]);
    let subs = cat.subcategories || [];
    if (!subs.length) {
      try {
        const res = await axios.get(`${API_BASE}/api/category/${cat._id}`);
        subs = res.data?.subcategories || res.data?.children || [];
      } catch {}
    }
    if (subs.length) {
      say({
        message: `Here are the topics in ${cat.name}:`,
        cards: { type: "subcategories", items: subs, parent: cat },
      });
    } else {
      say({ message: `Opening ${cat.name}...` });
      go(`/category/${cat._id}`);
    }
  };

  const openSub = (sub, parent) => {
    const id = sub._id || sub.id || sub.categoryId;
    setHistory((h) => [...h, { type: "user", message: sub.name }]);
    say({ message: `Opening ${sub.name}...` });
    go(id ? `/category/${id}` : sub.link || `/category/${parent?._id}`);
  };

  /* ----- account ----- */
  const showAccount = () => {
    setHistory((h) => [...h, { type: "user", message: auth?.user ? "My account" : "Log in" }]);
    if (!auth?.user) {
      say({
        message: "You're not logged in yet.",
        actions: [{ type: "navigate", label: "Log in", path: "/login" }],
      });
    } else {
      say({ message: "Here's your account.", cards: { type: "account" } });
    }
  };

  const logout = () => {
    setAuth({ user: null, token: "" });
    localStorage.removeItem("auth");
    resetChat();
    go("/");
  };

  /* ----- card renderer ----- */
  const renderCards = (cards) => {
    if (!cards) return null;

    if (cards.type === "orders")
      return (
        <div className="space-y-2 mb-3">
          {cards.items.map((o) => (
            <OrderCard key={o.id} o={o} onCancel={cancelOrder} onReturn={openReturnPanel} />
          ))}
          <button
            onClick={() => go("/user/orders")}
            className="ml-9 text-xs text-orange-600 hover:underline"
          >
            View all orders
          </button>
        </div>
      );

    if (cards.type === "products")
      return (
        <div className="space-y-2 mb-3 ml-9">
          {cards.items.map((p) => (
            <ProductCard key={p.id} p={p} onOpen={go} />
          ))}
        </div>
      );

    if (cards.type === "categories")
      return (
        <div className="grid grid-cols-2 gap-2 mb-3 ml-9">
          {cards.items.map((c) => (
            <button
              key={c._id || c.id || c.name}
              onClick={() => openCategory(c)}
              className="p-3 bg-white border border-gray-200 rounded-xl shadow-sm text-sm font-medium hover:bg-orange-50 transition"
            >
              {c.name}
            </button>
          ))}
        </div>
      );

    if (cards.type === "subcategories")
      return (
        <div className="space-y-2 mb-3 ml-9">
          {cards.items.map((s) => (
            <ChatBubble key={s._id || s.id || s.name} onClick={() => openSub(s, cards.parent)}>
              {s.name || s}
            </ChatBubble>
          ))}
        </div>
      );

    if (cards.type === "account")
      return (
        <div className="mb-3 ml-9 space-y-2">
          <div className="flex items-center gap-3 p-3 bg-white rounded-xl border shadow-sm">
            <FaUserCircle className="text-3xl text-orange-600" />
            <div className="min-w-0">
              <div className="font-semibold text-gray-800 truncate">{auth?.user?.name || "Guest"}</div>
              <div className="text-xs text-gray-500 truncate">{auth?.user?.email}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => go("/user")}
              className="p-2 bg-white border rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-orange-50"
            >
              <FiSettings size={14} /> Profile
            </button>
            <button
              onClick={() => go("/subscriptions")}
              className="p-2 bg-white border rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-orange-50"
            >
              <FiList size={14} /> Subscriptions
            </button>
            <button
              onClick={logout}
              className="col-span-2 p-2 bg-red-500 text-white rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-red-600"
            >
              <FiLogOut size={14} /> Log out
            </button>
          </div>
        </div>
      );

    return null;
  };

  const quickBtn = "flex flex-col items-center gap-0.5 hover:text-orange-600 transition";

  // The chatbot does not exist inside the admin area.
  if (pathname.startsWith("/admin")) return null;

  return (
    <>
      <div className="fixed right-5 bottom-6 z-50">
        <button
          onClick={toggle}
          aria-expanded={open}
          aria-label={open ? "Close chat" : "Open chat"}
          className={`${GRADIENT_BG} text-white p-4 rounded-full shadow-xl flex items-center justify-center border-4 border-white transition-transform duration-300 hover:scale-105`}
        >
          {open ? <FiX size={24} /> : <BotIcon />}
        </button>
      </div>

      {/* Fixed size: the panel never grows or shrinks with its content. */}
      <div
        id="chatbot-panel"
        role="dialog"
        aria-label={BOT_NAME}
        className={`fixed right-2 sm:right-5 bottom-[98px] z-50 w-[94vw] sm:w-[380px] h-[600px] max-h-[calc(100vh-120px)] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
          open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <div className={`flex items-center gap-3 p-4 ${GRADIENT_BG} text-white shrink-0`}>
          <div className="bg-white rounded-full p-2">
            <BotIcon colorClass="text-orange-600" />
          </div>
          <div>
            <div className="font-bold text-lg leading-tight">{BOT_NAME}</div>
            <div className="text-xs opacity-90 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-300" /> Online
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={resetChat}
              aria-label="Start new chat"
              title="New chat"
              className="p-1.5 rounded-full hover:bg-white/20 transition"
            >
              <FiRefreshCw size={16} />
            </button>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="p-1.5 rounded-full hover:bg-white/20 transition"
            >
              <FiX size={20} />
            </button>
          </div>
        </div>

        <div ref={bodyRef} className="flex-1 min-h-0 overflow-y-auto bg-gray-50 p-4">
          {history.map((m, i) =>
            m.type === "user" ? (
              <UserMessage key={i}>{m.message}</UserMessage>
            ) : (
              <div key={i}>
                <BotReply>{m.loading ? <TypingDots /> : <RichText text={m.message} />}</BotReply>
                {renderCards(m.cards)}
                {m.actions?.length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-3 ml-9">
                    {m.actions.map((a, j) => (
                      <button
                        key={j}
                        onClick={() => runAction(a)}
                        className={`text-sm px-4 py-1.5 rounded-full text-white ${GRADIENT_BG} hover:opacity-90`}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ),
          )}

          {history.length === 1 && (
            <div className="flex flex-wrap gap-2 ml-9">
              {QUICK_CHIPS.map((c) => (
                <button
                  key={c}
                  onClick={() => askAgent(c)}
                  className="text-xs px-3 py-1.5 rounded-full border border-orange-300 text-orange-700 bg-white hover:bg-orange-50 transition"
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        {returnPanel.open && (
          <div className="shrink-0 border-t bg-white p-3 max-h-[45%] overflow-y-auto">
            <div className="text-sm font-medium mb-2">
              Refund request for order #{short(returnPanel.orderId)}
            </div>
            <div className="text-xs text-gray-500 mb-2">Refunds are sent to your UPI ID.</div>
            <textarea
              placeholder="Reason"
              value={returnPanel.reason}
              onChange={(e) => setReturnPanel((r) => ({ ...r, reason: e.target.value }))}
              className="border p-2 rounded w-full mb-2 text-sm"
              rows="2"
            />
            {returnPanel.type === "Refund" && (
              <input
                placeholder="UPI ID (for refund)"
                value={returnPanel.upi}
                onChange={(e) => setReturnPanel((r) => ({ ...r, upi: e.target.value }))}
                className="border p-2 rounded w-full mb-2 text-sm"
              />
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setReturnPanel(EMPTY_RETURN)}
                className="px-3 py-1 rounded border text-sm"
              >
                Close
              </button>
              <button
                onClick={submitReturn}
                disabled={returnPanel.submitting}
                className="px-3 py-1 rounded bg-yellow-500 text-white text-sm disabled:opacity-60"
              >
                {returnPanel.submitting ? "Submitting..." : "Submit request"}
              </button>
            </div>
          </div>
        )}

        <div className="border-t bg-white shrink-0">
          <div className="pt-2 px-3 text-xs text-gray-500 flex justify-around">
            <button
              className={quickBtn}
              onClick={() => {
                setHistory((h) => [...h, { type: "user", message: "Contact / WhatsApp" }]);
                say({ message: "Opening WhatsApp. We're ready to chat!" });
                openWhatsApp();
              }}
            >
              <FiPhone size={16} />
              <span>Contact</span>
            </button>
            <button className={quickBtn} onClick={() => askAgent("Show my last 5 orders")}>
              <FiClock size={16} />
              <span>Orders</span>
            </button>
            <button className={quickBtn} onClick={loadCategories}>
              <FiList size={16} />
              <span>Categories</span>
            </button>
            <button className={quickBtn} onClick={showAccount}>
              <FiUser size={16} />
              <span>{auth?.user ? "Account" : "Login"}</span>
            </button>
          </div>

          <div className="flex items-center p-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask about orders, products, delivery..."
              className="flex-grow p-2 px-4 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white placeholder-gray-500"
            />
            <button
              onClick={() => askAgent(input)}
              disabled={!input.trim() || busy}
              aria-label="Send message"
              className={`ml-2 p-2.5 rounded-full ${GRADIENT_BG} text-white transition ${
                !input.trim() || busy ? "opacity-50 cursor-not-allowed" : "hover:scale-105"
              }`}
            >
              <FiSend size={18} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
