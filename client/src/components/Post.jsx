import React, { useEffect, useState, useCallback } from "react";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";

const API_URL = process.env.REACT_APP_API_URL;

const getCount = () =>
  typeof window !== "undefined" && window.innerWidth < 768 ? 2 : 4;

export default function PostSlider() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(getCount);
  const navigate = useNavigate();

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/post/get-all-posts`);
      const data = await res.json();
      if (data.success) setPosts(data.posts || []);
    } catch (error) {
      console.error("Error fetching posts:", error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    const onResize = () => setVisibleCount(getCount());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const next = () =>
    setCurrentIndex((i) => (posts.length ? (i + 1) % posts.length : i));
  const previous = () =>
    setCurrentIndex((i) => (posts.length ? (i - 1 + posts.length) % posts.length : i));

  const visiblePosts = Array.from({ length: Math.min(visibleCount, posts.length) }).map(
    (_, i) => posts[(currentIndex + i) % posts.length]
  );

  if (!loading && posts.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1200px] px-4 sm:px-6">
      <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Latest products
          </h2>
          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            Freshly added to the store.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={previous}
            aria-label="Previous products"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <FaArrowLeft size={14} />
          </button>
          <button
            onClick={next}
            aria-label="Next products"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <FaArrowRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
        {loading
          ? Array.from({ length: visibleCount }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
                <div className="aspect-square animate-pulse bg-slate-100" />
                <div className="space-y-2 p-4">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
                  <div className="h-4 w-1/3 animate-pulse rounded bg-slate-100" />
                </div>
              </div>
            ))
          : visiblePosts.map((post) => (
              <button
                key={post._id}
                onClick={() => navigate(`/product/${post.slug}`)}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left transition duration-300 hover:border-slate-300 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                <div className="aspect-square overflow-hidden bg-slate-100">
                  <img
                    src={post.images?.[0] || "/placeholder.jpg"}
                    alt={post.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-3 sm:p-4">
                  <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-medium text-slate-800 sm:text-base">
                    {post.title}
                  </h3>
                  <p className="mt-2 text-base font-semibold text-emerald-700 sm:text-lg">
                    ₹{Number(post.price).toLocaleString("en-IN")}
                  </p>
                </div>
              </button>
            ))}
      </div>
    </section>
  );
}