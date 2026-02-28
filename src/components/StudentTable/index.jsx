import React from "react";
import {
  FiAlertCircle,
  FiAlertTriangle,
  FiCheckCircle,
  FiUsers,
} from "react-icons/fi";
import { FaTelegramPlane } from "react-icons/fa";
import { useTranslation } from "react-i18next";

const StudentTable = ({
  theme,
  selectedGroupId,
  calculatedStudents,
  searchQuery,
  openPaymentModal,
  formatMoney,
}) => {
  const { t } = useTranslation();
  if (!selectedGroupId) {
    return (
      <div
        className={`py-24 text-center rounded-2xl border ${
          theme === "light"
            ? "bg-white border-slate-200 text-slate-500"
            : "bg-slate-800/40 border-slate-700 text-slate-300"
        }`}
      >
        <FiUsers size={48} className="mx-auto mb-4 opacity-30" />
        <p className="text-base font-medium">{t("Select group to attend")}</p>
        <p className="text-sm mt-2">{t("No group selected!")}</p>
      </div>
    );
  }

  return (
    <div
      className={`${theme === "light" ? "bg-white border border-slate-200" : "bg-slate-800/20 text-slate-300 border border-slate-700"} rounded-2xl shadow-sm overflow-hidden`}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead
            className={`${theme === "light" ? "bg-slate-50 border-b border-slate-100 text-slate-400" : "bg-slate-800/40"} text-[10px] uppercase font-black tracking-widest select-none`}
          >
            <tr>
              <th className="py-6 px-8">{t("Student")}</th>
              <th className="py-6 px-6 text-center">
                {t("payments.currentStatus")} (
                {calculatedStudents[0]?.info?.currentCycle?.totalLessons || 12}{" "}
                {t("Lessons")})
              </th>
              <th className="py-6 px-6 text-center">{t("Status")}</th>
              <th className="py-6 px-8 text-center">
                {t("payments.debtOrBalance")}
              </th>
              <th className="py-6 px-8 text-center">{t("Note")}</th>
              <th className="py-6 px-8 text-right">{t("Action")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {calculatedStudents
              ?.filter((s) =>
                (s.studentName || s.firstName || "")
                  .toLowerCase()
                  .includes(searchQuery.toLowerCase()),
              )
              .map((student) => {
                // Xavfsiz ma'lumot olish
                const info = student.info || {};
                const currentCycle = info.currentCycle || {};

                const isUrgent = info.status === "urgent";
                const isCritical = info.status === "critical";
                const isWarning = info.status === "warning";
                const isExpired = info.status === "expired";
                const isLastDay = info.isLastDay;
                const needsNotification = info.needNotification;
                const hasTelegramId = !!student.telegramId;

                // Darslar sonini xavfsiz oʻzgaruvchiga olish
                const lessonsPassed = currentCycle.lessonsPassed ?? 0;
                const lessonsLeft = currentCycle.lessonsLeft ?? 0;
                const totalLessons = currentCycle.totalLessons ?? 12;
                const isPaid = !!currentCycle.isPaid;
                const canMakePayment = true;

                return (
                  <tr
                    key={student.id}
                    className={`${theme === "light" ? "hover:bg-slate-50/50" : "hover:bg-slate-600/20"} transition-all duration-300 ${
                      isUrgent ? "bg-red-500/30" : ""
                    } ${isLastDay ? "bg-orange-500/30" : ""}`}
                  >
                    {/* Name */}
                    <td className="py-5 px-8">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg 
                          ${
                            isUrgent
                              ? "bg-red-100 text-red-600 animate-pulse"
                              : isLastDay
                                ? "bg-orange-100 text-orange-600"
                                : "bg-blue-100 text-blue-600"
                          }`}
                        >
                          {(
                            student.studentName ||
                            student.firstName ||
                            "'"
                          ).charAt(0)}
                        </div>
                        <div>
                          <p
                            className={`${theme === "light" ? "text-slate-800" : "text-slate-200"} font-bold flex items-center gap-2`}
                          >
                            {`${student.studentName || ""} ${student.lastName || ""}`}
                          </p>
                          <p className="text-xs text-slate-400">
                            {student.phoneNumber || t("No phone number")}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Progress Bar */}
                    <td className="py-5 px-6 text-center">
                      <div
                        className={`text-sm font-bold mb-1 
                        ${
                          isUrgent
                            ? "text-red-600 animate-bounce"
                            : isCritical
                              ? "text-red-500"
                              : isWarning
                                ? "text-orange-500"
                                : isLastDay
                                  ? "text-orange-600"
                                  : `${theme === "light" ? "text-slate-600" : "text-slate-200"}`
                        }`}
                      >
                        {isUrgent
                          ? t("payments.paymentRequired")
                          : isLastDay
                            ? t("payments.lastDayPaymentNeeded")
                            : `${lessonsPassed} / ${totalLessons} ${t("Lessons")}`}
                      </div>
                      <div className="w-32 h-2 bg-slate-200 rounded-full mx-auto overflow-hidden relative">
                        <div
                          className={`h-full rounded-full transition-all duration-500 
                          ${
                            isPaid
                              ? "bg-emerald-500"
                              : isUrgent
                                ? "bg-red-600 w-full animate-pulse"
                                : isCritical
                                  ? "bg-red-500"
                                  : isWarning
                                    ? "bg-orange-400"
                                    : isLastDay
                                      ? "bg-orange-500 w-full"
                                      : "bg-blue-500"
                          }`}
                          style={{
                            width:
                              isUrgent || isLastDay
                                ? "100%"
                                : `${(lessonsPassed / totalLessons) * 100}%`,
                          }}
                        ></div>
                      </div>
                      <div
                        className={`${theme === "light" ? "text-slate-500" : "text-slate-200"} text-xs mt-1`}
                      >
                        {isLastDay
                          ? t("payments.lastLesson")
                          : t("payments.lessonsLeft", { count: lessonsLeft })}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-5 px-6 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-black tracking-wider shadow-sm border
                        ${
                          isUrgent
                            ? "bg-red-600 text-white border-red-600 animate-pulse"
                            : isCritical
                              ? `${theme === "light" ? "bg-red-100 text-red-600 border-red-200" : "bg-red-400/10 px-2 py-1 text-xs font-medium text-red-400 inset-ring inset-ring-red-400/20"}`
                              : isWarning
                                ? "bg-yellow-400/10 text-yellow-500 inset-ring inset-ring-yellow-400/20"
                                : isExpired
                                  ? `bg-rose-300/10 px-2 py-1 text-xs font-medium text-rose-400 inset-ring inset-ring-rose-400/20`
                                  : isLastDay
                                    ? "bg-orange-600 text-white border-orange-600"
                                    : info.status === "paid"
                                      ? "bg-green-400/10 font-medium text-green-400 inset-ring inset-ring-green-500/20"
                                      : "bg-gray-400/10 text-gray-400 inset-ring inset-ring-gray-400/20"
                        }`}
                      >
                        {isUrgent && <FiAlertCircle size={12} />}
                        {isLastDay && <FiAlertTriangle size={12} />}
                        {info.badgeText || t("payments.noStatus")}
                      </span>
                    </td>

                    {/* Money / Debt */}
                    <td className="py-5 px-8 text-center">
                      {info.debts?.length > 0 ? (
                        <div className="flex flex-col items-center">
                          <span className="text-red-400 font-bold text-sm">
                            -{" "}
                            {formatMoney(
                              info.debts.reduce(
                                (a, b) => a + (b.debtAmount || 0),
                                0,
                              ),
                            )}
                          </span>
                          <span className="text-[9px] text-red-400 font-bold uppercase">
                            {t("Debt")}
                          </span>
                        </div>
                      ) : info.balance > 0 ? (
                        <div className="flex flex-col items-center">
                          <span className="text-emerald-600 font-bold text-sm">
                            + {formatMoney(info.balance)}
                          </span>
                          <span className="text-[9px] text-emerald-400 font-bold uppercase">
                            {t("payments.inBalance")}
                          </span>
                        </div>
                      ) : isPaid ? (
                        <div className="flex flex-col items-center">
                          <span className="text-emerald-600 font-bold text-sm">
                            + {formatMoney(info.coursePrice || 0)}
                          </span>
                          <span className="text-[9px] text-emerald-400 font-bold uppercase">
                            {t("Paid")}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs font-medium">
                          0 UZS
                        </span>
                      )}
                    </td>

                    {/* Notification Indicator */}
                    <td className="py-5 px-8 text-center">
                      {needsNotification ? (
                        <div className="flex flex-col items-center">
                          {hasTelegramId ? (
                            <>
                              <div
                                className={`w-3 h-3 rounded-full animate-pulse ${isLastDay ? "bg-orange-500" : "bg-green-500"}`}
                              ></div>

                              <span
                                className={`text-[10px] font-bold mt-1 ${isLastDay ? "text-orange-500" : "text-green-500"}`}
                              >
                                {isLastDay
                                  ? t("payments.lastDayMessageSent")
                                  : t("payments.messageSent")}
                              </span>
                            </>
                          ) : (
                            <>
                              <div className="w-3 h-3 bg-slate-300 rounded-full"></div>
                              <span className="text-[10px] text-slate-400 font-bold mt-1">
                                {t("payments.noTelegramId")}
                              </span>
                            </>
                          )}
                        </div>
                      ) : isPaid ? (
                        <div className="flex flex-col items-center">
                          <FiCheckCircle className="text-emerald-500" />
                          <span className="text-[10px] text-emerald-500 font-bold mt-1">
                            {t("Paid")}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs">-</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-5 px-8 w-[170px] text-right">
                      <button
                        onClick={() =>
                          canMakePayment && openPaymentModal(student)
                        }
                        disabled={!canMakePayment}
                        className={`px-3 py-1 cursor-pointer rounded-full border transition-all shadow-sm active:scale-95
                        ${
                          isUrgent || isCritical || isExpired
                            ? `bg-red-600 border-red-600 text-white shadow-red-300/20 hover:bg-red-700 hover:shadow-lg animate-pulse`
                            : isLastDay
                              ? "bg-orange-600 border-orange-600 text-white shadow-orange-200 hover:bg-orange-700 hover:shadow-lg"
                              : isWarning
                                ? "bg-amber-400/20 text-yellow-500 inset-ring inset-ring-yellow-400/20 hover:bg-amber-400/20"
                                : "bg-blue-400/10 text-blue-400 inset-ring inset-ring-blue-400/30 hover:bg-blue-400/20 "
                        }`}
                      >
                        {t("payments.makePayment")}
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentTable;
