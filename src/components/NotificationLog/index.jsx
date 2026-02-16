import React from "react";
import { FiBell } from "react-icons/fi";

const NotificationLog = ({ notificationLog, theme }) => {
  if (notificationLog.length === 0) return null;

  return (
    <div
      className={`mt-6 rounded-2xl p-4 ${theme === "light" ? "bg-white border border-slate-200" : "bg-slate-800/20 border border-slate-500/50"}`}
    >
      <h3
        className={`font-bold mb-2 flex items-center gap-2 ${theme === "light" ? "text-slate-800" : "text-slate-100"}`}
      >
        <FiBell /> So'nggi Xabarlar Tarixi
      </h3>
      <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
        {notificationLog.map((log, idx) => (
          <div
            key={idx}
            className={`text-sm border-l-4 px-3 py-2 rounded-md ${theme === "light" ? "bg-slate-50" : "bg-slate-800 "} ${
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
                      ? `${theme === "light" ? "text-slate-600" : "text-slate-200"}`
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
