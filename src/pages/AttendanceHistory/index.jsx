import React, { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  deleteDoc,
  doc,
  getDocs,
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
  IconButton,
  Modal,
  CheckPicker,
  Whisper,
  Tooltip as RsTooltip,
  Badge as RsBadge,
} from "rsuite";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
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
  LuInfo,
} from "react-icons/lu";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { GroupIcon } from "lucide-react";

const AttendanceManagement = () => {
  const theme = useSelector((state) => state.theme.value);
  const isDark = theme === "dark";
  const { t } = useTranslation();

  const [attendanceData, setAttendanceData] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [timeFilter, setTimeFilter] = useState("Attendance");

  // Export Modal States
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportRange, setExportRange] = useState("all");
  const [selectedGroupNames, setSelectedGroupNames] = useState([]);

  // Groups ma'lumotlarini olish
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const groupsRef = collection(db, "groups");
        const groupsSnapshot = await getDocs(groupsRef);
        const groupsData = groupsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setGroups(groupsData);
      } catch (error) {
        console.error("Error fetching groups:", error);
        toast.error(t("Guruhlarni yuklashda xatolik"));
      }
    };

    fetchGroups();
  }, [t]);

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

  // 2. FILTERS (List uchun)
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
    { name: t("Present"), value: stats.present, color: "#10b981" },
    { name: t("Late"), value: stats.late, color: "#f59e0b" },
    { name: t("Absent"), value: stats.absent, color: "#ef4444" },
  ];

  // BAR CHART LOGIKASI
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

  // Guruhni groups collectionida mavjudligini tekshirish
  const isGroupExists = (groupName) => {
    return groups.some(
      (group) =>
        group.groupName?.toLowerCase() === groupName?.toLowerCase() ||
        group.name?.toLowerCase() === groupName?.toLowerCase(),
    );
  };

  // Export uchun guruhlar roʻyxatini tayyorlash (badge bilan)
  const groupOptions = useMemo(() => {
    const uniqueGroups = [...new Set(attendanceData.map((g) => g.groupName))];
    return uniqueGroups.map((name) => {
      const exists = isGroupExists(name);
      return {
        // Label sifatida toʻg'ridan-toʻg'ri JSX element
        label: (
          <div
            className="flex items-center justify-between w-full gap-2"
            style={{ padding: "2px 0" }}
          >
            <span>{name}</span>
            {!exists && (
              <Whisper
                trigger="hover"
                placement="right"
                speaker={
                  <RsTooltip>
                    {t("This group is inactive or has been deleted.")}
                  </RsTooltip>
                }
              >
                <RsBadge
                  content={t("Old")}
                  style={{
                    background: "#f59e0b",
                    color: "#000",
                    fontSize: "10px",
                    fontWeight: "bold",
                    marginLeft: "8px",
                    padding: "2px 6px",
                    borderRadius: "4px",
                  }}
                />
              </Whisper>
            )}
          </div>
        ),
        value: name,
        // Qoʻshimcha ma'lumotlar
        rawLabel: name,
        exists: exists,
      };
    });
  }, [attendanceData, groups, t]);

  // 4. EXCEL EXPORT LOGIC
  const handleExport = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Davomat Hisoboti");

    worksheet.columns = [
      { width: 8 }, // в„–
      { width: 35 }, // F.I.SH
      { width: 20 }, // Telefon
      { width: 15 }, // Holati
      { width: 20 }, // Izoh/Kechikish
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
      const isExists = isGroupExists(groupName);

      const gRow = worksheet.addRow([
        `GURUH: ${groupName.toUpperCase()}${!isExists ? " (ESKI GURUH)" : ""}`,
      ]);
      worksheet.mergeCells(`A${gRow.number}:E${gRow.number}`);
      gRow.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
      gRow.alignment = { horizontal: "center", vertical: "middle" };
      gRow.height = 35;

      gRow.getCell(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: !isExists ? "FFF59E0B" : "FF1E293B" },
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
            "в„–",
            "OʻQUVCHI F.I.SH",
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
    if (window.confirm(t("Ushbu davomatni oʻchirib tashlamoqchimisiz'"))) {
      try {
        await deleteDoc(doc(db, "attendance", id));
        toast.success(t("Muvaffaqiyatli oʻchirildi"));
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
      className={`section-muted-bg min-h-screen p-3 sm:p-4 md:p-6 lg:p-8 transition-all duration-500 ${
        isDark ? "text-white" : "text-slate-800"
      }`}
    >
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8">
        {/* HEADER SECTION */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6">
          <h1 className="text-2xl sm:text-xl font-black italic tracking-tighter uppercase">
            {t(timeFilter)}{" "}
            <span className="text-cyan-500 underline decoration-4">
              {t("History")}
            </span>
          </h1>

          <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3 sm:gap-4">
            <SelectPicker
              data={[
                { label: t("Daily"), value: "daily" },
                { label: t("Weekly"), value: "weekly" },
                { label: t("3 Months"), value: "3months" },
              ]}
              value={timeFilter}
              onChange={setTimeFilter}
              cleanable={false}
              className="!w-full sm:!w-40"
              size="md"
            />
            <InputGroup inside className={`!w-full sm:!w-64 ${glassClass}`}>
              <Input
                placeholder={t("Search group")}
                value={searchTerm}
                onChange={setSearchTerm}
                size="md"
              />
              <InputGroup.Addon>
                <LuSearch />
              </InputGroup.Addon>
            </InputGroup>
            <Button
              color="green"
              appearance="primary"
              onClick={() => setShowExportModal(true)}
              size="md"
              className="!w-full sm:!w-auto whitespace-nowrap"
            >
              <LuDownload className="mr-2" />
              <span className="hidden xs:inline">{t("download excel")}</span>
              <span className="xs:hidden">Excel</span>
            </Button>
          </div>
        </div>

        {/* ANALYTICS SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Bar Chart */}
          <div
            className={`lg:col-span-2 p-4 sm:p-6 rounded-2xl sm:rounded-[2.5rem] border ${glassClass}`}
          >
            <h5 className="text-[10px] sm:text-xs font-black uppercase mb-4 sm:mb-6 flex items-center gap-2">
              <LuTrendingUp className="text-cyan-500" />{" "}
              {t("Attendance Dynamics")}
            </h5>
            <div className="h-60 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={isDark ? "#ffffff10" : "#00000010"}
                  />
                  <XAxis
                    dataKey="groupName"
                    tick={{ fontSize: 8, fill: "#888" }}
                    axisLine={false}
                    interval={window.innerWidth < 640 ? 1 : 0}
                  />
                  <YAxis
                    tick={{ fontSize: 8, fill: "#888" }}
                    axisLine={false}
                  />
                  <RechartsTooltip
                    cursor={{ fill: "transparent" }}
                    contentStyle={{
                      borderRadius: "10px",
                      background: isDark ? "#1e293b" : "#fff",
                      border: "none",
                      fontSize: "10px",
                    }}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{
                      paddingTop: "15px",
                      fontSize: "8px",
                      fontWeight: "bold",
                    }}
                  />
                  <Bar
                    name={t("Present")}
                    dataKey="presentCount"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    barSize={window.innerWidth < 640 ? 20 : 40}
                  />
                  <Bar
                    name={t("Late")}
                    dataKey="lateCount"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                    barSize={window.innerWidth < 640 ? 20 : 40}
                  />
                  <Bar
                    name={t("Absent")}
                    dataKey="absentCount"
                    fill="#ef4444"
                    radius={[4, 4, 0, 0]}
                    barSize={window.innerWidth < 640 ? 20 : 40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart */}
          <div
            className={`p-4 sm:p-6 rounded-2xl sm:rounded-[2.5rem] border relative flex flex-col items-center justify-center ${glassClass}`}
          >
            <h5 className="absolute top-4 left-4 sm:top-8 sm:left-8 text-[10px] sm:text-xs font-black uppercase">
              {t("General")}
            </h5>
            <div className="h-48 sm:h-64 w-full mt-8 sm:mt-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={window.innerWidth < 640 ? 35 : 60}
                    outerRadius={window.innerWidth < 640 ? 55 : 80}
                    paddingAngle={10}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      fontSize: "10px",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2 sm:mt-4">
                <p className="text-xl sm:text-3xl font-black">
                  {stats.present + stats.late + stats.absent}
                </p>
                <p className="text-[8px] sm:text-[10px] font-bold opacity-40 uppercase">
                  {t("Total")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* LIST SECTION (ACCORDION) */}
        <PanelGroup accordion className="space-y-3 sm:space-y-4">
          {filteredGroups.map((group) => (
            <Panel
              key={group.id}
              eventKey={group.id}
              header={
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full pr-2 gap-3 sm:gap-4">
                  <div className="flex items-start sm:items-center gap-3 w-full sm:w-auto">
                    <div className="p-2 sm:p-3 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl sm:rounded-2xl text-white shadow-lg flex-shrink-0">
                      <LuUsers size={window.innerWidth < 640 ? 18 : 22} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm sm:text-base font-black tracking-tight break-words pr-2">
                          {group.groupName}
                        </h4>
                        {!isGroupExists(group.groupName) && (
                          <Whisper
                            trigger="hover"
                            placement="top"
                            speaker={
                              <RsTooltip>
                                {t("Bu guruh groups collectionida mavjud emas")}
                              </RsTooltip>
                            }
                          >
                            <RsBadge
                              content={t("Old")}
                              style={{
                                background: "#f59e0b",
                                color: "#000",
                                fontSize: "8px",
                                padding: "0 4px",
                              }}
                            />
                          </Whisper>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1 text-[8px] sm:text-[10px] font-bold opacity-60 uppercase">
                        <span className="flex items-center gap-1">
                          <LuCalendarDays className="inline flex-shrink-0" />
                          <span className="break-words">{group.date}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <LuClock className="inline flex-shrink-0" />
                          <span>{group.lessonTime}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between w-full sm:w-auto gap-3 sm:gap-4">
                    <div className="flex gap-1 flex-wrap">
                      <CustomBadge
                        label={`${t("Present")}: ${group.presentCount}`}
                        color="bg-emerald-500"
                        // isMobile={window.innerWidth < 640}
                      />
                      <CustomBadge
                        label={`${t("Late")}: ${group.lateCount}`}
                        color="bg-amber-500"
                        // isMobile={window.innerWidth < 640}
                      />
                      <CustomBadge
                        label={`${t("Absent")}: ${group.absentCount}`}
                        color="bg-red-500"
                        // isMobile={window.innerWidth < 640}
                      />
                    </div>
                    <IconButton
                      icon={<LuTrash2 className="text-red-500" size={16} />}
                      appearance="subtle"
                      circle
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(group.id);
                      }}
                    />
                  </div>
                </div>
              }
              className={`${glassClass} !rounded-xl sm:!rounded-3xl border-none overflow-hidden hover:shadow-xl`}
            >
              <Table
                data={group.attendance || []}
                autoHeight
                rowHeight={70}
                className="!bg-transparent w-full"
                style={{ width: "100%" }}
              >
                <Table.Column flexGrow={3} minWidth={260}>
                  <Table.HeaderCell className="font-black text-[8px] sm:text-[10px] uppercase">
                    {t("Student")}
                  </Table.HeaderCell>
                  <Table.Cell>
                    {(rowData) => (
                      <div className="flex flex-col capitalize">
                        <span className="font-black text-cyan-500 text-xs sm:text-sm break-words pr-1">
                          {rowData.studentName} {rowData.lastName}
                        </span>
                        <span className="text-[9px] sm:text-[11px] font-bold opacity-70 flex items-center gap-1 mt-1 lowercase break-all">
                          <LuPhone
                            size={10}
                            className="text-blue-500 flex-shrink-0"
                          />
                          <span className="break-words">
                            {rowData.phoneNumber || "N/A"}
                          </span>
                        </span>
                      </div>
                    )}
                  </Table.Cell>
                </Table.Column>
                <Table.Column flexGrow={2} minWidth={180} align="right">
                  <Table.HeaderCell className="font-black text-[8px] sm:text-[10px] uppercase">
                    {t("Status")}
                  </Table.HeaderCell>
                  <Table.Cell>
                    {(rowData) => (
                      <StatusBadgeComponent
                        status={rowData.status}
                        delay={rowData.delay}
                      />
                    )}
                  </Table.Cell>
                </Table.Column>
              </Table>
            </Panel>
          ))}
        </PanelGroup>

        {/* MODAL - Export */}
        <Modal
          open={showExportModal}
          onClose={() => setShowExportModal(false)}
          size="xs"
          backdrop="static"
          className={isDark ? "dark-theme-modal" : ""}
        >
          <Modal.Header>
            <Modal.Title
              className={`font-black uppercase flex items-center gap-2 text-sm sm:text-base ${
                isDark ? "text-white" : "text-slate-900"
              }`}
            >
              <LuDownload className="text-green-500" /> {t("Excel Report")}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="space-y-4 sm:space-y-6 p-2 sm:p-4">
            <div>
              <p
                className={`text-[8px] sm:text-[10px] font-black uppercase mb-1 sm:mb-2 ${
                  isDark ? "text-slate-400" : "text-slate-500"
                }`}
              >
                {t("Export period")}
              </p>
              <SelectPicker
                data={[
                  { label: `${t("All saved (90 days)")}`, value: "all" },
                  { label: `${t("Only today")}`, value: "daily" },
                  { label: `${t("Last 7 days")}`, value: "weekly" },
                ]}
                value={exportRange}
                onChange={setExportRange}
                block
                cleanable={false}
                size="md"
              />
            </div>
            <div>
              <p
                className={`text-[8px] sm:text-[10px] font-black uppercase mb-1 sm:mb-2 flex items-center gap-1 ${
                  isDark ? "text-slate-400" : "text-slate-500"
                }`}
              >
                {t("Groups")}:
              </p>
              <CheckPicker
                data={groupOptions}
                value={selectedGroupNames}
                onChange={setSelectedGroupNames}
                block
                placeholder={t("All groups")}
                size="md"
                menuStyle={{ maxHeight: 300, overflow: "auto" }}
              />

              <p className="text-[8px] sm:text-[10px] mt-1 sm:mt-2 italic text-blue-500">
                * {t("Groups are output as aggregates in Excel")}.
              </p>
            </div>
          </Modal.Body>
          <Modal.Footer className="flex flex-col gap-2 p-2 sm:p-4">
            <Button
              onClick={handleExport}
              color="green"
              appearance="primary"
              block
              className="!rounded-xl sm:!rounded-2xl h-10 sm:h-12 font-black tracking-widest text-xs sm:text-sm"
            >
              {t("Upload report")}
            </Button>
            <Button
              onClick={() => setShowExportModal(false)}
              appearance="subtle"
              block
              className={`text-xs sm:text-sm ${isDark ? "text-slate-300 hover:text-white" : ""}`}
            >
              {t("Cancel")}
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
};

// SUB-COMPONENTS
const CustomBadge = ({ label, color, isMobile }) => (
  <span
    className={`${color}/10 ${color.replace(
      "bg-",
      "text-",
    )} px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg text-[8px] sm:text-[10px] font-black border border-current/10 whitespace-nowrap`}
  >
    {isMobile ? label.split(":")[0] : label}
  </span>
);

const StatusBadgeComponent = ({ status, delay }) => {
  const { t } = useTranslation();
  const config = {
    present: {
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
      icon: <LuCheck size={12} />,
      label: "Kelgan",
    },
    late: {
      color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
      icon: <LuClock size={12} />,
      label: delay || "Kechikkan",
    },
    absent: {
      color: "text-red-500 bg-red-500/10 border-red-500/20",
      icon: <LuX size={12} />,
      label: "Kelmagan",
    },
  };
  const s = config[status?.toLowerCase()] || config.absent;
  return (
    <div
      className={`inline-flex items-center gap-1 sm:gap-2 px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl border text-[8px] sm:text-[10px] font-black uppercase ${s.color}`}
    >
      {s.icon}
      <span className="hidden xs:inline">{s.label}</span>
      <span className="xs:hidden">
        {s.label === "Kelgan"
          ? t("Present")
          : s.label === "Kechikkan"
            ? t("Late")
            : t("Absent")}
      </span>
    </div>
  );
};

export default React.memo(AttendanceManagement);
