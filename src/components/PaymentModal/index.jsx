import React, { useState, useEffect } from "react";
import { FiX, FiDollarSign, FiClock } from "react-icons/fi";
import { useSelector } from "react-redux";
import { PiStudent } from "react-icons/pi";
import { toast } from "react-toastify";
import { sendNotifications } from "../../utils/sendNotification";
import { useUzbekTime } from "../../hooks/useUzbekTime";

// Pulni nuqtalar bilan formatlash (masalan: 250000 -> "250.000")
const formatMoney = (num) => {
  if (num === null || num === undefined) return "";
  const cleanNum = num.toString().replace(/\D/g, "");
  if (!cleanNum) return "";
  return cleanNum.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// Stringdagi pulni haqiqiy songa o'tkazish (masalan: "250.000" -> 250000)
const parseMoney = (str) => {
  if (!str) return 0;
  // NUQTALARNI OLIB TASHLAYMIZ va to'g'ridan-to'g'ri number ga aylantiramiz
  // "2.500.000" -> "2500000" -> 2500000
  const cleanStr = str.toString().replace(/\./g, "");
  return parseInt(cleanStr, 10) || 0;
};

// Telegram uchun pul formati
const formatMoneyForTelegram = (amountStr) => {
  const num = parseMoney(amountStr);
  return `${formatMoney(num)} so'm`;
};

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
}) => {
  if (!showModal || !selectedStudent) return null;

  const theme = useSelector((state) => state.theme.value);
  const { todayStr, formatUzbekDateReadable } = useUzbekTime();
  const [sendingNotification, setSendingNotification] = useState(false);

  const [showDebtInfo, setShowDebtInfo] = useState(false);
  const [remainingDebt, setRemainingDebt] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [coursePrice, setCoursePrice] = useState(0);

  // Kurs narxini aniqlash va tekshirish
  useEffect(() => {
    if (selectedStudent && selectedStudent.info) {
      const priceValue = selectedStudent.info.coursePrice || 0;
      let parsedPrice = parseMoney(priceValue);

      // Agar bazada adashib "250" ko'rinishida kichik raqam saqlangan bo'lsa,
      // uni avtomatik 1000 ga ko'paytirib olamiz (250 -> 250000)
      if (parsedPrice > 0 && parsedPrice < 10000) {
        parsedPrice = parsedPrice * 1000;
      }
      setCoursePrice(parsedPrice);
    }
  }, [selectedStudent]);

  // Qarzlar va to'lovlarni hisoblash
  useEffect(() => {
    if (selectedStudent && selectedStudent.info) {
      const totalDebt =
        selectedStudent.info.debts?.reduce((sum, debt) => {
          let dAmt = parseMoney(debt.debtAmount);
          // Qarzlar ham kichik sonda kelgan bo'lsa to'g'irlaymiz
          if (dAmt > 0 && dAmt < 10000) dAmt = dAmt * 1000;
          return sum + dAmt;
        }, 0) || 0;

      let tPaid = parseMoney(selectedStudent.info.totalPaid);
      if (tPaid > 0 && tPaid < 10000) tPaid = tPaid * 1000;

      setTotalPaid(tPaid);
      setRemainingDebt(totalDebt);
      setShowDebtInfo(totalDebt > 0);
    }
  }, [selectedStudent]);

  // Modal ochilganda Inputga avtomatik "250.000" ni kiritish
  useEffect(() => {
    if (showModal && selectedStudent) {
      if (paymentType === "regular") {
        if (coursePrice > 0) {
          setAmount(formatMoney(coursePrice)); // "250.000" bo'lib saqlanadi
        }
      } else if (
        paymentType === "debt" &&
        selectedStudent.info?.debts?.length > 0
      ) {
        const firstDebt = selectedStudent.info.debts[0];
        if (firstDebt && firstDebt.debtAmount) {
          let dAmt = parseMoney(firstDebt.debtAmount);
          if (dAmt > 0 && dAmt < 10000) dAmt = dAmt * 1000;
          setAmount(formatMoney(dAmt));
        }
      }
    }
  }, [showModal, selectedStudent, paymentType, coursePrice, setAmount]);

  // Inputga raqam yozilganda zudlik bilan nuqtalar qoyish
  const handleAmountChange = (e) => {
    const formatted = formatMoney(e.target.value);
    setAmount(formatted);
  };

  // Inputdan focus chiqqanda (onBlur) 250 yozgan bo'lsa oxiriga .000 qo'shish
  const handleAmountBlur = () => {
    if (amount) {
      let rawNum = parseMoney(amount);
      // Agar foydalanuvchi "250" yozib qoldirgan bo'lsa:
      if (rawNum > 0 && rawNum < 10000) {
        rawNum = rawNum * 1000;
      }
      setAmount(formatMoney(rawNum));
    }
  };

  const handleRegularPayment = () => {
    setPaymentType("regular");
    if (coursePrice > 0) {
      setAmount(formatMoney(coursePrice));
    }
  };

  const handleDebtPayment = (index) => {
    setPaymentType("debt");
    handleDebtSelection(index);
    if (selectedStudent.info?.debts?.[index]) {
      let dAmt = parseMoney(selectedStudent.info.debts[index].debtAmount);
      if (dAmt > 0 && dAmt < 10000) dAmt = dAmt * 1000;
      setAmount(formatMoney(dAmt));
    }
  };

  const isAmountEqualCoursePrice = () => {
    return parseMoney(amount) === coursePrice;
  };

  // Summani tekshirish (10.000.000 gacha)
  const validateAmount = (numAmount) => {
    if (numAmount > 10000000) {
      // 10.000.000 dan katta bo'lsa
      toast.error("Maksimal to'lov miqdori 10.000.000 so'm");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    const numAmount = parseMoney(amount);

    if (!numAmount || numAmount <= 0) {
      toast.error("Summani kiriting!");
      return;
    }

    // Maksimal summani tekshirish
    if (!validateAmount(numAmount)) {
      return;
    }

    if (!paymentDate) {
      toast.error("Sanani tanlang!");
      return;
    }

    setSendingNotification(true);

    try {
      // To'lov summasini saqlab qolamiz (keyin ishlatish uchun)
      const paymentAmount = amount;
      const paymentAmountNum = numAmount;

      // To'lovni saqlash uchun amount ni to'g'ri formatda yuborish
      // amount = "2.500.000" bo'lsa, numAmount = 2500000 bo'ladi
      // handlePaymentSubmit ga numAmount ni yuboramiz

      // To'lovni saqlash
      await handlePaymentSubmit();

      // Telegram xabar yuborish uchun format
      const telegramAmount = formatMoneyForTelegram(paymentAmount);

      // Telegram xabar yuborish
      if (selectedStudent.telegramId) {
        const studentName =
          selectedStudent.studentName || selectedStudent.firstName || "";
        const studentLastName = selectedStudent.lastName || "";
        const formattedDate = formatUzbekDateReadable(paymentDate);

        const message = `<b>✅ TO'LOV QABUL QILINDI</b>\n\n👤 ${studentName} ${studentLastName}\n💰 Summa: <b>${telegramAmount}</b>\n📅 Sana: <b>${formattedDate}</b>\n🏷 Tur: <b>${paymentType === "debt" ? "Qarz to'lovi" : "Joriy to'lov"}</b>\n\n✨ To'lovingiz uchun rahmat!`;

        const result = await sendNotifications(
          [
            {
              telegramId: selectedStudent.telegramId,
              studentName: `${studentName} ${studentLastName}`.trim(),
              message: message,
              groupId: selectedStudent.groupId,
              studentId: selectedStudent.id,
              notificationType: "payment_success",
            },
          ],
          { showToast: false },
        );

        if (result.success) {
          toast.success(
            <div>
              <div className="font-bold">To'lov qabul qilindi</div>
              <div className="text-xs opacity-80 mt-1">
                {paymentAmount} so'm qabul qilindi va xabar yuborildi
              </div>
            </div>,
          );
        } else {
          toast.success(
            <div>
              <div className="font-bold">To'lov qabul qilindi</div>
              <div className="text-xs opacity-80 mt-1 text-orange-500">
                {paymentAmount} so'm qabul qilindi, lekin xabar yuborilmadi
              </div>
            </div>,
          );
        }
      } else {
        toast.success(
          <div>
            <div className="font-bold">To'lov qabul qilindi</div>
            <div className="text-xs opacity-80 mt-1">
              {paymentAmount} so'm qabul qilindi (Telegram ID yo'q)
            </div>
          </div>,
        );
      }

      setShowModal(false);
      setAmount("");
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Xatolik yuz berdi");
    } finally {
      setSendingNotification(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div
        className={`${
          theme === "light"
            ? `bg-white bg-slate-50 focus:bg-white text-slate-700 
                  resize-none [&::-webkit-scrollbar]:w-2
              [&::-webkit-scrollbar-track]:bg-gray-300
              [&::-webkit-scrollbar-track]:rounded-r-[300px]
              [&::-webkit-scrollbar-track]:m-1
              [&::-webkit-scrollbar-track]:rounded-2xl
              [&::-webkit-scrollbar-thumb]:bg-blue-500
              [&::-webkit-scrollbar-thumb]:rounded-l-[300px]
                [&::-webkit-scrollbar-thumb]:rounded-full
              hover:[&::-webkit-scrollbar-thumb]:bg-blue-700`
            : `bg-slate-800 bg-slate-700/50 text-slate-300
                    resize-none [&::-webkit-scrollbar]:w-2
              [&::-webkit-scrollbar-track]:bg-slate-500
              [&::-webkit-scrollbar-track]:rounded-r-[300px]
              [&::-webkit-scrollbar-track]:m-1
              [&::-webkit-scrollbar-thumb]:bg-blue-500
              [&::-webkit-scrollbar-thumb]:rounded-l-[300px]
                [&::-webkit-scrollbar-thumb]:rounded-full
              hover:[&::-webkit-scrollbar-thumb]:bg-blue-600
                    `
        } rounded-[40px] w-full max-w-lg shadow-2xl animate-in zoom-in duration-200 overflow-hidden relative max-h-[90vh] overflow-y-auto`}
      >
        <div
          className={`px-8 py-6 border-b flex justify-between items-center sticky top-0 z-10 ${
            selectedStudent.info?.status === "urgent"
              ? "bg-red-50 border-red-100"
              : selectedStudent.info?.isLastDay
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
              <PiStudent size={16} />{" "}
              {selectedStudent.studentName ||
                `${selectedStudent.firstName || ""} ${selectedStudent.lastName || ""}`.trim()}
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
          {/* Student Payment Info */}
          {showDebtInfo && (
            <div className="space-y-3">
              <div
                className={`p-4 rounded-2xl ${
                  theme === "light" ? "bg-amber-50" : "bg-amber-900/20"
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span
                    className={`text-xs font-bold uppercase ${
                      theme === "light" ? "text-amber-600" : "text-amber-400"
                    }`}
                  >
                    To'lov ma'lumotlari
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span
                      className={
                        theme === "light" ? "text-gray-600" : "text-gray-400"
                      }
                    >
                      Jami to'langan:
                    </span>
                    <span
                      className={`font-bold ${
                        theme === "light" ? "text-green-600" : "text-green-400"
                      }`}
                    >
                      {formatMoney(totalPaid)} so'm
                    </span>
                  </div>
                  {remainingDebt > 0 && (
                    <div className="flex justify-between text-sm">
                      <span
                        className={
                          theme === "light" ? "text-gray-600" : "text-gray-400"
                        }
                      >
                        Qolgan qarz:
                      </span>
                      <span className="font-bold text-red-500">
                        {formatMoney(remainingDebt)} so'm
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm border-t pt-2 mt-2 border-dashed">
                    <span
                      className={
                        theme === "light" ? "text-gray-600" : "text-gray-400"
                      }
                    >
                      Kurs narxi:
                    </span>
                    <span
                      className={`font-bold ${
                        theme === "light" ? "text-blue-600" : "text-blue-400"
                      }`}
                    >
                      {formatMoney(coursePrice)} so'm
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div
            className={`${theme === "light" ? "bg-slate-100" : "bg-slate-700/20"} flex p-1.5 rounded-2xl`}
          >
            {selectedStudent.info?.debts?.length > 0 && (
              <button
                onClick={() => handleDebtPayment(0)}
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
              onClick={handleRegularPayment}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                paymentType === "regular"
                  ? "bg-white shadow-md text-blue-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Joriy To'lov ({formatMoney(coursePrice)} so'm)
            </button>
          </div>

          {paymentType === "debt" &&
            selectedStudent.info?.debts?.length > 0 && (
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 capitalize ml-1">
                  Qarzni Tanlang
                </label>
                <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {selectedStudent.info.debts.map((debt, idx) => {
                    let dAmt = parseMoney(debt.debtAmount);
                    if (dAmt > 0 && dAmt < 10000) dAmt = dAmt * 1000;

                    return (
                      <div
                        key={idx}
                        onClick={() => handleDebtPayment(idx)}
                        className={`p-4 mt-1 rounded-2xl border cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-2 transition-all ${
                          selectedDebtCycleIndex === idx
                            ? "bg-red-400/10 text-red-400 inset-ring inset-ring-red-400/20"
                            : "bg-white border-slate-200 hover:border-red-300"
                        }`}
                      >
                        <div>
                          <p
                            className={`${theme === "light" ? "text-slate-600" : "text-slate-300"} text-xs font-bold uppercase`}
                          >
                            {formatUzbekDateReadable(debt.startDate)} —{" "}
                            {formatUzbekDateReadable(debt.endDate)}
                          </p>
                          <p className="text-[10px] text-red-400 font-medium">
                            To'lanmagan sana
                          </p>
                        </div>
                        <span
                          className={`${theme === "light" ? "text-slate-800" : "text-slate-200"} font-black`}
                        >
                          {formatMoney(dAmt)} so'm
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-1 md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">
                Summa (so'm)
              </label>
              <div className="relative">
                <FiDollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={`Masalan: 2.500.000`}
                  value={amount}
                  onChange={handleAmountChange}
                  onBlur={handleAmountBlur}
                  className={`${theme === "light" ? "bg-slate-50 focus:bg-white" : "bg-slate-700"} w-full border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 pl-10 pr-4 text-xl font-bold outline-none transition-all`}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {amount && (
                  <span>
                    Qiymat: {parseMoney(amount).toLocaleString()} so'm
                    {parseMoney(amount) > 10000000 && (
                      <span className="text-red-500 ml-2">
                        (10.000.000 dan oshib ketdi!)
                      </span>
                    )}
                  </span>
                )}
              </p>
            </div>
            <div className="col-span-1 md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">
                To'lov Sanasi
              </label>
              <div className="relative">
                <FiClock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  max={todayStr}
                  className={`${theme === "light" ? "bg-slate-50 focus:bg-white" : "bg-slate-700"} w-full border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 pl-10 pr-4 text-xl font-bold outline-none transition-all`}
                />
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          {amount && parseMoney(amount) > 0 && (
            <div
              className={`p-4 rounded-2xl ${
                theme === "light" ? "bg-blue-50" : "bg-blue-900/20"
              }`}
            >
              <p className="text-sm font-medium flex items-center gap-2">
                <FiDollarSign className="text-blue-500" />
                <span
                  className={
                    theme === "light" ? "text-blue-800" : "text-blue-300"
                  }
                >
                  To'lov summasi: {amount} so'm
                </span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                (Firebase'ga: {parseMoney(amount)} so'm)
              </p>

              {paymentType === "regular" &&
                coursePrice > 0 &&
                !isAmountEqualCoursePrice() && (
                  <p className="text-xs text-orange-500 mt-2">
                    ⚠️ Kurs narxi {formatMoney(coursePrice)} so'm dan farq
                    qilmoqda
                  </p>
                )}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={
              loading ||
              sendingNotification ||
              !amount ||
              parseMoney(amount) <= 0 ||
              parseMoney(amount) > 10000000
            }
            className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
              selectedStudent.info?.status === "urgent"
                ? "bg-red-600 hover:bg-red-700 shadow-red-200"
                : selectedStudent.info?.isLastDay
                  ? "bg-orange-600 hover:bg-orange-700 shadow-orange-200"
                  : `${theme === "light" ? "shadow-slate-200" : "shadow-slate-700"} bg-slate-900 hover:bg-slate-800`
            }`}
          >
            {loading || sendingNotification
              ? "Saqlanmoqda..."
              : "To'lovni Tasdiqlash"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
