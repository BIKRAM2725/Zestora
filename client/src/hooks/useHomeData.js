// src/hooks/useHomeData.js
import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

// Data younger than this is shown as-is with no request at all.
const TTL_MS = 60 * 1000;

// Module-level cache: survives HomePage unmounting/remounting while the app stays open.
// (A full browser refresh resets it, which is expected.)
const cache = { categories: null, posts: null, fetchedAt: 0 };

// Shared in-flight request, so two mounts at once (e.g. StrictMode in dev) make one request.
let inflight = null;

/** Call after creating/editing/deleting a post or category so Home refetches next time. */
export function invalidateHomeData() {
  cache.fetchedAt = 0;
}

function fetchHomeData() {
  if (inflight) return inflight;

  inflight = Promise.allSettled([
    axios.get(`${API_URL}/api/category/get-category`),
    axios.get(`${API_URL}/api/post/get-all-posts`),
  ])
    .then(([cat, post]) => {
      let catOk = false;
      let postOk = false;

      if (cat.status === "fulfilled" && cat.value.data.success) {
        cache.categories = cat.value.data.categories || [];
        catOk = true;
      }
      if (post.status === "fulfilled" && post.value.data.success) {
        cache.posts = post.value.data.posts || [];
        postOk = true;
      }

      // Only mark as fresh if BOTH succeeded; otherwise retry on the next mount.
      // Failed parts keep whatever was cached before.
      if (catOk && postOk) cache.fetchedAt = Date.now();
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export default function useHomeData() {
  // Start from the cache: on a return visit there is no empty state and no skeleton.
  const [data, setData] = useState({
    categories: cache.categories || [],
    posts: cache.posts || [],
  });
  const [loading, setLoading] = useState(!cache.categories && !cache.posts);

  useEffect(() => {
    let active = true;

    const isFresh = Date.now() - cache.fetchedAt < TTL_MS;
    if (isFresh) {
      setLoading(false);
      return undefined;
    }

    // Stale or empty: fetch. If cached data exists it stays on screen meanwhile.
    fetchHomeData().then(() => {
      if (!active) return;
      setData({
        categories: cache.categories || [],
        posts: cache.posts || [],
      });
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  return { categories: data.categories, posts: data.posts, loading };
}