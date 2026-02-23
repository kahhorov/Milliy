// components/HolidayEndModal.js
import React from "react";
import { FiX, FiCalendar, FiCheckCircle } from "react-icons/fi";
import { useSelector } from "react-redux";

const HolidayEndModal = ({
  showModal,
  setShowModal,
  holiday,
  formatDateToUzbek,
}) => {
  const theme = useSelector((state) => state.theme.value);

  if (!showModal || !holiday) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div
        className={`${theme === "light" ? "bg-white" : "bg-slate-800"} rounded-[40px] w-full max-w-md shadow-2xl animate-in zoom-in duration-200 overflow-hidden relative`}
      >
        {/* HEADER */}
        <div
          className={`${theme === "light" ? "bg-green-50 border-b border-green-100" : "bg-green-900/20 border-b border-green-800/30"} px-8 py-6`}
        >
          <div className="flex items-center gap-3">
            <FiCheckCircle className="text-green-500" size={32} />
            <div>
              <h3
                className={`${theme === "light" ? "text-green-800" : "text-green-300"} text-xl font-black`}
              >
                Tatil Tugadi!
              </h3>
              <p className="text-sm text-slate-500 font-medium">
                Quyidagi guruhda tatil muddati tugadi
              </p>
            </div>
          </div>
        </div>

        {/* BODY */}
        <div className="p-8 space-y-4">
          <div
            className={`${theme === "light" ? "bg-slate-50" : "bg-slate-700/30"} rounded-2xl p-5`}
          >
            <p
              className={`${theme === "light" ? "text-purple-800" : "text-purple-300"} font-bold text-lg mb-2`}
            >
              {holiday.groupName}
            </p>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <FiCalendar className="text-green-500" />
                <span
                  className={
                    theme === "light" ? "text-slate-600" : "text-slate-300"
                  }
                >
                  <span className="font-bold">Boshlangan:</span>{" "}
                  {formatDateToUzbek(holiday.startDate)}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <FiCalendar className="text-red-500" />
                <span
                  className={
                    theme === "light" ? "text-slate-600" : "text-slate-300"
                  }
                >
                  <span className="font-bold">Tugagan:</span>{" "}
                  {formatDateToUzbek(holiday.endDate)}
                </span>
              </div>

              {holiday.description && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                  <p
                    className={`${theme === "light" ? "text-slate-500" : "text-slate-400"} italic`}
                  >
                    "{holiday.description}"
                  </p>
                </div>
              )}
            </div>
          </div>

          <p
            className={`text-sm ${theme === "light" ? "text-slate-500" : "text-slate-400"} text-center`}
          >
            Ertadan darslar boshlanadi. O'quvchilarga xabar yuborildi.
          </p>
        </div>

        {/* FOOTER */}
        <div
          className={`px-8 py-6 ${theme === "light" ? "bg-slate-50 border-t border-slate-100" : "bg-slate-800/50 border-t border-slate-700"}`}
        >
          <button
            onClick={() => {
              setShowModal(false);
            }}
            className="w-full py-4 rounded-2xl font-bold bg-green-600 hover:bg-green-700 text-white transition-all active:scale-95"
          >
            Tushunarli
          </button>
        </div>
      </div>
    </div>
  );
};

export default HolidayEndModal;
