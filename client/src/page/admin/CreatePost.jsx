// src/page/admin/CreatePost.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { IoClose } from "react-icons/io5";
import useCachedData from "../../hooks/useCachedData";
import { invalidateHomeData } from "../../hooks/useHomeData";
import { getAuthHeaders } from "../../utils/authHeaders";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

const EMPTY_FORM = {
  title: "",
  description: "",
  category: "",
  stock: "",
  price: "",
  facilities: "",
  isAvailable: true,
};

export default function CreatePost() {
  const [editingPost, setEditingPost] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [postData, setPostData] = useState(EMPTY_FORM);

  // Images are kept in two separate lists so removing one can never remove the wrong one:
  //  - existingImages: URLs already saved on the server (when editing)
  //  - newFiles: File objects chosen in this session
  const [existingImages, setExistingImages] = useState([]);
  const [newFiles, setNewFiles] = useState([]);

  const newPreviews = useMemo(
    () => newFiles.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [newFiles]
  );
  useEffect(() => {
    return () => newPreviews.forEach((p) => URL.revokeObjectURL(p.url));
  }, [newPreviews]);

  const { data: catData } = useCachedData(
    "catalog:categories",
    async () => {
      const res = await axios.get(`${API_BASE}/api/category/get-category`);
      if (!res.data?.success) throw new Error("Failed to load categories");
      return res.data.categories || [];
    },
    { ttl: 60000 }
  );
  const categories = catData || [];

  const {
    data: postsData,
    loading: postsLoading,
    refetch: refetchPosts,
  } = useCachedData(
    "catalog:posts",
    async () => {
      const res = await axios.get(`${API_BASE}/api/post/get-all-posts`);
      if (!res.data?.success) throw new Error("Failed to load posts");
      return res.data.posts || [];
    },
    { ttl: 30000 }
  );
  const posts = postsData || [];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPostData((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };

  const handleImages = (e) => {
    const files = Array.from(e.target.files || []);
    setNewFiles((prev) => [...prev, ...files]);
    e.target.value = ""; // allow picking the same file again
  };

  const resetForm = () => {
    setPostData(EMPTY_FORM);
    setExistingImages([]);
    setNewFiles([]);
    setEditingPost(null);
    setShowForm(false);
  };

  const openCreateForm = () => {
    setPostData(EMPTY_FORM);
    setExistingImages([]);
    setNewFiles([]);
    setEditingPost(null);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { title, description, category, stock, price, facilities, isAvailable } = postData;

    if (!title || !description || !category || !stock || !price) {
      toast.error("Please fill all required fields");
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("category", category);
      formData.append("stock", String(stock));
      formData.append("price", String(price));
      formData.append("isAvailable", isAvailable ? "true" : "false");

      const facArr =
        typeof facilities === "string" && facilities.trim().length > 0
          ? facilities
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [];
      formData.append("facilities", JSON.stringify(facArr));

      if (editingPost) {
        // Tells the backend which saved images to keep (it must read this field to honour removals)
        formData.append("existingImages", JSON.stringify(existingImages));
      }
      newFiles.forEach((file) => formData.append("images", file));

      const url = editingPost
        ? `${API_BASE}/api/post/update-post/${editingPost._id}`
        : `${API_BASE}/api/post/create-post`;
      const method = editingPost ? "put" : "post";

      const res = await axios[method](url, formData, {
        headers: { ...getAuthHeaders(), "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success) {
        toast.success(editingPost ? "Post updated successfully" : "Post created successfully");
        resetForm();
        invalidateHomeData(); // Home shows the change on next visit
        refetchPosts();
      } else {
        toast.error(res.data?.message || "Unexpected response from server");
      }
    } catch (error) {
      console.error("handleSubmit error:", error?.response?.data || error.message);
      toast.error(error?.response?.data?.message || "Something went wrong while saving the post");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (post) => {
    setEditingPost(post);
    setShowForm(true);
    setPostData({
      title: post.title || "",
      description: post.description || "",
      category: post.category?._id || post.category || "",
      stock: post.stock ?? "",
      price: post.price ?? "",
      facilities: Array.isArray(post.facilities) ? post.facilities.join(",") : post.facilities || "",
      isAvailable: post.isAvailable ?? true,
    });
    setExistingImages(Array.isArray(post.images) ? post.images : []);
    setNewFiles([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      const res = await axios.delete(`${API_BASE}/api/post/delete-post/${id}`, {
        headers: getAuthHeaders(),
      });
      if (res.data?.success) {
        toast.success("Post deleted successfully");
        invalidateHomeData();
        refetchPosts();
      } else {
        toast.error(res.data?.message || "Failed to delete post");
      }
    } catch (error) {
      console.error("handleDelete:", error?.response?.data || error.message);
      toast.error(error?.response?.data?.message || "Error deleting post");
    }
  };

  return (
    <div className="space-y-8">
      {/* Show Button instead of Form */}
      {!showForm && (
        <div className="text-center">
          <button
            onClick={openCreateForm}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition font-semibold"
          >
            Create New Product
          </button>
        </div>
      )}

      {/* Create / Edit Form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 max-w-3xl mx-auto p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl md:text-3xl font-bold text-indigo-700 mb-4">
              {editingPost ? "Update Post" : "Create New Product"}
            </h2>
            <button
              type="button"
              onClick={resetForm}
              aria-label="Close form"
              className="p-2 rounded-md hover:bg-gray-100"
            >
              <IoClose />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              name="title"
              placeholder="Enter product title"
              value={postData.title}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500"
            />

            <textarea
              name="description"
              placeholder="Product Description"
              value={postData.description}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500"
              rows={4}
            />

            <select
              name="category"
              value={postData.category}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                name="stock"
                placeholder="Total Quantity"
                value={postData.stock}
                onChange={handleChange}
                className="border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="number"
                name="price"
                placeholder="Product Price"
                value={postData.price}
                onChange={handleChange}
                className="border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <input
              type="text"
              name="facilities"
              placeholder="Facilities (comma separated)"
              value={postData.facilities}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg p-3"
            />

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700" htmlFor="post-images">
                Images
              </label>
              <input
                id="post-images"
                type="file"
                multiple
                accept="image/*"
                onChange={handleImages}
                className="w-full border border-gray-300 rounded-lg p-3"
              />

              {(existingImages.length > 0 || newPreviews.length > 0) && (
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {existingImages.map((src, i) => (
                    <div key={`existing-${src}-${i}`} className="relative">
                      <img src={src} alt={`saved ${i + 1}`} className="w-full h-24 object-cover rounded-md border" />
                      <button
                        type="button"
                        onClick={() => setExistingImages((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow"
                        aria-label={`Remove saved image ${i + 1}`}
                      >
                        <IoClose />
                      </button>
                    </div>
                  ))}

                  {newPreviews.map((p, i) => (
                    <div key={`new-${p.url}`} className="relative">
                      <img src={p.url} alt={`new ${i + 1}`} className="w-full h-24 object-cover rounded-md border" />
                      <button
                        type="button"
                        onClick={() => setNewFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow"
                        aria-label={`Remove new image ${i + 1}`}
                      >
                        <IoClose />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="isAvailable"
                checked={postData.isAvailable}
                onChange={handleChange}
                className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span className="text-gray-700 font-medium">Available</span>
            </label>

            <div className="flex justify-between">
              <button type="button" onClick={resetForm} className="px-6 py-3 rounded-lg bg-gray-300 hover:bg-gray-400">
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition font-semibold disabled:opacity-60"
                disabled={saving}
              >
                {saving ? (editingPost ? "Updating..." : "Creating...") : editingPost ? "Update Post" : "Create Post"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* All Posts */}
      <section className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-2xl font-bold text-indigo-700 mb-6 text-center">All Products</h3>

        {postsLoading ? (
          <p className="text-center text-gray-500">Loading products...</p>
        ) : posts.length === 0 ? (
          <p className="text-center text-gray-500">No product found</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <div
                key={post._id}
                className="border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition duration-300 p-4 bg-gray-50"
              >
                <img
                  src={post.images?.[0] || "/placeholder.jpg"}
                  alt={post.title}
                  loading="lazy"
                  className="w-full h-40 object-cover rounded-lg mb-3"
                />
                <h4 className="font-bold text-lg text-gray-800">{post.title}</h4>
                <p className="text-sm text-gray-500 mt-2 line-clamp-2">{post.description}</p>
                <p className="text-sm text-indigo-600 font-medium mt-2">₹ {post.price}</p>

                <div className="flex justify-between mt-3">
                  <button
                    onClick={() => handleEdit(post)}
                    className="bg-yellow-500 text-white px-3 py-1 rounded-md hover:bg-yellow-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(post._id)}
                    className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}