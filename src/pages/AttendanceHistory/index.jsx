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

  // --- STATE ---
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [timeFilter, setTimeFilter] = useState("3months");

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportRange, setExportRange] = useState("all");
  const [selectedGroupNames, setSelectedGroupNames] = useState([]);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // 1. DATA FETCHING & AUTO-CLEANUP (90 DAYS)
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

          const total = Number(item.totalStudents) || 0;
          const present = Number(item.presentCount) || 0;
          const late = Number(item.lateCount) || 0;
          let abs = total - present - late;
          if (abs < 0) abs = 0;

          return {
            ...item,
            jsDate: createdDate,
            presentCount: present,
            lateCount: late,
            absentCount: abs,
          };
        })
        .filter(Boolean);

      setAttendanceData(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. FILTERS LOGIC
  const filteredGroups = useMemo(() => {
    const now = new Date();
    return attendanceData.filter((group) => {
      const groupDate = group.jsDate;
      let matchesTime = true;

      if (timeFilter === "daily") {
        matchesTime = groupDate.toDateString() === now.toDateString();
      } else if (timeFilter === "weekly") {
        matchesTime =
          groupDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

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
    { name: t("Present"), value: stats.present, color: "#10b981" },
    { name: t("Late"), value: stats.late, color: "#f59e0b" },
    { name: t("Absent"), value: stats.absent, color: "#ef4444" },
  ];

  const chartData = useMemo(() => {
    const latestGroupMap = new Map();
    attendanceData.forEach((group) => {
      if (
        searchTerm &&
        !group.groupName.toLowerCase().includes(searchTerm.toLowerCase())
      )
        return;
      if (!latestGroupMap.has(group.groupName)) {
        latestGroupMap.set(group.groupName, {
          ...group,
          presentCount: Number(group.presentCount),
          lateCount: Number(group.lateCount),
          absentCount: Number(group.absentCount),
        });
      }
    });
    return Array.from(latestGroupMap.values());
  }, [attendanceData, searchTerm]);

  // 4. EXCEL EXPORT
  const handleExport = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Davomat Hisoboti");

    worksheet.columns = [
      { width: 10 },
      { width: 40 },
      { width: 20 },
      { width: 20 },
      { width: 25 },
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

    const grouped = dataToExport.reduce((acc, curr) => {
      if (!acc[curr.groupName]) acc[curr.groupName] = [];
      acc[curr.groupName].push(curr);
      return acc;
    }, {});

    Object.keys(grouped).forEach((groupName) => {
      const gRow = worksheet.addRow([`GURUH: ${groupName.toUpperCase()}`]);
      worksheet.mergeCells(`A${gRow.number}:E${gRow.number}`);
      gRow.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
      gRow.alignment = { horizontal: "center" };
      gRow.getCell(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E293B" },
      };

      grouped[groupName]
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
            "F.I.SH",
            "TELEFON",
            "HOLATI",
            "IZOH",
          ]);
          head.eachCell((c) => {
            c.font = { bold: true };
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
            const isAbsent = status === "absent";
            const isLate = status === "late";

            const r = worksheet.addRow([
              i + 1,
              `${st.studentName} ${st.lastName || ""}`,
              st.phoneNumber || "-",
              isAbsent ? "KELMAGAN" : isLate ? "KECHIKKAN" : "KELGAN",
              st.delay || "-",
            ]);

            const sCell = r.getCell(4);
            if (isAbsent)
              sCell.font = { color: { argb: "FFFF0000" }, bold: true };
            if (isLate)
              sCell.font = { color: { argb: "FFF59E0B" }, bold: true };
            if (status === "present")
              sCell.font = { color: { argb: "FF10B981" }, bold: true };
          });
        });
      worksheet.addRow([]);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Davomat_${Date.now()}.xlsx`);
    setShowExportModal(false);
  };

  // 5. DELETE ACTIONS
  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteDoc(doc(db, "attendance", itemToDelete));
      toast.success(t("Deleted successfully"));
    } catch (e) {
      toast.error(t("Error deleting"));
    } finally {
      setDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  const glassClass = isDark
    ? "bg-[#1e293b]/60 border-white/10 backdrop-blur-xl shadow-2xl"
    : "bg-white/80 border-slate-200 backdrop-blur-md shadow-sm";

  const darkStyles = `
    .rs-modal-content { background-color: ${isDark ? "#1e293b" : "#fff"} !important; color: ${isDark ? "#fff" : "#000"} !important; }
    .rs-picker-select-menu, .rs-picker-check-menu { background-color: #1e293b !important; border: 1px solid #334155 !important; }
    .rs-picker-select-menu-item, .rs-check-item { color: #e2e8f0 !important; }
    .rs-picker-select-menu-item:hover, .rs-picker-select-menu-item-active { background-color: #3b82f6 !important; color: white !important; }
    .rs-input, .rs-input-group { background-color: ${isDark ? "#0f172a" : "#fff"} !important; border-color: ${isDark ? "#334155" : "#e2e8f0"} !important; color: ${isDark ? "#fff" : "#000"} !important; }
    .rs-table { background-color: transparent !important; }
    .rs-table-cell { background-color: transparent !important; color: ${isDark ? "#cbd5e1" : "#475569"} !important; border-bottom: 1px solid ${isDark ? "#334155" : "#f1f5f9"} !important; }
    .rs-panel-header { background: transparent !important; }
  `;

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader size="lg" content={t("Loading...")} vertical />
      </div>
    );

  return (
    <div
      className={`min-h-screen p-4 md:p-8 transition-colors duration-300 ${isDark ? "bg-[#0f172a] text-white" : "bg-slate-50 text-slate-800"}`}
    >
      <style>{darkStyles}</style>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* HEADER */}
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
            <InputGroup inside className="!w-64">
              <Input
                placeholder={t("Search group...")}
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
              className="!rounded-xl"
            >
              <LuDownload className="mr-2" /> EXCEL
            </Button>
          </Stack>
        </div>

        {/* ANALYTICS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div
            className={`lg:col-span-2 p-6 rounded-[2.5rem] border ${glassClass}`}
          >
            <h5 className="text-xs font-black uppercase mb-6 flex items-center gap-2">
              <LuTrendingUp className="text-cyan-500" /> {t("Dynamics")}
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
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#888" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "15px",
                      background: isDark ? "#1e293b" : "#fff",
                      border: "none",
                    }}
                  />
                  <Legend iconType="circle" />
                  <Bar
                    name={t("Present")}
                    dataKey="presentCount"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    name={t("Late")}
                    dataKey="lateCount"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    name={t("Absent")}
                    dataKey="absentCount"
                    fill="#ef4444"
                    radius={[4, 4, 0, 0]}
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
                    paddingAngle={5}
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

        {/* LIST */}
        <PanelGroup accordion className="space-y-4">
          {filteredGroups.length > 0 ? (
            filteredGroups.map((group) => (
              <Panel
                key={group.id}
                eventKey={group.id}
                header={
                  <div className="flex flex-col md:flex-row justify-between items-center w-full pr-2 gap-4 text-left">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl text-white shadow-lg">
                        <LuUsers size={22} />
                      </div>
                      <div>
                        <h4 className="text-base font-black">
                          {group.groupName}
                        </h4>
                        <div className="flex gap-3 text-[10px] font-bold opacity-60 uppercase">
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
                      <IconButton
                        icon={<LuTrash2 className="text-red-500" />}
                        appearance="subtle"
                        circle
                        onClick={(e) => {
                          e.stopPropagation();
                          setItemToDelete(group.id);
                          setDeleteModalOpen(true);
                        }}
                      />
                    </div>
                  </div>
                }
                className={`${glassClass} !rounded-3xl border-none overflow-hidden mb-4`}
              >
                <Table data={group.attendance || []} autoHeight rowHeight={70}>
                  <Table.Column flexGrow={1}>
                    <Table.HeaderCell className="font-bold uppercase text-[10px]">
                      {t("Student")}
                    </Table.HeaderCell>
                    <Table.Cell>
                      {(rowData) => (
                        <div className="flex flex-col">
                          <span className="font-black text-cyan-500 text-sm uppercase">
                            {rowData.studentName} {rowData.lastName}
                          </span>
                          <span className="text-[11px] opacity-70 flex items-center gap-1">
                            <LuPhone size={12} /> {rowData.phoneNumber || "-"}
                          </span>
                        </div>
                      )}
                    </Table.Cell>
                  </Table.Column>
                  <Table.Column width={150} align="right">
                    <Table.HeaderCell className="font-bold uppercase text-[10px]">
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
            <div
              className={`flex flex-col items-center justify-center p-20 rounded-[3rem] border-2 border-dashed ${isDark ? "border-white/10" : "border-slate-200"}`}
            >
              <LuInbox size={50} className="opacity-20 mb-4" />
              <h3 className="text-xl font-black opacity-50">
                {t("No data found")}
              </h3>
            </div>
          )}
        </PanelGroup>

        {/* EXCEL MODAL - Yangilangan: Orqa fon bosilganda yopilmaydi */}
        <Modal
          open={showExportModal}
          onClose={() => setShowExportModal(false)}
          size="xs"
          backdrop="static" // Overlay bosilganda yopilmaydi
          keyboard={false} // ESC bosilganda yopilmaydi
        >
          <Modal.Header>
            <Modal.Title className="font-black uppercase">
              <LuDownload className="text-green-500 inline mr-2" /> Excel Export
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="space-y-4">
            <div>
              <p className="text-[10px] font-black uppercase mb-1 text-gray-400">
                Period:
              </p>
              <SelectPicker
                data={[
                  { label: "All (90 days)", value: "all" },
                  { label: "Today", value: "daily" },
                  { label: "Weekly", value: "weekly" },
                ]}
                value={exportRange}
                onChange={setExportRange}
                block
                cleanable={false}
              />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase mb-1 text-gray-400">
                Specific Groups:
              </p>
              <CheckPicker
                data={[...new Set(attendanceData.map((g) => g.groupName))].map(
                  (n) => ({ label: n, value: n }),
                )}
                value={selectedGroupNames}
                onChange={setSelectedGroupNames}
                block
                placeholder="All Groups"
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button
              onClick={handleExport}
              color="green"
              appearance="primary"
              block
              className="!rounded-xl h-12 font-bold"
            >
              DOWNLOAD REPORT
            </Button>
          </Modal.Footer>
        </Modal>

        {/* DELETE MODAL */}
        <Modal
          open={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          size="xs"
        >
          <Modal.Body className="text-center p-6">
            <LuTrash2 size={48} className="text-red-500 mx-auto mb-4" />
            <h4 className="font-black mb-2 uppercase text-gray-400">
              {t("Are you sure?")}
            </h4>
            <p className="text-sm text-gray-400">
              {t("This action cannot be undone.")}
            </p>
          </Modal.Body>
          <Modal.Footer className="flex gap-2">
            <Button
              onClick={() => setDeleteModalOpen(false)}
              appearance="subtle"
              block
            >
              {t("Cancel")}
            </Button>
            <Button
              onClick={confirmDelete}
              color="red"
              appearance="primary"
              block
              className="font-bold"
            >
              {t("Delete")}
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
};

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
      color: "text-emerald-500 bg-emerald-500/10",
      icon: <LuCheck />,
      label: "Present",
    },
    late: {
      color: "text-amber-500 bg-amber-500/10",
      icon: <LuClock />,
      label: delay || "Late",
    },
    absent: {
      color: "text-red-500 bg-red-500/10",
      icon: <LuX />,
      label: "Absent",
    },
  };
  const s = config[status?.toLowerCase()] || config.absent;
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl text-[10px] font-black uppercase border border-current/20 ${s.color}`}
    >
      {s.icon} {s.label}
    </div>
  );
};

export default React.memo(AttendanceManagement);
