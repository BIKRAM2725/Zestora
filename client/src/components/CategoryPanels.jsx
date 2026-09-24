import React from "react";
import { Link } from "react-router-dom";

const categoryId = (post) => String(post.category?._id || post.category);

export default function CategoryPanels({ categories, posts, loading }) {
  const panels = categories
    .map((cat) => ({
      cat,
      items: posts.filter((p) => categoryId(p) === cat._id).slice(0, 4),
    }))
    .filter((panel) => panel.items.length > 0)
    .slice(0, 4);

  if (!loading && panels.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1200px] px-3 sm:px-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg bg-white p-4">
                <div className="mb-3 h-5 w-1/2 animate-pulse rounded bg-slate-100" />
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 4 }).map((__, j) => (
                    <div key={j} className="aspect-square animate-pulse rounded bg-slate-100" />
                  ))}
                </div>
              </div>
            ))
          : panels.map(({ cat, items }) => (
              <div key={cat._id} className="flex flex-col rounded-lg bg-white p-4">
                <h2 className="mb-3 truncate text-lg font-semibold text-slate-900">{cat.name}</h2>
                <div className="grid flex-1 grid-cols-2 gap-3">
                  {items.map((post) => (
                    <Link
                      key={post._id}
                      to={`/product/${post.slug}`}
                      className="group block focus:outline-none"
                    >
                      <div className="aspect-square overflow-hidden rounded bg-slate-100">
                        <img
                          src={post.images?.[0] || "/placeholder.jpg"}
                          alt={post.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-600">{post.title}</p>
                    </Link>
                  ))}
                </div>
                <Link
                  to={`/category/${cat._id}`}
                  className="mt-4 text-sm font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
                >
                  See all in {cat.name}
                </Link>
              </div>
            ))}
      </div>
    </section>
  );
}