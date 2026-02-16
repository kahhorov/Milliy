import { useSelector } from "react-redux";

const StatCard = ({ icon, label, value, color, isMoney, animate }) => {
  const theme = useSelector((state) => state.theme.value);

  const styles = {
    blue: "text-blue-600 bg-blue-50 border-blue-100",
    green: "text-emerald-600 bg-emerald-50 border-emerald-100",
    red: "text-red-600 bg-red-50 border-red-100",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
    orange: "text-orange-600 bg-orange-50 border-orange-100",
  };

  return (
    <div
      className={`${theme === "light" ? "hover:shadow-lg bg-linear-to-br from-slate-50 hover:from-slate-100 hover:to-slate-50 to-slate-100 border border-slate-100" : "hover:shadow-slate-700/40 shadow-md bg-linear-to-br from-gray-700/60 hover:from-gray-800/20 hover:to-slate-700/60 to-slate-800/20 border border-slate-500/20"} p-5 rounded-3xl shadow-md flex items-center gap-4 transition-all duration-700
      ${animate ? "ring-2 ring-red-500/40 animate-pulse bg-linear-to-br from-red-500/30" : ""}
      `}
    >
      <div
        className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border ${styles[color]}`}
      >
        {icon}
      </div>
      <div>
        <p
          className={`${theme === "light" ? " text-slate-400" : " text-slate-100"} text-[10px] font-bold uppercase tracking-wider`}
        >
          {label}
        </p>
        <p
          className={`${theme === "light" ? "text-slate-800" : "text-slate-100"} font-black ${
            isMoney ? "text-lg" : "text-3xl"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
};

export default StatCard;
