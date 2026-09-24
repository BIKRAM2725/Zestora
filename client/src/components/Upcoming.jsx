import React from "react";
import NextTrip1 from "../assets/Post/Buiscuit.webp";
import NextTrip2 from "../assets/Post/dry fruts.jpg";
import NextTrip3 from "../assets/Post/Tea.jpg";

const items = [
  {
    image: NextTrip1,
    title: "Biscuits",
    description: "Crisp, flat, baked biscuits made from quality flour.",
  },
  {
    image: NextTrip2,
    title: "Dry fruits",
    description: "Dehydrated fruits that keep their natural nutrition.",
  },
  {
    image: NextTrip3,
    title: "Tea",
    description: "Fresh leaves of the Camellia sinensis plant.",
  },
];

const Upcoming = () => {
  return (
    <section className="mx-auto max-w-[1200px] px-4 sm:px-6">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Coming soon
        </h2>
        <p className="mt-1 text-sm text-slate-500 sm:text-base">
          New ranges arriving in our store.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2.5 sm:gap-5">
        {items.map((item) => (
          <article
            key={item.title}
            className="group relative aspect-[3/4] overflow-hidden rounded-xl bg-slate-100 sm:aspect-[4/3] sm:rounded-2xl lg:aspect-[16/10]"
          >
            <img
              src={item.image}
              alt={item.title}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/75 via-black/20 to-transparent p-3 text-white sm:p-5">
              <h3 className="text-sm font-semibold sm:text-lg lg:text-xl">{item.title}</h3>
              <p className="mt-1 hidden text-sm text-white/80 sm:line-clamp-2 sm:block">
                {item.description}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default Upcoming;