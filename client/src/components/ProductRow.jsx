import React, { useRef } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import ProductCard, { ProductCardSkeleton } from "./ProductCard";

export default function ProductRow({ title, subtitle, posts, loading }) {
  const ref = useRef(null);

  const scroll = (dir) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  if (!loading && posts.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1200px] sm:px-6">
      <div className="bg-white p-4 sm:rounded-lg sm:p-5">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          <div className="hidden gap-2 md:flex">
            <button
              onClick={() => scroll(-1)}
              aria-label="Scroll left"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              <FaChevronLeft size={13} />
            </button>
            <button
              onClick={() => scroll(1)}
              aria-label="Scroll right"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              <FaChevronRight size={13} />
            </button>
          </div>
        </div>

        <div
          ref={ref}
          className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {(loading ? Array.from({ length: 6 }) : posts).map((post, i) => (
            <div
              key={post?._id || i}
              className="w-[44%] flex-none snap-start sm:w-[28%] md:w-[20%] lg:w-[17.5%]"
            >
              {loading ? <ProductCardSkeleton /> : <ProductCard post={post} />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}