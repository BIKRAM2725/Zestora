import React, { useEffect, useState } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import Banner1 from "../assets/banner1.jpg";
import Banner2 from "../assets/banner2.jpg";
import Banner3 from "../assets/banner3.jpg";

const images = [Banner1, Banner2, Banner3];

function Banner() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearTimeout(timer);
  }, [index]);

  const prev = () => setIndex((i) => (i - 1 + images.length) % images.length);
  const next = () => setIndex((i) => (i + 1) % images.length);

  return (
    <section
      aria-label="Featured banners"
      className="group relative h-[200px] w-full overflow-hidden bg-slate-100 sm:h-[280px] md:h-[380px] lg:h-[500px] xl:h-[560px]"
    >
      {images.map((img, i) => (
        <img
          key={i}
          src={img}
          alt={`Banner ${i + 1}`}
          className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-1000 ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/30 to-transparent" />

      <button
        onClick={prev}
        aria-label="Previous banner"
        className="absolute left-4 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-md backdrop-blur transition hover:bg-white md:flex md:opacity-0 md:group-hover:opacity-100"
      >
        <FaChevronLeft size={14} />
      </button>
      <button
        onClick={next}
        aria-label="Next banner"
        className="absolute right-4 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-md backdrop-blur transition hover:bg-white md:flex md:opacity-0 md:group-hover:opacity-100"
      >
        <FaChevronRight size={14} />
      </button>

      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            aria-label={`Go to banner ${i + 1}`}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === index ? "w-6 bg-white" : "w-2 bg-white/60 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </section>
  );
};

export default Banner;