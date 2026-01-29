import React, { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import {
  Table,
  Loader,
  Panel,
  PanelGroup,
  Input,
  InputGroup,
  SelectPicker,
  Button,
  Stack,
  IconButton,
  Modal,
  CheckPicker,
} from "rsuite";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
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
  Legend,
} from "recharts";
import {
  LuUsers,
  LuCheck,
  LuX,
  LuSearch,
  LuClock,
  LuCalendarDays,
  LuTrendingUp,
  LuDownload,
  LuTrash2,
  LuPhone,
  LuInbox,
} from "react-icons/lu";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

const AttendanceManagement = () => {
  const theme = useSelector((state) => state.theme.value);
  const isDark = theme === "dark";
  const { t } = useTranslation();

  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [timeFilter, setTimeFilter] = useState("3months");

  // Export Modal States
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportRange, setExportRange] = useState("all");
  const [selectedGroupNames, setSelectedGroupNames] = useState([]);

  // 1. DATA FETCHING & AUTO-CLEANUP
  useEffect(() => {
    const q = query(collection(db, "attendance"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = new Date();
      const ninetyDaysInMs = 90 * 24 * 60 * 60 * 1000;

      const data = snapshot.docs
        .map((d) => {
          const item = { id: d.id, ...d.data() };
          const createdDate = item.createdAt?.seconds
            ? new Date(item.createdAt.seconds * 1000)
            : new Date(item.date);

          if (now - createdDate > ninetyDaysInMs) {
            deleteDoc(doc(db, "attendance", d.id));
            return null;
          }

          const abs =
            (item.totalStudents || 0) -
            (item.presentCount || 0) -
            (item.lateCount || 0);
          return {
            ...item,
            jsDate: createdDate,
            absentCount: abs > 0 ? abs : 0,
          };
        })
        .filter(Boolean);

      setAttendanceData(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. FILTERS
  const filteredGroups = useMemo(() => {
    const now = new Date();
    return attendanceData.filter((group) => {
      const groupDate = group.jsDate;
      let matchesTime = true;
      if (timeFilter === "daily")
        matchesTime = groupDate.toDateString() === now.toDateString();
      if (timeFilter === "weekly")
        matchesTime =
          groupDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const matchesSearch = group.groupName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());
      return matchesTime && matchesSearch;
    });
  }, [attendanceData, timeFilter, searchTerm]);

  // 3. ANALYTICS
  const stats = useMemo(() => {
    return filteredGroups.reduce(
      (acc, g) => {
        acc.present += g.presentCount || 0;
        acc.late += g.lateCount || 0;
        acc.absent += g.absentCount || 0;
        return acc;
      },
      { present: 0, late: 0, absent: 0 },
    );
  }, [filteredGroups]);

  const pieData = [
    { name: t("Kelgan"), value: stats.present, color: "#10b981" },
    { name: t("Kechikkan"), value: stats.late, color: "#f59e0b" },
    { name: t("Kelmagan"), value: stats.absent, color: "#ef4444" },
  ];

  const chartData = useMemo(() => {
    const latestGroupMap = new Map();
    attendanceData.forEach((group) => {
      if (
        searchTerm &&
        !group.groupName.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return;
      }
      if (!latestGroupMap.has(group.groupName)) {
        latestGroupMap.set(group.groupName, group);
      }
    });
    return Array.from(latestGroupMap.values());
  }, [attendanceData, searchTerm]);

  // 4. EXCEL EXPORT LOGIC
  const handleExport = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Davomat Hisoboti");

    worksheet.columns = [
      { width: 8 },
      { width: 35 },
      { width: 20 },
      { width: 15 },
      { width: 20 },
    ];

    const now = new Date();
    let dataToExport = attendanceData;

    if (exportRange === "daily") {
      dataToExport = dataToExport.filter(
        (g) => g.jsDate.toDateString() === now.toDateString(),
      );
    } else if (exportRange === "weekly") {
      dataToExport = dataToExport.filter(
        (g) => g.jsDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      );
    }

    if (selectedGroupNames.length > 0) {
      dataToExport = dataToExport.filter((g) =>
        selectedGroupNames.includes(g.groupName),
      );
    }

    const groupedByGroupName = dataToExport.reduce((acc, curr) => {
      if (!acc[curr.groupName]) acc[curr.groupName] = [];
      acc[curr.groupName].push(curr);
      return acc;
    }, {});

    Object.keys(groupedByGroupName).forEach((groupName) => {
      const gRow = worksheet.addRow([`GURUH: ${groupName.toUpperCase()}`]);
      worksheet.mergeCells(`A${gRow.number}:E${gRow.number}`);
      gRow.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
      gRow.alignment = { horizontal: "center", vertical: "middle" };
      gRow.height = 35;
      gRow.getCell(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E293B" },
      };

      groupedByGroupName[groupName]
        .sort((a, b) => b.jsDate - a.jsDate)
        .forEach((session) => {
          worksheet.addRow([]);
          const sRow = worksheet.addRow([
            `SANA: ${session.date} | VAQT: ${session.lessonTime}`,
          ]);
          worksheet.mergeCells(`A${sRow.number}:E${sRow.number}`);
          sRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
          sRow.getCell(1).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF3B82F6" },
          };

          const head = worksheet.addRow([
            "№",
            "O'QUVCHI F.I.SH",
            "TELEFON",
            "HOLATI",
            "IZOH",
          ]);
          head.eachCell((c) => {
            c.font = { bold: true, color: { argb: "FF475569" } };
            c.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF1F5F9" },
            };
            c.border = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" },
            };
          });

          session.attendance?.forEach((st, i) => {
            const status = st.status?.toLowerCase();
            let bg = "FFFFFFFF",
              fg = "FF000000",
              txt = "KELGAN";

            if (status === "absent") {
              bg = "FFFEE2E2";
              fg = "FFB91C1C";
              txt = "KELMAGAN";
            } else if (status === "late") {
              bg = "FFFEF3C7";
              fg = "FFB45309";
              txt = "KECHIKKAN";
            } else {
              bg = "FFDCFCE7";
              fg = "FF15803D";
              txt = "KELGAN";
            }

            const r = worksheet.addRow([
              i + 1,
              `${st.studentName} ${st.lastName || ""}`,
              st.phoneNumber || "-",
              txt,
              st.delay || "-",
            ]);
            const sCell = r.getCell(4);
            sCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: bg },
            };
            sCell.font = { bold: true, color: { argb: fg } };
            r.eachCell((c) => {
              c.border = {
                top: { style: "thin", color: { argb: "FFCBD5E1" } },
                left: { style: "thin", color: { argb: "FFCBD5E1" } },
                bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
                right: { style: "thin", color: { argb: "FFCBD5E1" } },
              };
            });
          });
        });
      worksheet.addRow([]);
      worksheet.addRow([]);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Guruhlar_Davomati_${Date.now()}.xlsx`);
    setShowExportModal(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm(t("Ushbu davomatni o'chirib tashlamoqchimisiz?"))) {
      try {
        await deleteDoc(doc(db, "attendance", id));
        toast.success(t("Muvaffaqiyatli o'chirildi"));
      } catch (e) {
        toast.error(t("Xatolik yuz berdi"));
      }
    }
  };

  const glassClass = isDark
    ? "bg-white/[0.03] border-white/10 backdrop-blur-md"
    : "bg-white/80 border-slate-200 backdrop-blur-md";

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader size="lg" vertical />
      </div>
    );

  return (
    <div
      className={`min-h-screen p-4 md:p-8 transition-all duration-500 ${isDark ? "text-white" : "text-slate-800"}`}
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* HEADER SECTION */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <h1 className="text-3xl font-black italic tracking-tighter uppercase">
            {t(timeFilter)}{" "}
            <span className="text-cyan-500 underline decoration-4">
              {t("Attendance")}
            </span>
          </h1>

          <Stack spacing={10} wrap>
            <SelectPicker
              data={[
                { label: t("Daily"), value: "daily" },
                { label: t("Weekly"), value: "weekly" },
                { label: t("3 Months"), value: "3months" },
              ]}
              value={timeFilter}
              onChange={setTimeFilter}
              cleanable={false}
              className="!w-40"
            />
            <InputGroup inside className={`!w-64 ${glassClass}`}>
              <Input
                placeholder={t("Guruhni qidirish...")}
                value={searchTerm}
                onChange={setSearchTerm}
              />
              <InputGroup.Addon>
                <LuSearch />
              </InputGroup.Addon>
            </InputGroup>
            <Button
              color="green"
              appearance="primary"
              onClick={() => setShowExportModal(true)}
            >
              <LuDownload className="mr-2" /> EXCEL YUKLASH
            </Button>
          </Stack>
        </div>

        {/* ANALYTICS SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div
            className={`lg:col-span-2 p-6 rounded-[2.5rem] border ${glassClass}`}
          >
            <h5 className="text-xs font-black uppercase mb-6 flex items-center gap-2">
              <LuTrendingUp className="text-cyan-500" />{" "}
              {t("Attendance Dynamics")}
            </h5>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={isDark ? "#ffffff10" : "#00000010"}
                  />
                  <XAxis
                    dataKey="groupName"
                    tick={{ fontSize: 10, fill: "#888" }}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#888" }}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "transparent" }}
                    contentStyle={{
                      borderRadius: "15px",
                      background: isDark ? "#1e293b" : "#fff",
                      border: "none",
                    }}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{
                      paddingTop: "20px",
                      fontSize: "10px",
                      fontWeight: "bold",
                    }}
                  />
                  <Bar
                    name={t("Kelgan")}
                    dataKey="presentCount"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    barSize={40}
                  />
                  <Bar
                    name={t("Kechikkan")}
                    dataKey="lateCount"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                    barSize={40}
                  />
                  <Bar
                    name={t("Kelmagan")}
                    dataKey="absentCount"
                    fill="#ef4444"
                    radius={[4, 4, 0, 0]}
                    barSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div
            className={`p-6 rounded-[2.5rem] border relative flex flex-col items-center justify-center ${glassClass}`}
          >
            <h5 className="absolute top-8 left-8 text-xs font-black uppercase">
              {t("Summary")}
            </h5>
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={10}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-4">
                <p className="text-3xl font-black">
                  {stats.present + stats.late + stats.absent}
                </p>
                <p className="text-[10px] font-bold opacity-40 uppercase">
                  {t("Total")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* LIST SECTION WITH EMPTY STATE */}
        <PanelGroup accordion className="space-y-4">
          {filteredGroups.length > 0 ? (
            filteredGroups.map((group) => (
              <Panel
                key={group.id}
                eventKey={group.id}
                header={
                  <div className="flex flex-col md:flex-row justify-between items-center w-full pr-2 gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl text-white shadow-lg">
                        <LuUsers size={22} />
                      </div>
                      <div>
                        <h4 className="text-base font-black tracking-tight">
                          {group.groupName}
                        </h4>
                        <div className="flex items-center gap-3 mt-1 text-[10px] font-bold opacity-60 uppercase">
                          <span>
                            <LuCalendarDays className="inline mr-1" />{" "}
                            {group.date}
                          </span>
                          <span>
                            <LuClock className="inline mr-1" />{" "}
                            {group.lessonTime}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex gap-1">
                        <Badge
                          label={`P: ${group.presentCount}`}
                          color="bg-emerald-500"
                        />
                        <Badge
                          label={`L: ${group.lateCount}`}
                          color="bg-amber-500"
                        />
                        <Badge
                          label={`A: ${group.absentCount}`}
                          color="bg-red-500"
                        />
                      </div>
                      <IconButton
                        icon={<LuTrash2 className="text-red-500" />}
                        appearance="subtle"
                        circle
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(group.id);
                        }}
                      />
                    </div>
                  </div>
                }
                className={`${glassClass} !rounded-3xl border-none overflow-hidden hover:shadow-xl`}
              >
                <Table
                  data={group.attendance || []}
                  autoHeight
                  rowHeight={75}
                  className="!bg-transparent"
                >
                  <Table.Column flexGrow={1}>
                    <Table.HeaderCell className="font-black text-[10px] uppercase">
                      {t("Student")}
                    </Table.HeaderCell>
                    <Table.Cell>
                      {(rowData) => (
                        <div className="flex flex-col uppercase">
                          <span className="font-black text-cyan-500 text-sm">
                            {rowData.studentName} {rowData.lastName}
                          </span>
                          <span className="text-[11px] font-bold opacity-70 flex items-center gap-1 mt-1 lowercase">
                            <LuPhone size={12} className="text-blue-500" />{" "}
                            {rowData.phoneNumber || "N/A"}
                          </span>
                        </div>
                      )}
                    </Table.Cell>
                  </Table.Column>
                  <Table.Column width={150} align="right">
                    <Table.HeaderCell className="font-black text-[10px] uppercase">
                      {t("Status")}
                    </Table.HeaderCell>
                    <Table.Cell>
                      {(rowData) => (
                        <StatusBadge
                          status={rowData.status}
                          delay={rowData.delay}
                        />
                      )}
                    </Table.Cell>
                  </Table.Column>
                </Table>
              </Panel>
            ))
          ) : (
            // ==========================================
            // EMPTY STATE (DAVOMAT TOPILMAGAN HOLAT)
            // ==========================================
            <div
              className={`flex flex-col items-center justify-center p-20 rounded-[3rem] border-2 border-dashed ${isDark ? "border-white/10" : "border-slate-200"}`}
            >
              <div
                className={`p-6 rounded-full mb-4 ${isDark ? "bg-white/5" : "bg-slate-100"}`}
              >
                <LuInbox size={50} className="opacity-20" />
              </div>
              <h3 className="text-xl font-black opacity-50">
                {t("No attendance found")}
              </h3>
              <p className="text-[10px] font-bold opacity-30 tracking-[0.1rem] mt-1">
                {t("No results found for the selected filters")}
              </p>
            </div>
          )}
        </PanelGroup>

        {/* EXCEL MODAL */}
        <Modal
          open={showExportModal}
          onClose={() => setShowExportModal(false)}
          size="xs"
          backdrop="static"
          className={isDark ? "dark-theme-modal" : ""}
        >
          <Modal.Header>
            <Modal.Title
              className={`font-black uppercase flex items-center gap-2 ${isDark ? "text-white" : "text-slate-900"}`}
            >
              <LuDownload className="text-green-500" /> Excel Hisobot
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="space-y-6">
            <div>
              <p
                className={`text-[10px] font-black uppercase mb-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}
              >
                Eksport davri:
              </p>
              <SelectPicker
                data={[
                  { label: "Barcha saqlanganlar (90 kun)", value: "all" },
                  { label: "Faqat bugungi", value: "daily" },
                  { label: "Oxirgi 7 kunlik", value: "weekly" },
                ]}
                value={exportRange}
                onChange={setExportRange}
                block
                cleanable={false}
              />
            </div>
            <div>
              <p
                className={`text-[10px] font-black uppercase mb-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}
              >
                Guruhlar (Ixtiyoriy):
              </p>
              <CheckPicker
                data={[...new Set(attendanceData.map((g) => g.groupName))].map(
                  (name) => ({ label: name, value: name }),
                )}
                value={selectedGroupNames}
                onChange={setSelectedGroupNames}
                block
                placeholder="Barcha guruhlar"
              />
              <p className="text-[9px] mt-2 italic text-blue-500">
                * Guruhlar Excelda jamlangan holda chiqadi.
              </p>
            </div>
          </Modal.Body>
          <Modal.Footer className="flex flex-col gap-2">
            <Button
              onClick={handleExport}
              color="green"
              appearance="primary"
              block
              className="!rounded-2xl h-12 font-black tracking-widest"
            >
              HISOBOTNI YUKLASH
            </Button>
            <Button
              onClick={() => setShowExportModal(false)}
              appearance="subtle"
              block
              className={isDark ? "text-slate-300 hover:text-white" : ""}
            >
              BEKOR QILISH
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
};

// SUB-COMPONENTS
const Badge = ({ label, color }) => (
  <span
    className={`${color}/10 ${color.replace("bg-", "text-")} px-2 py-1 rounded-lg text-[10px] font-black border border-current/10`}
  >
    {label}
  </span>
);

const StatusBadge = ({ status, delay }) => {
  const config = {
    present: {
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
      icon: <LuCheck />,
      label: "Kelgan",
    },
    late: {
      color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
      icon: <LuClock />,
      label: delay || "Kechikkan",
    },
    absent: {
      color: "text-red-500 bg-red-500/10 border-red-500/20",
      icon: <LuX />,
      label: "Kelmagan",
    },
  };
  const s = config[status?.toLowerCase()] || config.absent;
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl border text-[10px] font-black uppercase ${s.color}`}
    >
      {s.icon} {s.label}
    </div>
  );
};

export default React.memo(AttendanceManagement);
