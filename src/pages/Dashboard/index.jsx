import { useTranslation } from "react-i18next";
import { LuLayoutDashboard } from "react-icons/lu";

function Dashboard() {
  const { t } = useTranslation();
  return (
    <div>
      <span className="w-full inline-flex items-center gap-3 rounded-md bg-gray-700/10 p-4 text-xs font-medium text-gray-300 inset-ring inset-ring-gray-500/20 select-none">
        <LuLayoutDashboard size={16} />
        {t("Dashboard")}
      </span>
    </div>
  );
}

export default Dashboard;
