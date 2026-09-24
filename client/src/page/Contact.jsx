import React, { useState } from "react";
import {
  FaPhoneAlt,
  FaEnvelope,
  FaWhatsapp,
  FaFacebookF,
  FaInstagram,
  FaMapMarkerAlt,
} from "react-icons/fa";
import { toast } from "react-toastify";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const [loading, setLoading] = useState(false);

  const phone = "8337882902";
  const displayPhone = "+91 8337882902";
  const email = "Zestora.official@gmail.com";
  const whatsappNumber = "918337882902";

  const facebookUrl = "https://www.facebook.com/Zestora.official";
  const instagramUrl = "https://www.instagram.com/Zestora.official";

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.message.trim()
    ) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setLoading(true);

    try {
      const whatsappMessage = `
Hello Zestora!

Name: ${formData.name}
Email: ${formData.email}
Phone: ${formData.phone || "Not provided"}
Subject: ${formData.subject || "General Inquiry"}

Message:
${formData.message}
      `.trim();

      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
        whatsappMessage
      )}`;

      window.open(whatsappUrl, "_blank");

      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      });

      toast.success("Opening WhatsApp...");
    } catch (error) {
      console.error("Contact form error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      "Hello Zestora! I need help with your products."
    );

    window.open(
      `https://wa.me/${whatsappNumber}?text=${message}`,
      "_blank"
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white">
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold">
            Contact Zestora
          </h1>

          <p className="mt-4 text-white/90 max-w-2xl mx-auto text-sm md:text-base">
            Have a question about our spices, orders, products, or anything
            else? We are here to help.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Information */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-md p-7 h-full">
              <h2 className="text-2xl font-bold text-gray-900">
                Get in Touch
              </h2>

              <p className="text-gray-500 mt-2 text-sm leading-relaxed">
                Our team is happy to assist you with product information,
                orders, returns, or any other questions.
              </p>

              {/* Phone */}
              <a
                href={`tel:+91${phone}`}
                className="flex items-start gap-4 mt-7 group"
              >
                <div className="w-11 h-11 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <FaPhoneAlt className="text-orange-600" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Phone
                  </p>

                  <p className="text-sm text-gray-500 mt-1 group-hover:text-orange-600 transition">
                    {displayPhone}
                  </p>
                </div>
              </a>

              {/* Email */}
              <a
                href={`mailto:${email}`}
                className="flex items-start gap-4 mt-6 group"
              >
                <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <FaEnvelope className="text-red-600" />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    Email
                  </p>

                  <p className="text-sm text-gray-500 mt-1 break-all group-hover:text-red-600 transition">
                    {email}
                  </p>
                </div>
              </a>

              {/* WhatsApp */}
              <button
                onClick={handleWhatsApp}
                className="w-full flex items-start gap-4 mt-6 text-left group"
              >
                <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <FaWhatsapp className="text-green-600 text-xl" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    WhatsApp
                  </p>

                  <p className="text-sm text-gray-500 mt-1 group-hover:text-green-600 transition">
                    Chat with us on WhatsApp
                  </p>
                </div>
              </button>

              {/* Location */}
              <div className="flex items-start gap-4 mt-6">
                <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <FaMapMarkerAlt className="text-blue-600" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Location
                  </p>

                  <p className="text-sm text-gray-500 mt-1">
                    India
                  </p>
                </div>
              </div>

              {/* Social Media */}
              <div className="border-t border-gray-200 mt-8 pt-6">
                <p className="text-sm font-semibold text-gray-900">
                  Follow Us
                </p>

                <div className="flex gap-3 mt-4">
                  <a
                    href={facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Zestora Facebook"
                    className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center hover:bg-blue-600 transition"
                  >
                    <FaFacebookF className="text-white" />
                  </a>

                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Zestora Instagram"
                    className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center hover:bg-pink-500 transition"
                  >
                    <FaInstagram className="text-white" />
                  </a>

                  <button
                    onClick={handleWhatsApp}
                    aria-label="Zestora WhatsApp"
                    className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center hover:bg-green-600 transition"
                  >
                    <FaWhatsapp className="text-white" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-md p-7 md:p-9">
              <h2 className="text-2xl font-bold text-gray-900">
                Send Us a Message
              </h2>

              <p className="text-gray-500 mt-2 text-sm">
                Fill out the form below and we will help you with your
                query.
              </p>

              <form onSubmit={handleSubmit} className="mt-7">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Name */}
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Name <span className="text-red-500">*</span>
                    </label>

                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter your name"
                      required
                      className="w-full h-11 px-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Email <span className="text-red-500">*</span>
                    </label>

                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Enter your email"
                      required
                      className="w-full h-11 px-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Phone
                    </label>

                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="Enter your phone number"
                      className="w-full h-11 px-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                    />
                  </div>

                  {/* Subject */}
                  <div>
                    <label
                      htmlFor="subject"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Subject
                    </label>

                    <input
                      id="subject"
                      name="subject"
                      type="text"
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder="What is your query about?"
                      className="w-full h-11 px-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Message */}
                <div className="mt-5">
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Message <span className="text-red-500">*</span>
                  </label>

                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Write your message..."
                    rows={6}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent resize-none"
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-6 w-full md:w-auto px-8 py-3 rounded-lg bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white font-semibold hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? "Opening WhatsApp..." : "Send Message"}
                </button>

                <p className="text-xs text-gray-400 mt-3">
                  Your message will be prepared in WhatsApp so our team can
                  respond directly.
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="max-w-7xl mx-auto px-6 pb-12">
        <div className="rounded-2xl bg-gray-900 text-white p-8 md:p-10 text-center">
          <h2 className="text-2xl md:text-3xl font-bold">
            Need Quick Assistance?
          </h2>

          <p className="text-gray-400 mt-2 text-sm md:text-base">
            Chat with Zestora directly on WhatsApp.
          </p>

          <button
            onClick={handleWhatsApp}
            className="mt-5 inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-green-600 hover:bg-green-700 transition font-semibold"
          >
            <FaWhatsapp className="text-xl" />
            Chat on WhatsApp
          </button>
        </div>
      </section>
    </div>
  );
};

export default Contact;
