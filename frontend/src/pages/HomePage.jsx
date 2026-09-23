import { useEffect, useState } from "react";

import { productsApi } from "../api/products.api.js";
import { CategoryHighlights } from "../components/home/CategoryHighlights.jsx";
import { HomeHero } from "../components/home/HomeHero.jsx";
import { LatestProductsSection } from "../components/home/LatestProductsSection.jsx";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";

const latestProductsQuery = {
  q: "",
  brandIds: [],
  categoryIds: [],
  sizeIds: [],
  colorIds: [],
  minPrice: "",
  maxPrice: "",
  sort: "newest",
  page: 1,
};

export function HomePage() {
  useDocumentTitle("Trang chủ");
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState(null);
  const [categoriesReloadKey, setCategoriesReloadKey] = useState(0);
  const [latestProducts, setLatestProducts] = useState([]);
  const [latestProductsLoading, setLatestProductsLoading] = useState(true);
  const [latestProductsError, setLatestProductsError] = useState(null);
  const [latestProductsReloadKey, setLatestProductsReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    productsApi.options()
      .then((options) => {
        if (active) setCategories(options.categories);
      })
      .catch(() => {
        if (active) setCategoriesError("Không thể tải danh mục lúc này.");
      })
      .finally(() => {
        if (active) setCategoriesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [categoriesReloadKey]);

  useEffect(() => {
    let active = true;

    productsApi.list(latestProductsQuery)
      .then((result) => {
        if (active) setLatestProducts(result.products);
      })
      .catch(() => {
        if (active) setLatestProductsError("Không thể tải sản phẩm mới nhất lúc này.");
      })
      .finally(() => {
        if (active) setLatestProductsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [latestProductsReloadKey]);

  const retryCategories = () => {
    setCategoriesLoading(true);
    setCategoriesError(null);
    setCategoriesReloadKey((value) => value + 1);
  };

  const retryLatestProducts = () => {
    setLatestProductsLoading(true);
    setLatestProductsError(null);
    setLatestProductsReloadKey((value) => value + 1);
  };

  return (
    <>
      <HomeHero />
      <CategoryHighlights
        categories={categories}
        loading={categoriesLoading}
        error={categoriesError}
        onRetry={retryCategories}
      />
      <LatestProductsSection
        products={latestProducts}
        loading={latestProductsLoading}
        error={latestProductsError}
        onRetry={retryLatestProducts}
      />
    </>
  );
}
