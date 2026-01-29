import React, { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { Table, Loader, Panel, PanelGroup, Input, InputGroup } from "rsuite";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  LuUsers,
  LuCheck,
  LuX,
  LuSearch,
  LuClock,
  LuCalendarDays,
  LuTrendingUp,
  LuClipboardX,
} from "react-icons/lu";
import { useTranslation } from "react-i18next";

const DailyAttendance = () => {
  const theme = useSelector((state) => state.theme.value);
  const isDark = theme === "dark";

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { t } = useTranslation();

  useEffect(() => {
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0];
    const q = query(collection(db, "attendance"), where("date", "==", dateStr));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const sortedData = data.sort((a, b) => {
          const timeA = a.createdAt?.seconds || a.createdAt || 0;
          const timeB = b.createdAt?.seconds || b.createdAt || 0;

          if (timeA !== 0 || timeB !== 0) {
            return timeB - timeA;
          }
          return b.id.localeCompare(a.id);
        });

        setGroups(sortedData);
        setLoading(false);
      },
      () => setLoading(false),
    );

    return () => unsubscribe();
  }, []);

  const filteredGroups = groups.filter((g) =>
    g.groupName?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const stats = useMemo(() => {
    return filteredGroups.reduce(
      (acc, g) => {
        const absent =
          (g.totalStudents || 0) - (g.presentCount || 0) - (g.lateCount || 0);
        acc.present += g.presentCount || 0;
        acc.late += g.lateCount || 0;
        acc.absent += absent > 0 ? absent : 0;
        return acc;
      },
      { present: 0, late: 0, absent: 0 },
    );
  }, [filteredGroups]);

  const glassClass = isDark
    ? "bg-white/[0.03] border-white/10 backdrop-blur-md"
    : "bg-white/80 border-slate-200 backdrop-blur-md";

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center bg-transparent">
        <Loader size="lg" content={t("Loading")} vertical />
      </div>
    );

  return (
    <div
      className={`min-h-screen p-4 md:p-8 transition-colors duration-500 ${
        isDark ? "text-white" : "text-slate-800"
      }`}
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-black italic tracking-tighter flex items-center gap-2">
              {t("DAILY")}{" "}
              <span className="text-cyan-500 underline decoration-4">
                {t("ATTENDANCE")}
              </span>
            </h1>
            <p className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-50 mt-1">
              {t("Group Attendance & Analysis")}
            </p>
          </div>
          <InputGroup
            inside
            className={`!rounded-md  !w-full md:!w-80 h-12 ${glassClass}`}
          >
            <Input
              placeholder={t("Search group")}
              value={searchTerm}
              onChange={setSearchTerm}
              className="!bg-transparent px-4"
            />
            <InputGroup.Addon className="!bg-transparent pr-4">
              <LuSearch size={18} />
            </InputGroup.Addon>
          </InputGroup>
        </div>

        {/* ANALYTICS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div
            className={`lg:col-span-2 p-6 rounded-[2.5rem] border ${glassClass}`}
          >
            <h5 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-6">
              <LuTrendingUp className="text-cyan-500" />
              {t("Graphic statics")}
            </h5>
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={filteredGroups.map((g) => ({
                    name: g.groupName,
                    K: g.presentCount || 0,
                    Ke: g.lateCount || 0,
                    Yo:
                      (g.totalStudents || 0) -
                      (g.presentCount || 0) -
                      (g.lateCount || 0),
                  }))}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={isDark ? "#ffffff10" : "#00000010"}
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: isDark ? "#888" : "#444", fontSize: 10 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: isDark ? "#888" : "#444", fontSize: 10 }}
                  />
                  <Tooltip
                    cursor={{ fill: "transparent" }}
                    contentStyle={{
                      borderRadius: "16px",
                      border: "none",
                      background: isDark ? "#1a1a1a" : "#fff",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Bar
                    dataKey="K"
                    name={t("Present")}
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    barSize={10}
                  />
                  <Bar
                    dataKey="Ke"
                    name={t("Late")}
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                    barSize={10}
                  />
                  <Bar
                    dataKey="Yo"
                    name={t("Absent")}
                    fill="#ef4444"
                    radius={[4, 4, 0, 0]}
                    barSize={10}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div
            className={`p-6 rounded-[2.5rem] border flex flex-col items-center justify-center relative min-h-[300px] ${glassClass}`}
          >
            <h5 className="text-xs font-black uppercase tracking-widest absolute top-8 left-8">
              {t("Overview")} %
            </h5>
            <div className="h-60 w-full relative">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={[
                      { name: t("Present"), value: stats.present },
                      { name: t("Late"), value: stats.late },
                      { name: t("Absent"), value: stats.absent },
                    ]}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#f59e0b" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center -z-10">
                <p className="text-3xl font-black leading-none">
                  {stats.present + stats.late + stats.absent}
                </p>
                <p className="text-[10px] uppercase font-bold opacity-40 mt-1">
                  {t("Student")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ACCORDION GROUP & EMPTY STATE */}
        {filteredGroups.length > 0 ? (
          <PanelGroup accordion className="space-y-2">
            {filteredGroups.map((group) => {
              const abs =
                (group.totalStudents || 0) -
                (group.presentCount || 0) -
                (group.lateCount || 0);
              return (
                <Panel
                  key={group.id}
                  header={
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full pr-4 gap-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl text-white shadow-lg shadow-cyan-500/20">
                          <LuUsers size={22} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-black tracking-tight">
                              {group.groupName}
                            </h3>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-100 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-xl">
                              <LuCalendarDays size={13} />
                              <span className="text-[11px] font-black">
                                {t(group.day)}
                              </span>
                            </div>
                          </div>
                          <p className="text-[10px] font-bold opacity-50 uppercase mt-1 tracking-widest flex items-center gap-1">
                            <LuClock size={12} /> {group.lessonTime}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {[
                          { v: group.presentCount, c: "emerald", label: "K" },
                          { v: group.lateCount, c: "amber", label: "Ke" },
                          { v: abs > 0 ? abs : 0, c: "red", label: "Yo" },
                        ].map((item, i) => (
                          <div
                            key={i}
                            className={`min-w-10 h-10 flex flex-col items-center justify-center rounded-xl bg-${item.c}-500/10 border border-${item.c}-500/20`}
                          >
                            <span
                              className={`text-${item.c}-500 text-xs font-black`}
                            >
                              {item.v}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  }
                  className={`${theme === "light" ? "!border-gray-200 !border" : "!border-gray-700 !border"} overflow-hidden ${glassClass} transition-all duration-300`}
                >
                  <div className="overflow-x-auto">
                    <Table
                      data={group.attendance || []}
                      autoHeight
                      rowHeight={70}
                      headerHeight={45}
                      className="!bg-transparent"
                    >
                      <Table.Column flexGrow={1} minWidth={180}>
                        <Table.HeaderCell className="!text-[10px] font-black opacity-70 uppercase tracking-widest">
                          {t("Student")}
                        </Table.HeaderCell>
                        <Table.Cell>
                          {(rowData) => (
                            <div className="flex flex-col justify-center h-full">
                              <span className="font-black text-[13px] uppercase tracking-tight text-cyan-500">
                                {rowData.studentName || t("No name entered")}
                              </span>
                              <span className="text-[11px] font-bold opacity-40 italic">
                                {rowData.lastName || t("Last name not entered")}
                              </span>
                            </div>
                          )}
                        </Table.Cell>
                      </Table.Column>

                      <Table.Column width={150}>
                        <Table.HeaderCell className="!text-[10px] font-black opacity-70 uppercase tracking-widest">
                          {t("phone")}
                        </Table.HeaderCell>
                        <Table.Cell>
                          {(rowData) => (
                            <div className="flex items-center h-full">
                              <span className="font-mono text-xs opacity-70 px-2 py-1 flex">
                                <span
                                  className={`${theme === "dark" ? "bg-gray-600/50" : "bg-gray-200/50"} rounded-2xl px-1 flex items-center justify-center`}
                                >
                                  +998
                                </span>
                                {rowData.phoneNumber}
                              </span>
                            </div>
                          )}
                        </Table.Cell>
                      </Table.Column>

                      <Table.Column width={160} align="right">
                        <Table.HeaderCell className="!text-[10px] font-black opacity-70 uppercase tracking-widest">
                          {t("Attendance Status")}
                        </Table.HeaderCell>
                        <Table.Cell>
                          {(rowData) => {
                            const status = rowData.status?.toLowerCase();
                            const isL = status === "late";
                            const isP = status === "present";

                            let statusLabel = "";
                            if (isP) statusLabel = t("Present");
                            else if (isL)
                              statusLabel = rowData.delay
                                ? `${rowData.delay}`
                                : t("Late");
                            else statusLabel = t("Absent");

                            return (
                              <div className="flex items-center justify-end h-full">
                                <div
                                  className={`flex items-center gap-2 px-3 py-1 rounded-2xl border transition-all ${
                                    isP
                                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                      : isL
                                        ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                        : "bg-red-500/10 text-red-600 border-red-500/20"
                                  }`}
                                >
                                  {isP ? (
                                    <LuCheck
                                      size={16}
                                      className="stroke-[3px]"
                                    />
                                  ) : isL ? (
                                    <LuClock
                                      size={16}
                                      className="stroke-[3px]"
                                    />
                                  ) : (
                                    <LuX size={16} className="stroke-[3px]" />
                                  )}
                                  <span className="font-black text-[11px] uppercase tracking-wider">
                                    {statusLabel}
                                  </span>
                                </div>
                              </div>
                            );
                          }}
                        </Table.Cell>
                      </Table.Column>
                    </Table>
                  </div>
                </Panel>
              );
            })}
          </PanelGroup>
        ) : (
          <div
            className={`flex flex-col items-center justify-center py-20 rounded-[2.5rem] border border-dashed ${
              isDark ? "border-white/10" : "border-slate-300"
            } ${glassClass}`}
          >
            <div className="p-6 bg-slate-500/10 rounded-full mb-4">
              <LuClipboardX size={48} className="opacity-20" />
            </div>
            <h3 className="text-xl font-black opacity-50">
              {t("No attendance found")}
            </h3>
            <p className="text-[10px] font-bold opacity-30 tracking-[0.1rem] mt-1">
              {t("Today no attendance")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(DailyAttendance);
