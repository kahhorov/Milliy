import React from "react";
import { FiX, FiDollarSign, FiClock } from "react-icons/fi";
import { useSelector } from "react-redux";
import { PiStudent } from "react-icons/pi";

const PaymentModal = ({
  showModal,
  setShowModal,
  selectedStudent,
  paymentType,
  setPaymentType,
  selectedDebtCycleIndex,
  handleDebtSelection,
  amount,
  setAmount,
  paymentDate,
  setPaymentDate,
  handlePaymentSubmit,
  loading,
  formatMoney,
}) => {
  if (!showModal || !selectedStudent) return null;
  const theme = useSelector((state) => state.theme.value);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div
        className={`${theme === "light" ? "bg-white" : "bg-slate-800"} rounded-[40px] w-full max-w-lg shadow-2xl animate-in zoom-in duration-200 overflow-hidden relative`}
      >
        <div
          className={`px-8 py-6 border-b flex justify-between items-center ${
            selectedStudent.info.status === "urgent"
              ? "bg-red-50 border-red-100"
              : selectedStudent.info.isLastDay
                ? "bg-orange-50 border-orange-100"
                : `${theme === "light" ? "bg-slate-50 border-slate-100" : "bg-slate-700/60 border-slate-600"}`
          }`}
        >
          <div>
            <h3
              className={`${theme === "light" ? "text-slate-800" : "text-slate-300"} text-xl font-black`}
            >
              To'lov Qabul Qilish
            </h3>
            <p
              className={`${theme === "light" ? "text-slate-500" : "text-slate-400"} flex items-center gap-1 mt-1 text-sm font-bold`}
            >
              <PiStudent size={16} /> {selectedStudent.studentName}
            </p>
          </div>
          <button
            onClick={() => setShowModal(false)}
            className={`${theme === "light" ? "hover:bg-slate-200" : "hover:bg-slate-600"} p-2 rounded-full text-slate-400 transition-colors`}
          >
            <FiX size={24} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div
            className={`${theme === "light" ? "bg-slate-100" : "bg-slate-700/20"} flex p-1.5 rounded-2xl`}
          >
            {selectedStudent.info.debts.length > 0 && (
              <button
                onClick={() => setPaymentType("debt")}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                  paymentType === "debt"
                    ? "bg-white shadow-md text-red-600"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Qarzni Yopish
              </button>
            )}
            <button
              onClick={() => {
                setPaymentType("regular");
                setAmount(selectedStudent.info.coursePrice);
              }}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                paymentType === "regular"
                  ? "bg-white shadow-md text-blue-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Joriy To'lov
            </button>
          </div>

          {paymentType === "debt" && selectedStudent.info.debts.length > 0 && (
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 capitalize ml-1">
                Qarzni Tanlang
              </label>
              <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {selectedStudent.info.debts.map((debt, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleDebtSelection(idx)}
                    className={`p-4 mt-1 rounded-2xl border cursor-pointer flex justify-between items-center transition-all ${
                      selectedDebtCycleIndex === idx
                        ? "bg-red-400/10 text-red-400 inset-ring inset-ring-red-400/20"
                        : "bg-white border-slate-200 hover:border-red-300"
                    }`}
                  >
                    <div>
                      <p
                        className={`${theme === "light" ? "text-slate-600" : "text-slate-300"} text-xs font-bold uppercase`}
                      >
                        {new Date(debt.startDate).toLocaleDateString("uz-UZ")} —{" "}
                        {new Date(debt.endDate).toLocaleDateString("uz-UZ")}
                      </p>
                      <p className="text-[10px] text-red-400 font-medium">
                        To'lanmagan sana
                      </p>
                    </div>
                    <span
                      className={`${theme === "light" ? "text-slate-800" : "text-slate-200"} font-black`}
                    >
                      {formatMoney(debt.debtAmount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">
                Summa
              </label>
              <div className="relative">
                <FiDollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  placeholder="Tolovni kriting"
                  value={amount + ".000"}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`${theme === "light" ? "bg-slate-50 focus:bg-white" : "bg-slate-700"} w-full border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 pl-10 pr-4 text-xl font-bold outline-none transition-all`}
                />
              </div>
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">
                To'lov Sanasi
              </label>
              <div className="relative">
                <FiClock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className={`${theme === "light" ? "bg-slate-50 focus:bg-white" : "bg-slate-700"} w-full border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 pl-10 pr-4 text-xl font-bold outline-none transition-all`}
                />
              </div>
            </div>
          </div>

          <button
            onClick={handlePaymentSubmit}
            disabled={loading}
            className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg text-white transition-all active:scale-95 disabled:opacity-70 ${
              selectedStudent.info.status === "urgent"
                ? "bg-red-600 hover:bg-red-700 shadow-red-200"
                : selectedStudent.info.isLastDay
                  ? "bg-orange-600 hover:bg-orange-700 shadow-orange-200"
                  : `${theme === "light" ? "shadow-slate-200" : "shadow-slate-700"} bg-slate-900 hover:bg-slate-800`
            }`}
          >
            {loading ? "Saqlanmoqda..." : "To'lovni Tasdiqlash"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
