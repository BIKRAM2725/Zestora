// src/page/admin/Activation.jsx
import React, { useEffect, useMemo, useState } from "react";
import { FaClock, FaCalendarAlt } from "react-icons/fa";

const DEFAULT_PLAN_START = "2025-10-08T00:00:00"; // fallback
const PLAN_START_ENV = process.env.REACT_APP_PLAN_START || DEFAULT_PLAN_START;
const PLAN_DURATION_DAYS = Number(process.env.REACT_APP_PLAN_DAYS) || 365;

function pad(n) {
  return String(n).padStart(2, "0");
}

export default function Activation() {
  const PLAN_START_DATE = useMemo(() => new Date(PLAN_START_ENV), []);
  const PLAN_END_DATE = useMemo(
    () => new Date(PLAN_START_DATE.getTime() + PLAN_DURATION_DAYS * 24 * 60 * 60 * 1000),
    [PLAN_START_DATE]
  );

  const [now, setNow] = useState(new Date());
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [progress, setProgress] = useState(0);

  // single interval to update clock + countdown every second
  useEffect(() => {
    function compute() {
      const current = new Date();
      setNow(current);

      const totalMs = PLAN_END_DATE.getTime() - PLAN_START_DATE.getTime();
      const remaining = Math.max(0, PLAN_END_DATE.getTime() - current.getTime());
      const elapsed = Math.max(0, current.getTime() - PLAN_START_DATE.getTime());

      setTimeLeft({
        days: Math.floor(remaining / (1000 * 60 * 60 * 24)),
        hours: Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((remaining % (1000 * 60)) / 1000),
      });

      setProgress(totalMs > 0 ? Math.min((elapsed / totalMs) * 100, 100) : 100);
    }

    compute();
    const t = setInterval(compute, 1000);
    return () => clearInterval(t);
  }, [PLAN_START_DATE, PLAN_END_DATE]);

  const handleActivateNow = () => {
    // placeholder - replace with real activation logic
    alert("Activate action will be added here in future");
  };

  const planCompleted = progress >= 100;

  return (
    <div className="max-w-7xl mx-auto">
      <section className="bg-white shadow-xl rounded-2xl p-4 sm:p-6 md:p-8 border border-gray-200">
        <header className="mb-4 sm:mb-6 text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Website Validation</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Plan window: <strong>{PLAN_START_DATE.toDateString()}</strong> —{" "}
            <strong>{PLAN_END_DATE.toDateString()}</strong>
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Live Clock */}
          <div
            className="p-4 sm:p-6 rounded-xl shadow-sm bg-white flex flex-col items-center text-center"
            role="region"
            aria-label="Current time"
          >
            <FaClock className="text-3xl sm:text-4xl text-indigo-500 mb-2" />
            <h2 className="text-lg sm:text-xl font-semibold mb-1">Current Time</h2>
            <div className="font-mono text-lg sm:text-xl">{now.toLocaleTimeString([], { hour12: false })}</div>
            <div className="text-sm sm:text-base text-gray-500 mt-1">{now.toDateString()}</div>
          </div>

          {/* Countdown */}
          <div
            className="p-4 sm:p-6 rounded-xl shadow-sm bg-white flex flex-col items-center text-center"
            role="region"
            aria-label="Plan countdown"
          >
            <FaCalendarAlt className="text-3xl sm:text-4xl text-green-500 mb-2" />
            <h2 className="text-lg sm:text-xl font-semibold mb-1">Plan Countdown</h2>

            <div className="mt-2 text-base sm:text-lg font-mono">
              <span className="text-xl sm:text-2xl font-bold">{timeLeft.days}</span>
              <span className="mx-1 text-gray-500">d</span>
              <span className="mx-1 font-bold">{pad(timeLeft.hours)}</span>
              <span className="mx-1 text-gray-500">h</span>
              <span className="mx-1 font-bold">{pad(timeLeft.minutes)}</span>
              <span className="mx-1 text-gray-500">m</span>
              <span className="mx-1 font-bold">{pad(timeLeft.seconds)}</span>
              <span className="mx-1 text-gray-500">s</span>
            </div>

            <div className="w-full mt-3">
              <div className="w-full bg-gray-200 h-3 sm:h-4 rounded-full overflow-hidden">
                <div
                  className="h-3 sm:h-4 rounded-full bg-indigo-600 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                  aria-valuenow={Math.round(progress)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  role="progressbar"
                />
              </div>
              <div className="text-xs sm:text-sm text-gray-500 mt-2 text-center">
                {planCompleted ? (
                  <span className="text-green-600 font-semibold">Plan completed</span>
                ) : (
                  <>{progress.toFixed(2)}% completed</>
                )}
              </div>
            </div>
          </div>

          {/* Activate */}
          <div className="p-4 sm:p-6 rounded-xl shadow-sm bg-white flex flex-col items-center justify-center text-center">
            <h2 className="text-lg sm:text-xl font-semibold mb-2">Activate Plan</h2>
            <p className="text-xs sm:text-sm text-gray-500 mb-3">
              Activating the plan will run scheduled validations and enable plan features.
            </p>
            <button
              onClick={handleActivateNow}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              Activate Now
            </button>
            <div className="mt-3 text-[11px] sm:text-xs text-gray-400 text-center">
              Note: Plan start date is fixed and cannot be changed.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}