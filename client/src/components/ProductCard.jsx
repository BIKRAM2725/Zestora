import React from "react";
import { Link } from "react-router-dom";

export const formatPrice = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

const isNew = (date) =>
  date && Date.now() - new Date(date).getTime() < 7 * 24 * 60 * 60 * 1000;

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="aspect-square animate-pulse bg-slate-100" />
      <div className="space-y-2 p-3">
        <div className="h-3.5 w-4/5 animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}

export default function ProductCard({ post }) {
  const soldOut = post.isAvailable === false;

  return (
    <Link
      to={`/product/${post.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white transition duration-200 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
    >
      <div className="relative aspect-square overflow-hidden bg-slate-100">
        <img
          src={post.images?.[0] || "/placeholder.jpg"}
          alt={post.title}
          loading="lazy"
          draggable={false}
          className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${
            soldOut ? "opacity-60" : ""
          }`}
        />
        {isNew(post.createdAt) && !soldOut && (
          <span className="absolute left-2 top-2 rounded bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">
            New
          </span>
        )}
        {soldOut && (
          <span className="absolute inset-x-0 bottom-0 bg-slate-900/80 py-1 text-center text-xs font-medium text-white">
            Out of stock
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm text-slate-700">{post.title}</h3>
        <p className="mt-2 text-base font-semibold text-slate-900 sm:text-lg">
          {formatPrice(post.price)}
        </p>
      </div>
    </Link>
  );
}