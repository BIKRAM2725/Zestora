import React, { useMemo } from "react";
import Banner from "../components/Banner.jsx";
import CategoryStrip from "../components/CategoryStrip.jsx";
import CategoryPanels from "../components/CategoryPanels.jsx";
import ProductRow from "../components/ProductRow.jsx";
import Upcoming from "../components/Upcoming.jsx";
import ProductGrid from "../components/ProductGrid.jsx";
import useHomeData from "../hooks/useHomeData";

const HomePage = () => {
  const { categories, posts, loading } = useHomeData();

  const latest = useMemo(
    () =>
      [...posts]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 12),
    [posts]
  );

  return (
    <main className="min-h-screen bg-slate-100">
      <CategoryStrip categories={categories} loading={loading} />
      <Banner />
      <div className="space-y-3 pb-12 pt-3 sm:space-y-6 sm:pt-6">
        <CategoryPanels categories={categories} posts={posts} loading={loading} />
        <ProductRow
          title="Latest products"
          subtitle="Freshly added to the store"
          posts={latest}
          loading={loading}
        />
        <Upcoming />
        <ProductGrid categories={categories} posts={posts} loading={loading} />
      </div>
    </main>
  );
};

export default HomePage;