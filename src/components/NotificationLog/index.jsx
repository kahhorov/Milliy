import React, { useEffect, useState } from "react";
import { FiBell } from "react-icons/fi";

const NotificationLog = ({ notificationLog, theme }) => {
  // 1. Ekranda ko'rsatish uchun ichki state yaratamiz
  const [savedLogs, setSavedLogs] = useState([]);

  useEffect(() => {
    // 2. Sahifa yuklanganda LocalStorage-dan o'qib olish
    const storedData = localStorage.getItem("notification_history");
    const parsedData = storedData ? JSON.parse(storedData) : [];

    // Hozirgi vaqt
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000; // 24 soat (millisekundda)

    // 3. Faqat 24 soat ichidagi xabarlarni saralab olish (Eskilarni o'chirish)
    const validLogs = parsedData.filter((item) => {
      // Agar saqlangan vaqti bo'lmasa yoki 24 soatdan oshgan bo'lsa, o'chirib tashlaymiz
      return item._savedAt && now - item._savedAt < oneDay;
    });

    setSavedLogs(validLogs);
  }, []);

  // 4. Yangi xabar kelganda (props o'zgarganda) ishlaydigan qism
  useEffect(() => {
    if (notificationLog && notificationLog.length > 0) {
      setSavedLogs((prevLogs) => {
        // Yangi kelgan xabarlarga vaqt tamg'asi (timestamp) qo'shamiz
        const newItemsWithTime = notificationLog.map((item) => ({
          ...item,
          _savedAt: item._savedAt || Date.now(), // Agar vaqti bo'lmasa, hozirgi vaqtni qo'yamiz
        }));

        // Eski va yangi ro'yxatni birlashtiramiz
        // Muhim: Takrorlanishni oldini olish uchun oddiy tekshiruv (JSON string orqali)
        const combined = [...prevLogs, ...newItemsWithTime];

        // Dublikatlarni olib tashlash (bir xil xabar qayta yozilmasligi uchun)
        const uniqueLogs = combined.filter(
          (v, i, a) =>
            a.findIndex(
              (t) =>
                JSON.stringify(t.date) === JSON.stringify(v.date) &&
                t.count === v.count,
            ) === i,
        );

        // Faqat oxirgi 10 tani olamiz
        const last10 = uniqueLogs.slice(-10);

        // LocalStorage-ga saqlaymiz
        localStorage.setItem("notification_history", JSON.stringify(last10));

        return last10;
      });
    }
  }, [notificationLog]);

  // 5. Agar xabarlar tarixi bo'sh bo'lsa, hech narsa ko'rsatma (Avto yashirish)
  if (savedLogs.length === 0) return null;

  return (
    <div
      className={`mt-6 rounded-2xl p-4 ${
        theme === "light"
          ? "bg-white border border-slate-200"
          : "bg-slate-800/20 border border-slate-500/50"
      }`}
    >
      <h3
        className={`font-bold mb-2 flex items-center gap-2 ${
          theme === "light" ? "text-slate-800" : "text-slate-100"
        }`}
      >
        <FiBell /> So'nggi Xabarlar Tarixi
      </h3>
      <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
        {/* State-dagi (localStorage-dan olingan) ma'lumotni map qilamiz */}
        {/* Slice(-10) bu yerda shart emas, chunki saqlashda allaqachon 10 ta qilyapmiz, lekin ehtiyot shart turaversin */}
        {[...savedLogs].reverse().map((log, idx) => (
          <div
            key={idx}
            className={`text-sm border-l-4 px-3 py-2 rounded-md ${
              theme === "light" ? "bg-slate-50" : "bg-slate-800 "
            } ${
              log.type === "payment"
                ? "border-emerald-500"
                : log.type === "manual"
                  ? "border-blue-500"
                  : "border-orange-500"
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="font-medium">{log.date}</span>
              <span
                className={`font-bold ${
                  log.type === "payment"
                    ? "text-emerald-600"
                    : log.type === "manual"
                      ? "text-blue-600"
                      : "text-orange-600"
                }`}
              >
                {log.count} ta xabar
              </span>
            </div>
            <div className="mt-1">
              {log.details.map((detail, i) => (
                <p
                  key={i}
                  className={`text-[11px] ${
                    detail.status === "success"
                      ? `${
                          theme === "light"
                            ? "text-slate-600"
                            : "text-slate-200"
                        }`
                      : "text-red-500"
                  }`}
                >
                  - {detail.student}:{" "}
                  {detail.type === "manual"
                    ? "Shaxsiy xabar"
                    : detail.type === "payment_confirmation"
                      ? "To'lov tasdiqlandi"
                      : detail.type === "debt"
                        ? "Qarzdorlik eslatmasi"
                        : detail.type === "last_day_warning"
                          ? "Oxirgi kun ogohlantirishi"
                          : "Muddat eslatmasi"}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationLog;
