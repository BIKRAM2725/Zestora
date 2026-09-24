import React from "react";
import { Link } from "react-router-dom";

export default function CategoryStrip({ categories, loading }) {
  if (!loading && categories.length === 0) return null;

  return (
    <nav aria-label="Categories" className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-[1200px] gap-4 overflow-x-auto px-4 py-3 [scrollbar-width:none] sm:justify-center sm:gap-8 sm:px-6 [&::-webkit-scrollbar]:hidden">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex w-16 flex-none flex-col items-center gap-2 sm:w-20">
                <div className="h-14 w-14 animate-pulse rounded-full bg-slate-100 sm:h-16 sm:w-16" />
                <div className="h-3 w-10 animate-pulse rounded bg-slate-100" />
              </div>
            ))
          : categories.map((cat) => (
              <Link
                key={cat._id}
                to={`/category/${cat._id}`}
                className="group flex w-16 flex-none flex-col items-center gap-2 focus:outline-none sm:w-20"
              >
                <span className="h-14 w-14 overflow-hidden rounded-full border border-slate-200 bg-slate-100 transition group-hover:border-emerald-600 group-focus-visible:ring-2 group-focus-visible:ring-emerald-600 sm:h-16 sm:w-16">
                  <img
                    src={cat.image}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </span>
                <span className="w-full truncate text-center text-xs font-medium text-slate-700 group-hover:text-emerald-700 sm:text-sm">
                  {cat.name}
                </span>
              </Link>
            ))}
      </div>
    </nav>
  );
}