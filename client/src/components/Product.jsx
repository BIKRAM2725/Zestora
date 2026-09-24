import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const API_URL = process.env.REACT_APP_API_URL;

const Product = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/category/get-category`);
        if (res.data.success) setCategories(res.data.categories);
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  return (
    <section className="mx-auto max-w-[1200px] px-4 sm:px-6">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Shop by category
        </h2>
        <p className="mt-1 text-sm text-slate-500 sm:text-base">
          Pure taste. Pure tradition.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
              <div className="aspect-[4/3] animate-pulse bg-slate-100" />
              <div className="p-4">
                <div className="mx-auto h-4 w-24 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          ))
        ) : categories.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-200 py-14 text-center text-slate-500">
            No categories available yet.
          </div>
        ) : (
          categories.map((cat) => (
            <Link
              key={cat._id}
              to={`/category/${cat._id}`}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition duration-300 hover:border-slate-300 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                <img
                  src={cat.image}
                  alt={cat.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
              </div>
              <h3 className="px-3 py-3 text-center text-sm font-medium text-slate-800 sm:py-4 sm:text-base">
                {cat.name}
              </h3>
            </Link>
          ))
        )}
      </div>
    </section>
  );
};

export default Product;