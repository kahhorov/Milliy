import React from "react";
import { FiSearch } from "react-icons/fi";

const Filters = ({
  theme,
  searchQuery,
  setSearchQuery,
  selectedGroupId,
  setSelectedGroupId,
  groups,
}) => {
  return (
    <div
      className={`${theme === "light" ? "bg-white border border-slate-200" : "bg-slate-800/20 border border-[#2A2C31]"} rounded-2xl p-4 mb-8 flex flex-col md:flex-row gap-4 shadow-sm`}
    >
      <div className="relative flex-1">
        <FiSearch
          className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme === "light" ? "text-slate-400" : "text-slate-200"}`}
        />
        <input
          type="text"
          placeholder="O'quvchi ismini qidiring..."
          className={`${theme === "light" ? "bg-slate-50" : "bg-slate-700/40"} w-full rounded-2xl py-4 pl-12 pr-4 outline-none font-medium`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <select
        value={selectedGroupId}
        onChange={(e) => setSelectedGroupId(e.target.value)}
        className={`${theme === "light" ? "bg-slate-50 text-slate-700" : "bg-slate-700/40 text-slate-300"} w-full md:w-72 rounded-2xl py-4 px-5 outline-none font-bold cursor-pointer`}
      >
        <option value="">Guruhni tanlang...</option>
        {groups.map((g) => (
          <option
            key={g.id}
            value={g.id}
            className={`${theme === "light" ? "bg-slate-100" : "bg-slate-800 text-slate-300"}`}
          >
            {g.groupName}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Filters;
