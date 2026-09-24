
import React from "react";
import {
  FaLeaf,
  FaHeart,
  FaAward,
  FaSeedling,
  FaPhoneAlt,
  FaWhatsapp,
} from "react-icons/fa";

const About = () => {
  const phone = "8337882902";
  const whatsappNumber = "918337882902";

  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      "Hello Zestora! I would like to know more about your products."
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
            About Zestora
          </h1>

          <p className="mt-4 max-w-3xl mx-auto text-white/90 text-sm md:text-base leading-relaxed">
            Bringing authentic Indian spices and handcrafted masalas to
            your kitchen with quality, freshness, and flavour.
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="max-w-7xl mx-auto px-6 py-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">

          <div>
            <span className="text-orange-600 font-semibold text-sm uppercase tracking-wider">
              Our Story
            </span>

            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2">
              Authentic Flavours for Every Kitchen
            </h2>

            <p className="text-gray-600 mt-5 leading-relaxed">
              Zestora is built around a simple idea — good food starts
              with good ingredients. We bring together carefully selected
              spices and handcrafted masala blends designed to add
              authentic flavour and aroma to everyday cooking.
            </p>

            <p className="text-gray-600 mt-4 leading-relaxed">
              From traditional Indian flavours to everyday kitchen
              essentials, our goal is to make quality spices accessible
              while maintaining freshness and consistency.
            </p>

            <p className="text-gray-600 mt-4 leading-relaxed">
              Every product is selected with attention to quality so that
              you can confidently bring rich, aromatic flavours to your
              meals.
            </p>
          </div>

          {/* Visual Card */}
          <div className="bg-white rounded-2xl shadow-md p-8">
            <div className="grid grid-cols-2 gap-5">

              <div className="bg-orange-50 rounded-xl p-6 text-center">
                <FaLeaf className="text-orange-500 text-3xl mx-auto" />

                <h3 className="font-bold text-gray-900 mt-3">
                  Quality
                </h3>

                <p className="text-sm text-gray-500 mt-2">
                  Carefully selected ingredients.
                </p>
              </div>

              <div className="bg-red-50 rounded-xl p-6 text-center">
                <FaHeart className="text-red-500 text-3xl mx-auto" />

                <h3 className="font-bold text-gray-900 mt-3">
                  Made with Care
                </h3>

                <p className="text-sm text-gray-500 mt-2">
                  Crafted with attention to flavour.
                </p>
              </div>

              <div className="bg-green-50 rounded-xl p-6 text-center">
                <FaSeedling className="text-green-600 text-3xl mx-auto" />

                <h3 className="font-bold text-gray-900 mt-3">
                  Freshness
                </h3>

                <p className="text-sm text-gray-500 mt-2">
                  Packed to preserve freshness.
                </p>
              </div>

              <div className="bg-blue-50 rounded-xl p-6 text-center">
                <FaAward className="text-blue-600 text-3xl mx-auto" />

                <h3 className="font-bold text-gray-900 mt-3">
                  Trusted
                </h3>

                <p className="text-sm text-gray-500 mt-2">
                  Focused on customer satisfaction.
                </p>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* Mission */}
      <section className="bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-14">

          <div className="max-w-3xl mx-auto text-center">
            <span className="text-orange-600 font-semibold text-sm uppercase tracking-wider">
              Our Mission
            </span>

            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2">
              Making Every Meal More Flavourful
            </h2>

            <p className="text-gray-600 mt-5 leading-relaxed">
              Our mission is to provide quality spices and masala blends
              that help people create delicious meals with authentic
              Indian flavours. We focus on quality, freshness, and a
              simple shopping experience for our customers.
            </p>
          </div>

        </div>
      </section>

      {/* What We Offer */}
      <section className="max-w-7xl mx-auto px-6 py-14">

        <div className="text-center">
          <span className="text-orange-600 font-semibold text-sm uppercase tracking-wider">
            What We Offer
          </span>

          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2">
            Explore Zestora
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">

          <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition p-7 text-center">
            <FaSeedling className="text-orange-500 text-4xl mx-auto" />

            <h3 className="text-xl font-bold text-gray-900 mt-5">
              Indian Spices
            </h3>

            <p className="text-gray-500 text-sm mt-3 leading-relaxed">
              Discover a variety of spices for everyday Indian cooking
              and your favourite recipes.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition p-7 text-center">
            <FaLeaf className="text-green-600 text-4xl mx-auto" />

            <h3 className="text-xl font-bold text-gray-900 mt-5">
              Masala Blends
            </h3>

            <p className="text-gray-500 text-sm mt-3 leading-relaxed">
              Add rich aroma and flavour to your dishes with carefully
              prepared masala blends.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition p-7 text-center">
            <FaHeart className="text-red-500 text-4xl mx-auto" />

            <h3 className="text-xl font-bold text-gray-900 mt-5">
              Customer First
            </h3>

            <p className="text-gray-500 text-sm mt-3 leading-relaxed">
              We aim to provide a smooth shopping experience and helpful
              customer support.
            </p>
          </div>

        </div>
      </section>

      {/* Why Zestora */}
      <section className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-14">

          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold">
              Why Zestora?
            </h2>

            <p className="text-gray-400 mt-3 max-w-2xl mx-auto">
              We believe that the right spices can transform simple
              ingredients into memorable meals.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mt-10">

            <div className="text-center">
              <FaLeaf className="text-orange-400 text-3xl mx-auto" />
              <h3 className="font-semibold mt-4">
                Quality Ingredients
              </h3>
            </div>

            <div className="text-center">
              <FaSeedling className="text-green-400 text-3xl mx-auto" />
              <h3 className="font-semibold mt-4">
                Authentic Flavours
              </h3>
            </div>

            <div className="text-center">
              <FaAward className="text-yellow-400 text-3xl mx-auto" />
              <h3 className="font-semibold mt-4">
                Focus on Quality
              </h3>
            </div>

            <div className="text-center">
              <FaHeart className="text-red-400 text-3xl mx-auto" />
              <h3 className="font-semibold mt-4">
                Customer Satisfaction
              </h3>
            </div>

          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="max-w-7xl mx-auto px-6 py-14">

        <div className="rounded-2xl bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white p-8 md:p-12 text-center">

          <h2 className="text-2xl md:text-3xl font-bold">
            Have Questions?
          </h2>

          <p className="mt-3 text-white/90 max-w-xl mx-auto">
            Our team is happy to help you with products, orders, and
            other questions.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-7">

            <a
              href={`tel:+91${phone}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white text-gray-900 font-semibold hover:bg-gray-100 transition"
            >
              <FaPhoneAlt />
              {"+91 8337882902"}
            </a>

            <button
              onClick={handleWhatsApp}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-green-600 hover:bg-green-700 transition font-semibold"
            >
              <FaWhatsapp className="text-xl" />
              Chat on WhatsApp
            </button>

          </div>
        </div>

      </section>

    </div>
  );
};

export default About;
