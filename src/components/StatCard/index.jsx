import { useSelector } from "react-redux";
import { useMemo } from "react";

// Raqamlarni nuqtalar bilan ajratish (1000000 -> 1.000.000)
const formatMoney = (num) => {
  if (num === null || num === undefined) return "0";
  const value = typeof num === "string" ? parseFloat(num) : num;
  if (isNaN(value)) return "0";
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const StatCard = ({ icon, label, value, color, isMoney, animate }) => {
  const theme = useSelector((state) => state.theme.value);

  const styles = {
    blue: "text-blue-600 bg-blue-50 border-blue-100",
    green: "text-emerald-600 bg-emerald-50 border-emerald-100",
    red: "text-red-600 bg-red-50 border-red-100",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
    orange: "text-orange-600 bg-orange-50 border-orange-100",
  };

  const darkStyles = {
    blue: "text-blue-300 bg-blue-900/30 border-blue-800",
    green: "text-emerald-300 bg-emerald-900/30 border-emerald-800",
    red: "text-red-300 bg-red-900/30 border-red-800",
    emerald: "text-emerald-300 bg-emerald-900/30 border-emerald-800",
    orange: "text-orange-300 bg-orange-900/30 border-orange-800",
  };

  // 1. Asosiy qiymatni hisoblash (API dan 1000 kelsa -> 1.000.000 qilamiz)
  const { actualValue, isLarge } = useMemo(() => {
    let numValue = 0;
    if (value !== null && value !== undefined) {
      numValue = typeof value === "string" ? parseFloat(value) : value;
      if (isNaN(numValue)) numValue = 0;
    }

    // MUHIM: Baza kichraytirilgan formatda (masalan 250 -> 250 ming) bo'lsa
    // 1000 ga ko'paytiramiz.
    const calculatedValue = isMoney ? numValue * 1000 : numValue;

    return {
      actualValue: calculatedValue,
      isLarge: calculatedValue > 999000, // 999.000 dan kattaligini tekshirish
    };
  }, [value, isMoney]);

  // 2. Katta yozuvdagi format ("1.000.000 so'm")
  const formattedValue = useMemo(() => {
    if (!isMoney) return value?.toString() || "0";
    return `${formatMoney(actualValue)} so'm`;
  }, [actualValue, isMoney, value]);

  // 3. Pastki qismdagi qo'shimcha yozuv ("(1 million)")
  const additionalFormat = useMemo(() => {
    if (!isMoney || actualValue === 0) return null;

    if (actualValue >= 1000000000) {
      const billions = Math.floor(actualValue / 1000000000);
      const remainder = actualValue % 1000000000;
      const remainderInMillions = Math.floor(remainder / 1000000);
      return remainder === 0
        ? `(${billions} milliard)`
        : `(${billions} milliard ${remainderInMillions} million)`;
    } else if (actualValue >= 1000000) {
      const millions = Math.floor(actualValue / 1000000);
      const remainder = actualValue % 1000000;
      const remainderInThousands = Math.floor(remainder / 1000);
      return remainder === 0
        ? `(${millions} million)`
        : `(${millions} million ${remainderInThousands} ming)`;
    } else if (actualValue >= 1000) {
      const thousands = Math.floor(actualValue / 1000);
      const remainder = actualValue % 1000;
      return remainder === 0
        ? `(${thousands} ming)`
        : `(${thousands} ming ${remainder})`;
    }
    return null;
  }, [actualValue, isMoney]);

  // Rangni olish
  const getColorClass = () => {
    return theme === "light"
      ? styles[color] || styles.blue
      : darkStyles[color] || darkStyles.blue;
  };

  // 4. Text o'lchamini dinamik o'zgartirish (Shrink text)
  const getTextSizeClass = () => {
    if (!isMoney) return "text-3xl";
    // Summa 999 mingdan katta bo'lsa "text-lg" (kichikroq), bo'lmasa "text-xl" yoki "text-2xl" bo'ladi
    return isLarge ? "text-lg" : "text-xl";
  };

  return (
    <div
      className={`${
        theme === "light"
          ? "hover:shadow-lg bg-linear-to-br from-slate-50 hover:from-slate-100 hover:to-slate-50 to-slate-100 border border-slate-100"
          : "hover:shadow-slate-700/40 shadow-md bg-linear-to-br from-gray-700/60 hover:from-gray-800/20 hover:to-slate-700/60 to-slate-800/20 border border-slate-500/20"
      } p-5 rounded-3xl shadow-md flex items-center gap-4 transition-all duration-700
      ${
        animate
          ? "ring-2 ring-red-500/40 animate-pulse bg-linear-to-br from-red-500/30"
          : ""
      }`}
    >
      <div
        className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border ${getColorClass()}`}
      >
        {icon}
      </div>
      <div className="flex-1">
        <p
          className={`${
            theme === "light" ? "text-slate-400" : "text-slate-100"
          } text-[10px] font-bold uppercase tracking-wider`}
        >
          {label}
        </p>
        <div className="flex flex-col gap-1">
          {/* Asosiy summa yozuvi */}
          <p
            className={`${
              theme === "light" ? "text-slate-800" : "text-slate-100"
            } font-black ${getTextSizeClass()} transition-all duration-300`}
          >
            {formattedValue}
          </p>

          {/* Pastki "(1 million)" yozuvi */}
          {additionalFormat && (
            <span
              className={`text-xs ${
                theme === "light" ? "text-slate-500" : "text-slate-400"
              }`}
            >
              {additionalFormat}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
