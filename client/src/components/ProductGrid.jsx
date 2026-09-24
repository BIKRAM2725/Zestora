import React, { useMemo, useState } from "react";
import ProductCard, { ProductCardSkeleton } from "./ProductCard";

const PAGE_SIZE = 10;
const categoryId = (post) => String(post.category?._id || post.category);

export default function ProductGrid({ categories, posts, loading }) {
  const [active, setActive] = useState("all");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const chips = useMemo(
    () => categories.filter((cat) => posts.some((p) => categoryId(p) === cat._id)),
    [categories, posts]
  );

  const filtered = useMemo(
    () => (active === "all" ? posts : posts.filter((p) => categoryId(p) === active)),
    [posts, active]
  );

  const select = (id) => {
    setActive(id);
    setVisible(PAGE_SIZE);
  };

  const chipClass = (on) =>
    `flex-none rounded-full border px-4 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
      on
        ? "border-slate-900 bg-slate-900 text-white"
        : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
    }`;

  return (
    <section className="mx-auto max-w-[1200px]">
      <div className="bg-white px-4 py-4 sm:rounded-lg sm:px-5">
        <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">Products for you</h2>
        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
          <button onClick={() => select("all")} className={chipClass(active === "all")}>
            All
          </button>
          {chips.map((cat) => (
            <button
              key={cat._id}
              onClick={() => select(cat._id)}
              className={chipClass(active === cat._id)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 px-3 sm:grid-cols-3 sm:gap-4 sm:px-0 md:grid-cols-4 xl:grid-cols-5">
        {loading
          ? Array.from({ length: 10 }).map((_, i) => <ProductCardSkeleton key={i} />)
          : filtered.slice(0, visible).map((post) => <ProductCard key={post._id} post={post} />)}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="mx-3 mt-3 rounded-lg bg-white py-14 text-center text-slate-500 sm:mx-0">
          No products in this category yet.
        </div>
      )}

      {!loading && visible < filtered.length && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="rounded-full border border-slate-300 bg-white px-8 py-2.5 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            Load more
          </button>
        </div>
      )}
    </section>
  );
}