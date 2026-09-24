// src/page/admin/CreateCategory.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import useCachedData from "../../hooks/useCachedData";
import { invalidateHomeData } from "../../hooks/useHomeData";
import { getAuthHeaders } from "../../utils/authHeaders";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function CreateCategory() {
  const [name, setName] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);

  // Same key as CreatePost's category dropdown, so both pages share one cached list
  const { data, loading, refetch } = useCachedData(
    "catalog:categories",
    async () => {
      const res = await axios.get(`${API}/api/category/get-category`);
      if (!res.data?.success) throw new Error("Failed to load categories");
      return res.data.categories || [];
    },
    { ttl: 60000 }
  );
  const categories = data || [];

  // Release the previous preview URL whenever it changes, and on unmount
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const resetForm = () => {
    setName("");
    setImage(null);
    setPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !image) {
      toast.error("Please enter name and select an image");
      return;
    }

    const headers = getAuthHeaders();
    if (!headers.Authorization) {
      toast.error("Login required");
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("image", image);

      const res = await axios.post(`${API}/api/category/create-category`, formData, {
        headers: { ...headers, "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success) {
        toast.success("Category created successfully");
        resetForm();
        invalidateHomeData(); // Home shows the new category next visit
        refetch();
      } else {
        toast.error(res.data?.message || "Failed to create category");
      }
    } catch (error) {
      console.error("createCategory:", error?.response?.data || error?.message);
      toast.error(error?.response?.data?.message || "Error creating category");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-2xl p-6 md:p-8 max-w-4xl mx-auto border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl md:text-3xl font-bold text-indigo-700">Create Category</h2>
        <button
          type="button"
          onClick={resetForm}
          aria-label="Reset form"
          className="hidden md:inline-flex items-center gap-2 px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200"
        >
          Reset
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-gray-700 mb-2 font-medium" htmlFor="category-name">
            Category Name
          </label>
          <input
            id="category-name"
            type="text"
            placeholder="Enter category name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-gray-700 mb-2 font-medium" htmlFor="category-image">
            Category Image
          </label>
          <input
            id="category-image"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full border border-gray-300 rounded-lg p-3"
          />
          {preview && (
            <img
              src={preview}
              alt="Preview"
              className="mt-3 w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-lg border"
            />
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          className={`w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 shadow-md ${
            saving ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {saving ? "Creating..." : "Create Category"}
        </button>
      </form>

      <div className="mt-8">
        <h3 className="text-xl font-semibold text-gray-700 mb-4">Available Categories</h3>

        {loading ? (
          <p className="text-gray-500">Loading categories...</p>
        ) : categories.length === 0 ? (
          <p className="text-gray-500">No categories available</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {categories.map((cat, index) => (
              <div
                key={cat._id || index}
                className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex flex-col items-center justify-center font-medium text-indigo-700 shadow-sm hover:shadow-md transition-shadow duration-300"
              >
                {cat.image && (
                  <img
                    src={cat.image.startsWith("http") ? cat.image : `${API}/${cat.image}`}
                    alt={cat.name}
                    className="w-20 h-20 object-cover rounded-full mb-2"
                  />
                )}
                <span className="text-center">{cat.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}