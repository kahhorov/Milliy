import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  limit,
  startAfter,
  where,
  getCountFromServer,
  updateDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import {
  Accordion,
  Table,
  Pagination,
  Tag,
  TagGroup,
  InputGroup,
  Input,
  Stack,
  Divider,
  HStack,
  Checkbox,
  IconButton,
  Modal,
  Form,
  Button,
  SelectPicker,
  CheckPicker,
  Grid,
  Row,
  Col,
  Whisper,
  Popover,
  Dropdown,
  InputNumber,
} from "rsuite";
import { useSelector } from "react-redux";
import SearchIcon from "@rsuite/icons/Search";
import CloseOutlineIcon from "@rsuite/icons/CloseOutline";
import EditIcon from "@rsuite/icons/Edit";
import TrashIcon from "@rsuite/icons/Trash";
import RemindIcon from "@rsuite/icons/legacy/Remind";
import MoreIcon from "@rsuite/icons/More";
import { PiStudentThin } from "react-icons/pi";

const { Column, HeaderCell, Cell } = Table;

const DAYS_ORDER = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

const ALL_WORKING_DAYS = Object.keys(DAYS_ORDER);

function Group() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useSelector((state) => state.theme.value);

  // States
  const [groupData, setGroupData] = useState(null);
  const [students, setStudents] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [groupSearchLoading, setGroupSearchLoading] = useState(false);

  const [activePage, setActivePage] = useState(1);
  const [displayLimit] = useState(10);
  const [totalStudents, setTotalStudents] = useState(0);
  const [lastDoc, setLastDoc] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState("");

  const [selectedId, setSelectedId] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showGroupEditModal, setShowGroupEditModal] = useState(false);
  const [showGroupDeleteModal, setShowGroupDeleteModal] = useState(false);
  const [editData, setEditData] = useState({
    studentName: "",
    lastName: "",
    phoneNumber: "",
    targetGroupId: "",
    days: [],
  });
  const [groupEditData, setGroupEditData] = useState({
    groupName: "",
    lessonTime: "",
    days: [],
  });

  const weekDaysOptions = ALL_WORKING_DAYS.map((day) => ({
    label: t(day),
    value: day,
  }));

  // 3 nuqta menu uchun render function
  const renderMenu = ({ onClose, left, top, className }, ref) => {
    const handleSelect = (eventKey) => {
      onClose();
      if (eventKey === 1) {
        handleGroupEditOpen();
      } else if (eventKey === 2) {
        setShowGroupDeleteModal(true);
      }
    };

    return (
      <Popover ref={ref} className={className} style={{ left, top }} full>
        <Dropdown.Menu onSelect={handleSelect}>
          <Dropdown.Item eventKey={1} icon={<EditIcon />}>
            {t("edit_group")}
          </Dropdown.Item>
          <Dropdown.Item eventKey={2} icon={<TrashIcon />}>
            {t("delete_group")}
          </Dropdown.Item>
        </Dropdown.Menu>
      </Popover>
    );
  };

  const processDays = useCallback((daysArr) => {
    if (!daysArr || !Array.isArray(daysArr) || daysArr.length === 0) return [];

    const isEveryday =
      daysArr.includes("Everyday") ||
      daysArr.includes("Every day") ||
      daysArr.length === ALL_WORKING_DAYS.length;

    if (isEveryday) return ["Everyday"];

    return daysArr
      .filter((day) => Object.prototype.hasOwnProperty.call(DAYS_ORDER, day))
      .sort((a, b) => DAYS_ORDER[a] - DAYS_ORDER[b]);
  }, []);

  const prepareDaysForSave = (daysArr) => {
    if (!daysArr || daysArr.length === 0) return ["Everyday"];
    if (
      daysArr.length === ALL_WORKING_DAYS.length ||
      daysArr.includes("Everyday") ||
      daysArr.includes("Every day")
    ) {
      return ["Everyday"];
    }
    return daysArr;
  };

  const fetchTotalCount = useCallback(
    async (keyword = "") => {
      try {
        const coll = collection(db, "groups", id, "students");
        let q = coll;
        const text = keyword.trim();
        if (text !== "") {
          q = query(
            coll,
            where("studentName", ">=", text),
            where("studentName", "<=", text + "\uf8ff"),
          );
        }
        const snapshot = await getCountFromServer(q);
        setTotalStudents(snapshot.data().count);
      } catch (error) {
        console.error(error);
      }
    },
    [id],
  );

  const loadData = useCallback(
    async (pageNum = 1, isNewSearch = false) => {
      setLoading(true);
      try {
        const studentsRef = collection(db, "groups", id, "students");
        let q;
        const trimmedSearch = searchKeyword.trim();

        if (trimmedSearch !== "") {
          q = query(
            studentsRef,
            orderBy("studentName"),
            where("studentName", ">=", trimmedSearch),
            where("studentName", "<=", trimmedSearch + "\uf8ff"),
            limit(displayLimit),
          );
        } else {
          if (pageNum === 1 || isNewSearch) {
            q = query(studentsRef, orderBy("studentName"), limit(displayLimit));
          } else {
            q = query(
              studentsRef,
              orderBy("studentName"),
              startAfter(lastDoc),
              limit(displayLimit),
            );
          }
        }

        const snapshot = await getDocs(q);
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          days: processDays(doc.data().days),
        }));

        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setStudents(list);
      } catch (error) {
        toast.error(t("error_loading_data"));
      } finally {
        setLoading(false);
      }
    },
    [id, searchKeyword, displayLimit, lastDoc, t, processDays],
  );

  const fetchAllGroups = async (search = "") => {
    setGroupSearchLoading(true);
    try {
      const groupsRef = collection(db, "groups");
      let q = query(groupsRef, orderBy("groupName"), limit(20));
      if (search) {
        q = query(
          groupsRef,
          orderBy("groupName"),
          where("groupName", ">=", search),
          where("groupName", "<=", search + "\uf8ff"),
          limit(20),
        );
      }
      const querySnapshot = await getDocs(q);
      setAllGroups(
        querySnapshot.docs.map((d) => ({
          label: d.data().groupName,
          value: d.id,
          days: d.data().days || d.data().weekdays || [],
        })),
      );
    } finally {
      setGroupSearchLoading(false);
    }
  };

  const loadGroupData = async () => {
    try {
      const docRef = doc(db, "groups", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setGroupData({
          ...data,
          days: processDays(data.days || data.weekdays || []),
        });

        // Group edit uchun ham to'ldiramiz
        setGroupEditData({
          groupName: data.groupName || "",
          lessonTime: data.lessonTime || "",
          days: processDays(data.days || data.weekdays || []),
        });
      } else {
        navigate("/");
        return;
      }
    } catch (error) {
      toast.error(t("error_loading_group_data"));
    }
  };

  useEffect(() => {
    const init = async () => {
      await loadGroupData();
      fetchAllGroups();
      fetchTotalCount("");
      loadData(1, true);
    };
    init();
  }, [id, navigate, processDays, fetchTotalCount]);

  const handleEditOpen = (rowData) => {
    const uiDays = rowData.days.includes("Everyday")
      ? ALL_WORKING_DAYS
      : rowData.days;
    setEditData({ ...rowData, targetGroupId: id, days: uiDays });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const isGroupChanged = editData.targetGroupId !== id;
      let finalDaysToSave;

      if (isGroupChanged) {
        const targetGroup = allGroups.find(
          (g) => g.value === editData.targetGroupId,
        );
        const targetGroupDays = targetGroup?.days || [];

        const isTargetEveryday =
          targetGroupDays.includes("Everyday") ||
          targetGroupDays.includes("Every day") ||
          targetGroupDays.length === ALL_WORKING_DAYS.length;

        if (isTargetEveryday) {
          finalDaysToSave = ["Everyday"];
        } else {
          finalDaysToSave = targetGroupDays;
        }

        const batch = writeBatch(db);
        batch.set(
          doc(db, "groups", editData.targetGroupId, "students", selectedId),
          {
            studentName: editData.studentName,
            lastName: editData.lastName,
            phoneNumber: editData.phoneNumber,
            days: finalDaysToSave,
          },
        );
        batch.delete(doc(db, "groups", id, "students", selectedId));
        await batch.commit();
        toast.success(t("student_moved_successfully"));
      } else {
        finalDaysToSave = prepareDaysForSave(editData.days);
        await updateDoc(doc(db, "groups", id, "students", selectedId), {
          studentName: editData.studentName,
          lastName: editData.lastName,
          phoneNumber: editData.phoneNumber,
          days: finalDaysToSave,
        });
        toast.success(t("student_updated_successfully"));
      }

      setShowEditModal(false);
      setSelectedId(null);
      await fetchTotalCount(searchKeyword);
      await loadData(1, true);
    } catch (error) {
      toast.error(t("error_occurred"));
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    setLoading(true);
    try {
      await deleteDoc(doc(db, "groups", id, "students", selectedId));
      toast.success(t("student_deleted_successfully"));
      setShowDeleteModal(false);
      setSelectedId(null);
      await fetchTotalCount(searchKeyword);
      await loadData(1, true);
    } catch (error) {
      toast.error(t("error_deleting_student"));
    } finally {
      setLoading(false);
    }
  };

  const handleGroupEditOpen = () => {
    if (groupData) {
      const uiDays = groupData.days.includes("Everyday")
        ? ALL_WORKING_DAYS
        : groupData.days;
      setGroupEditData({
        groupName: groupData.groupName,
        lessonTime: groupData.lessonTime,
        days: uiDays,
      });
      setShowGroupEditModal(true);
    }
  };

  const handleGroupUpdate = async () => {
    setLoading(true);
    try {
      const finalDays = prepareDaysForSave(groupEditData.days);

      await updateDoc(doc(db, "groups", id), {
        groupName: groupEditData.groupName,
        lessonTime: groupEditData.lessonTime,
        days: finalDays,
        weekdays: finalDays, // Eski field ni ham yangilaymiz
      });

      toast.success(t("group_updated_successfully"));
      setShowGroupEditModal(false);

      // Yangi ma'lumotlarni yuklash
      await loadGroupData();
    } catch (error) {
      console.error("Group update error:", error);
      toast.error(t("error_updating_group"));
    } finally {
      setLoading(false);
    }
  };

  const handleGroupDelete = async () => {
    setLoading(true);
    try {
      // Avval guruhdagi barcha studentlarni o'chirish
      const studentsRef = collection(db, "groups", id, "students");
      const studentsSnapshot = await getDocs(studentsRef);

      if (!studentsSnapshot.empty) {
        const batch = writeBatch(db);
        studentsSnapshot.docs.forEach((studentDoc) => {
          batch.delete(studentDoc.ref);
        });
        await batch.commit();
      }

      // Guruhni o'chirish
      await deleteDoc(doc(db, "groups", id));

      toast.success(t("group_deleted_successfully"));
      setShowGroupDeleteModal(false);

      // Asosiy sahifaga qaytish
      navigate("/");
    } catch (error) {
      console.error("Group delete error:", error);
      toast.error(t("error_deleting_group"));
    } finally {
      setLoading(false);
    }
  };

  const triggerSearch = () => {
    setActivePage(1);
    fetchTotalCount(searchKeyword);
    loadData(1, true);
  };

  return (
    <div
      style={{
        padding: "clamp(10px, 2vw, 20px)",
        backgroundColor: theme === "dark" ? "#0F131A" : "#FAFAFA",
        minHeight: "100vh",
      }}
    >
      <style>{`
    .rs-table {
      background: ${theme === "dark" ? "#0F131A" : "#fcfcfc"} !important;
    }
    
    .rs-table-cell {
      background: ${theme === "dark" ? "#1b212b !important" : "#fff !important"};
      border: 1px solid ${theme === "dark" ? "#2d3748" : "#e2e8f0"} !important;
      color: ${theme === "dark" ? "#e2e8f0" : "#2d3748"} !important;
    }
    
    .rs-table-header-cell {
      background: ${theme === "dark" ? "#1a1d24 !important" : "#f8f9fa !important"};
      border: 1px solid ${theme === "dark" ? "#2d3748" : "#e2e8f0"} !important;
      color: ${theme === "dark" ? "#cbd5e0" : "#4a5568"} !important;
      font-weight: 600 !important;
    }
    
    .rs-table-row:hover .rs-table-cell {
      background: ${theme === "dark" ? "#2d3748 !important" : "#f7fafc !important"} !important;
    }
    
    .rs-table-row-selected .rs-table-cell {
      background: ${theme === "dark" ? "#2a4365 !important" : "#ebf8ff !important"} !important;
      border-color: ${theme === "dark" ? "#4299e1" : "#3182ce"} !important;
    }
    
    .modal-themed .rs-modal-content {
      background: ${theme === "dark" ? "#1a1d24" : "#fff"};
      color: ${theme === "dark" ? "#e2e8f0" : "#2d3748"};
      border: 1px solid ${theme === "dark" ? "#2d3748" : "#e2e8f0"};
    }
    
    .modal-themed .rs-modal-header {
      border-bottom: 1px solid ${theme === "dark" ? "#2d3748" : "#436795"};
      padding: 16px 20px;
    }
    
    .modal-themed .rs-modal-body {
      padding: 20px;
    }
    
    .modal-themed .rs-modal-footer {
      border-top: 1px solid ${theme === "dark" ? "#2d3748" : "#e2e8f0"};
      padding: 16px 20px;
    }
    
    .modal-themed .rs-modal-title {
      color: ${theme === "dark" ? "#fff" : "#2d3748"};
      font-weight: 600;
    }
    
    .modal-themed .rs-input,
    .modal-themed .rs-picker-toggle {
      background: ${theme === "dark" ? "#2d3748" : "#fff"};
      border: 1px solid ${theme === "dark" ? "#4a5568" : "#e2e8f0"};
      color: ${theme === "dark" ? "#e2e8f0" : "#2d3748"};
    }
    
    .modal-themed .rs-input:focus,
    .modal-themed .rs-picker-toggle-active {
      border-color: ${theme === "dark" ? "#4299e1" : "#3182ce"};
      box-shadow: 0 0 0 2px ${theme === "dark" ? "rgba(66, 153, 225, 0.3)" : "rgba(49, 130, 206, 0.3)"};
    }
    
    .modal-themed .rs-form-control-label {
      color: ${theme === "dark" ? "#cbd5e0" : "#4a5568"} !important;
      font-weight: 500;
    }
    
    .rs-picker-menu,
    .rs-checkbox-menu,
    .rs-select-menu {
      background: ${theme === "dark" ? "#1a1d24" : "#fff"} !important;
      border: 1px solid ${theme === "dark" ? "#2d3748" : "#e2e8f0"} !important;
      color: ${theme === "dark" ? "#e2e8f0" : "#2d3748"} !important;
    }
    
    .rs-picker-select-menu-item:hover,
    .rs-check-item:hover {
      background: ${theme === "dark" ? "#2d3748" : "#f7fafc"} !important;
    }
    
    .rs-picker-select-menu-item.rs-picker-select-menu-item-active,
    .rs-check-item.rs-check-item-checked {
      background: ${theme === "dark" ? "#2a4365" : "#ebf8ff"} !important;
      color: ${theme === "dark" ? "#90cdf4" : "#3182ce"} !important;
    }
    
    .rs-pagination {
      color: ${theme === "dark" ? "#cbd5e0" : "#718096"};
    }
    
    .rs-pagination-btn {
      color: ${theme === "dark" ? "#cbd5e0" : "#718096"} !important;
      background: ${theme === "dark" ? "#2d3748" : "#fff"} !important;
      border: 1px solid ${theme === "dark" ? "#4a5568" : "#e2e8f0"} !important;
    }
    
    .rs-pagination-btn:hover {
      background: ${theme === "dark" ? "#4a5568" : "#f7fafc"} !important;
    }
    
    .rs-pagination-btn.rs-pagination-btn-active {
      background: ${theme === "dark" ? "#4299e1" : "#3182ce"} !important;
      color: white !important;
      border-color: ${theme === "dark" ? "#4299e1" : "#3182ce"} !important;
    }
    
    .rs-accordion {
      background: ${theme === "dark" ? "#1a1d24" : "transparent"};
      border: 1px solid ${theme === "dark" ? "#2d3748" : "#e2e8f0"};
    }
    
    .rs-accordion-item {
      border-bottom: 1px solid ${theme === "dark" ? "#2d3748" : "#e2e8f0"};
    }
    
    .rs-accordion-item-active {
      border-color: ${theme === "dark" ? "#4299e1" : "#3182ce"};
    }
    
    .rs-accordion-toggle {
      color: ${theme === "dark" ? "#e2e8f0" : "#2d3748"};
      background: ${theme === "dark" ? "#1a1d24" : "#f8f9fa"};
    }
    
    .rs-accordion-toggle:hover {
      background: ${theme === "dark" ? "#2d3748" : "#edf2f7"};
    }
    
    .rs-accordion-toggle.rs-accordion-toggle-focus {
      box-shadow: 0 0 0 2px ${theme === "dark" ? "rgba(66, 153, 225, 0.3)" : "rgba(49, 130, 206, 0.3)"};
    }
    
    .rs-btn-primary {
      background: ${theme === "dark" ? "#4299e1" : "#3182ce"} !important;
      border-color: ${theme === "dark" ? "#4299e1" : "#3182ce"} !important;
    }
    
    .rs-btn-primary:hover {
      background: ${theme === "dark" ? "#3182ce" : "#2c5282"} !important;
      border-color: ${theme === "dark" ? "#3182ce" : "#2c5282"} !important;
    }
    
    .rs-btn-subtle {
      color: ${theme === "dark" ? "#cbd5e0" : "#718096"} !important;
    }
    
    .rs-btn-subtle:hover {
      background: ${theme === "dark" ? "#2d3748" : "#f7fafc"} !important;
      color: ${theme === "dark" ? "#fff" : "#2d3748"} !important;
    }
    
    .rs-tag {
      background: ${theme === "dark" ? "#2d3748" : "#f7fafc"};
      border: 1px solid ${theme === "dark" ? "#4a5568" : "#e2e8f0"};
      color: ${theme === "dark" ? "#cbd5e0" : "#4a5568"};
    }
    
    .rs-tag-blue {
      background: ${theme === "dark" ? "#2a4365" : "#ebf8ff"};
      border-color: ${theme === "dark" ? "#4299e1" : "#90cdf4"};
      color: ${theme === "dark" ? "#90cdf4" : "#3182ce"};
    }
    
    .rs-tag-green {
      background: ${theme === "dark" ? "#22543d" : "#f0fff4"};
      border-color: ${theme === "dark" ? "#48bb78" : "#9ae6b4"};
      color: ${theme === "dark" ? "#9ae6b4" : "#276749"};
    }
    
    .rs-tag-cyan {
      background: ${theme === "dark" ? "#234e52" : "#e6fffa"};
      border-color: ${theme === "dark" ? "#38b2ac" : "#81e6d9"};
      color: ${theme === "dark" ? "#81e6d9" : "#285e61"};
    }
    
    .rs-btn-icon {
      color: ${theme === "dark" ? "#cbd5e0" : "#718096"};
    }
    
    .rs-btn-icon:hover {
      background: ${theme === "dark" ? "#2d3748" : "#2f658a"};
      color: ${theme === "dark" ? "#fff" : "#2d3748"};
    }
    
    .rs-btn-icon.rs-btn-icon-with-text {
      color: ${theme === "dark" ? "#e2e8f0" : "#2d3748"};
    }
    
    .rs-checkbox-checker {
      color: ${theme === "dark" ? "#e2e8f0" : "#2d3748"} !important;
    }
    
    .rs-checkbox-checked .rs-checkbox-inner:before {
      border-color: ${theme === "dark" ? "#4299e1" : "#3182ce"};
      background: ${theme === "dark" ? "#4299e1" : "#3182ce"};
    }
    
    .rs-input-group {
      background: ${theme === "dark" ? "#2d3748" : "#fff"};
      border: 1px solid ${theme === "dark" ? "#4a5568" : "#e2e8f0"};
    }
    
    .rs-input-group .rs-input {
      background: transparent;
      color: ${theme === "dark" ? "#e2e8f0" : "#2d3748"};
    }
    
    .rs-input-group .rs-input::placeholder {
      color: ${theme === "dark" ? "#a0aec0" : "#a0aec0"};
    }
    
    .rs-input-group-addon {
      background: ${theme === "dark" ? "#4a5568" : "#edf2f7"};
      border-color: ${theme === "dark" ? "#4a5568" : "#e2e8f0"};
      color: ${theme === "dark" ? "#cbd5e0" : "#718096"};
    }
    
    .rs-input-group-btn .rs-btn {
      background: ${theme === "dark" ? "#4a5568" : "#edf2f7"};
      border-color: ${theme === "dark" ? "#4a5568" : "#e2e8f0"};
      color: ${theme === "dark" ? "#cbd5e0" : "#718096"};
    }
    
    .rs-input-group-btn .rs-btn:hover {
      background: ${theme === "dark" ? "#718096" : "#e2e8f0"};
    }
    
    .capitalize-text { text-transform: capitalize; }
    
    /* Dropdown menu theming */
    .rs-dropdown-menu {
      background: ${theme === "dark" ? "#1a1d24" : "#fff"} !important;
      border: 1px solid ${theme === "dark" ? "#2d3748" : "#e2e8f0"} !important;
      box-shadow: 0 4px 6px ${theme === "dark" ? "rgba(0, 0, 0, 0.3)" : "rgba(0, 0, 0, 0.1)"};
    }
    
    .rs-dropdown-item {
      color: ${theme === "dark" ? "#e2e8f0" : "#2d3748"} !important;
    }
    
    .rs-dropdown-item:hover {
      background: ${theme === "dark" ? "#2d3748" : "#f7fafc"} !important;
    }
    
    .rs-dropdown-item .rs-icon {
      color: ${theme === "dark" ? "#90cdf4" : "#3182ce"};
    }
  `}</style>

      <Stack justifyContent="space-between" style={{ marginBottom: 20 }}>
        <Stack spacing={10}>
          <h4
            style={{
              margin: 0,
              color: theme === "dark" ? "#fff" : "#2d3748",
              fontWeight: 600,
            }}
          >
            {t("Students")}
          </h4>
          <Divider
            vertical
            style={{
              backgroundColor: theme === "dark" ? "#4a5568" : "#e2e8f0",
            }}
          />
          <HStack
            spacing={6}
            style={{
              color: theme === "dark" ? "#90cdf4" : "#3182ce",
              alignItems: "center",
            }}
          >
            <PiStudentThin size={20} />
            <span
              style={{
                fontWeight: 500,
                color: theme === "dark" ? "#cbd5e0" : "#4a5568",
              }}
            >
              {totalStudents}
            </span>
          </HStack>
        </Stack>

        <InputGroup inside style={{ width: 300 }}>
          <Input
            placeholder={t("search_placeholder")}
            value={searchKeyword}
            onChange={setSearchKeyword}
            onPressEnter={triggerSearch}
            style={{
              backgroundColor: theme === "dark" ? "#2d3748" : "#fff",
              color: theme === "dark" ? "#e2e8f0" : "#2d3748",
              borderColor: theme === "dark" ? "#4a5568" : "#e2e8f0",
            }}
          />
          {searchKeyword && (
            <InputGroup.Button
              onClick={() => setSearchKeyword("")}
              style={{
                backgroundColor: theme === "dark" ? "#4a5568" : "#edf2f7",
                borderColor: theme === "dark" ? "#4a5568" : "#e2e8f0",
              }}
            >
              <CloseOutlineIcon
                style={{
                  color: theme === "dark" ? "#cbd5e0" : "#718096",
                }}
              />
            </InputGroup.Button>
          )}
          <InputGroup.Button onClick={triggerSearch}>
            <SearchIcon
              style={{
                color: theme === "dark" ? "#eeeeee" : "#3182ce",
              }}
            />
          </InputGroup.Button>
        </InputGroup>
      </Stack>

      <Accordion
        bordered
        defaultActiveKey={1}
        style={{
          background: theme === "dark" ? "#1a1d24" : "#fff",
          borderColor: theme === "dark" ? "#2A2C31" : "#E4E4E7",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <Accordion.Panel
          header={
            <Stack
              justifyContent="space-between"
              alignItems="center"
              style={{ padding: "12px 16px", width: "100%" }}
            >
              <Stack spacing={15} style={{ flex: 1 }}>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: "1.1rem",
                    color: theme === "dark" ? "#fff" : "#2d3748",
                  }}
                >
                  {groupData?.groupName || "---"}
                </span>
                <Tag
                  color="blue"
                  variant="filled"
                  style={{
                    backgroundColor: theme === "dark" ? "#2a4365" : "#ebf8ff",
                    borderColor: theme === "dark" ? "#4299e1" : "#90cdf4",
                    color: theme === "dark" ? "#90cdf4" : "#3182ce",
                    fontWeight: 500,
                  }}
                >
                  {groupData?.lessonTime}
                </Tag>
                {groupData?.days?.includes("Everyday") && (
                  <Tag
                    color="green"
                    style={{
                      backgroundColor: theme === "dark" ? "#22543d" : "#f0fff4",
                      borderColor: theme === "dark" ? "#48bb78" : "#9ae6b4",
                      color: theme === "dark" ? "#9ae6b4" : "#276749",
                      fontWeight: 500,
                    }}
                  >
                    {t("Everyday")}
                  </Tag>
                )}
              </Stack>

              {/* 3 nuqta menu */}
              <Whisper
                placement="bottomEnd"
                trigger="click"
                speaker={renderMenu}
                controlId={`dropdown-${id}`}
              >
                <IconButton
                  size="sm"
                  appearance="subtle"
                  icon={<MoreIcon />}
                  style={{
                    color: theme === "dark" ? "#cbd5e0" : "#718096",
                    backgroundColor: theme === "dark" ? "#2d3748" : "#f7fafc",
                    border: `1px solid ${theme === "dark" ? "#4a5568" : "#e2e8f0"}`,
                  }}
                />
              </Whisper>
            </Stack>
          }
          bodyFill
        >
          <Table
            height={450}
            data={students}
            loading={loading}
            cellBordered
            rowHeight={60}
            headerHeight={50}
            style={{
              backgroundColor: theme === "dark" ? "#1b212b" : "#fff",
            }}
          >
            <Column width={50} align="center" fixed>
              <HeaderCell style={{ fontSize: "10px" }}>{t("Check")}</HeaderCell>
              <Cell>
                {(rowData) => (
                  <Checkbox
                    checked={selectedId === rowData.id}
                    onChange={(v, checked) =>
                      setSelectedId(checked ? rowData.id : null)
                    }
                    style={{
                      color: theme === "dark" ? "#e2e8f0" : "#2d3748",
                    }}
                  />
                )}
              </Cell>
            </Column>
            <Column width={60} align="center">
              <HeaderCell>№</HeaderCell>
              <Cell>
                {(r, i) => (
                  <span
                    style={{
                      color: theme === "dark" ? "#cbd5e0" : "#718096",
                      fontWeight: 500,
                    }}
                  >
                    {(activePage - 1) * displayLimit + i + 1}
                  </span>
                )}
              </Cell>
            </Column>
            <Column width={180}>
              <HeaderCell>{t("Student name")}</HeaderCell>
              <Cell className="capitalize-text" dataKey="studentName">
                {(rowData) => (
                  <span
                    style={{ color: theme === "dark" ? "#e2e8f0" : "#2d3748" }}
                  >
                    {rowData.studentName}
                  </span>
                )}
              </Cell>
            </Column>
            <Column width={180}>
              <HeaderCell>{t("Student lastName")}</HeaderCell>
              <Cell className="capitalize-text" dataKey="lastName">
                {(rowData) => (
                  <span
                    style={{ color: theme === "dark" ? "#e2e8f0" : "#2d3748" }}
                  >
                    {rowData.lastName}
                  </span>
                )}
              </Cell>
            </Column>
            <Column width={160}>
              <HeaderCell>{t("phone")}</HeaderCell>
              <Cell>
                {(r) => (
                  <span
                    style={{
                      color: theme === "dark" ? "#90cdf4" : "#3182ce",
                      fontWeight: 500,
                    }}
                  >
                    +998 {r.phoneNumber}
                  </span>
                )}
              </Cell>
            </Column>
            <Column width={120} fixed="right">
              <HeaderCell>{t("actions")}</HeaderCell>
              <Cell>
                {(rowData) =>
                  selectedId === rowData.id && (
                    <Stack spacing={8}>
                      <IconButton
                        size="sm"
                        color="blue"
                        appearance="subtle"
                        icon={<EditIcon />}
                        onClick={() => handleEditOpen(rowData)}
                        style={{
                          color: theme === "dark" ? "#90cdf4" : "#3182ce",
                          backgroundColor:
                            theme === "dark" ? "#2a4365" : "#ebf8ff",
                          border: `1px solid ${theme === "dark" ? "#4299e1" : "#90cdf4"}`,
                        }}
                      />
                      <IconButton
                        size="sm"
                        color="red"
                        appearance="subtle"
                        icon={<TrashIcon />}
                        onClick={() => setShowDeleteModal(true)}
                        style={{
                          color: theme === "dark" ? "#fc8181" : "#e53e3e",
                          backgroundColor:
                            theme === "dark" ? "#742a2a" : "#fed7d7",
                          border: `1px solid ${theme === "dark" ? "#f56565" : "#fc8181"}`,
                        }}
                      />
                    </Stack>
                  )
                }
              </Cell>
            </Column>
            <Column minWidth={250} flexGrow={1}>
              <HeaderCell>{t("Weekdays")}</HeaderCell>
              <Cell>
                {(rowData) => (
                  <TagGroup>
                    {rowData.days.includes("Everyday") ? (
                      <Tag
                        color="green"
                        variant="filled"
                        style={{
                          backgroundColor:
                            theme === "dark" ? "#22543d" : "#f0fff4",
                          borderColor: theme === "dark" ? "#48bb78" : "#9ae6b4",
                          color: theme === "dark" ? "#9ae6b4" : "#276749",
                        }}
                      >
                        {t("Everyday")}
                      </Tag>
                    ) : (
                      rowData.days.map((day) => (
                        <Tag
                          key={day}
                          color="cyan"
                          style={{
                            backgroundColor:
                              theme === "dark" ? "#234e52" : "#e6fffa",
                            borderColor:
                              theme === "dark" ? "#38b2ac" : "#81e6d9",
                            color: theme === "dark" ? "#81e6d9" : "#285e61",
                            marginRight: 4,
                            marginBottom: 4,
                          }}
                        >
                          {t(day)}
                        </Tag>
                      ))
                    )}
                  </TagGroup>
                )}
              </Cell>
            </Column>
          </Table>
          <div
            style={{
              padding: 20,
              backgroundColor: theme === "dark" ? "#1a1d24" : "#fff",
              borderTop: `1px solid ${theme === "dark" ? "#2d3748" : "#e2e8f0"}`,
            }}
          >
            <Pagination
              total={totalStudents}
              limit={displayLimit}
              activePage={activePage}
              onChangePage={(p) => {
                setActivePage(p);
                loadData(p);
              }}
              first
              last
              ellipsis
              boundaryLinks
              style={{
                color: theme === "dark" ? "#cbd5e0" : "#718096",
              }}
            />
          </div>
        </Accordion.Panel>
      </Accordion>

      {/* Student Edit Modal */}
      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        size="md"
        className="modal-themed"
        backdrop={true}
      >
        <Modal.Header>
          <Modal.Title>{t("edit_student_title")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form fluid onChange={setEditData} formValue={editData}>
            <Grid fluid>
              <Row>
                <Col xs={12}>
                  <Form.Group>
                    <Form.ControlLabel>{t("Student name")}</Form.ControlLabel>
                    <Form.Control
                      name="studentName"
                      style={{
                        backgroundColor: theme === "dark" ? "#2d3748" : "#fff",
                        color: theme === "dark" ? "#e2e8f0" : "#2d3748",
                        borderColor: theme === "dark" ? "#4a5568" : "#e2e8f0",
                      }}
                    />
                  </Form.Group>
                </Col>
                <Col xs={12}>
                  <Form.Group>
                    <Form.ControlLabel>
                      {t("Student lastName")}
                    </Form.ControlLabel>
                    <Form.Control
                      name="lastName"
                      style={{
                        backgroundColor: theme === "dark" ? "#2d3748" : "#fff",
                        color: theme === "dark" ? "#e2e8f0" : "#2d3748",
                        borderColor: theme === "dark" ? "#4a5568" : "#e2e8f0",
                      }}
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row style={{ marginTop: 15 }}>
                <Col xs={12}>
                  <Form.Group>
                    <Form.ControlLabel>
                      {t("Student phoneNumber")}
                    </Form.ControlLabel>
                    <Form.Control
                      name="phoneNumber"
                      style={{
                        backgroundColor: theme === "dark" ? "#2d3748" : "#fff",
                        color: theme === "dark" ? "#e2e8f0" : "#2d3748",
                        borderColor: theme === "dark" ? "#4a5568" : "#e2e8f0",
                      }}
                    />
                  </Form.Group>
                </Col>
                <Col xs={12}>
                  <Form.Group>
                    <Form.ControlLabel>{t("change_group")}</Form.ControlLabel>
                    <Form.Control
                      name="targetGroupId"
                      accepter={SelectPicker}
                      data={allGroups}
                      block
                      cleanable={false}
                      loading={groupSearchLoading}
                      onSearch={fetchAllGroups}
                      onOpen={() => fetchAllGroups("")}
                      style={{
                        backgroundColor: theme === "dark" ? "#2d3748" : "#fff",
                        color: theme === "dark" ? "#e2e8f0" : "#2d3748",
                        borderColor: theme === "dark" ? "#4a5568" : "#e2e8f0",
                      }}
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row style={{ marginTop: 15 }}>
                <Col xs={24}>
                  <Form.Group>
                    <Form.ControlLabel>{t("Weekdays")}</Form.ControlLabel>
                    <Form.Control
                      name="days"
                      accepter={CheckPicker}
                      data={weekDaysOptions}
                      block
                      placeholder={t("Select week days")}
                      style={{
                        backgroundColor: theme === "dark" ? "#2d3748" : "#fff",
                        color: theme === "dark" ? "#e2e8f0" : "#2d3748",
                        borderColor: theme === "dark" ? "#4a5568" : "#e2e8f0",
                      }}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Grid>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            onClick={handleUpdate}
            appearance="primary"
            color="blue"
            loading={loading}
          >
            {t("Save")}
          </Button>
          <Button
            onClick={() => setShowEditModal(false)}
            appearance="subtle"
            style={{
              color: theme === "dark" ? "#cbd5e0" : "#718096",
            }}
          >
            {t("Cancel")}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Student Delete Modal */}
      <Modal
        backdrop="static"
        role="alertdialog"
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        size="xs"
        className="modal-themed"
      >
        <Modal.Body style={{ textAlign: "center" }}>
          <RemindIcon
            style={{
              color: theme === "dark" ? "#f6ad55" : "#dd6b20",
              fontSize: 54,
            }}
          />
          <h4
            style={{
              marginTop: 20,
              color: theme === "dark" ? "#fff" : "#2d3748",
            }}
          >
            {t("delete_confirm_title")}
          </h4>
          <p
            style={{
              opacity: 0.7,
              color: theme === "dark" ? "#cbd5e0" : "#718096",
            }}
          >
            {t("delete_confirm_desc")}
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            onClick={confirmDelete}
            color="red"
            appearance="primary"
            loading={loading}
            style={{
              backgroundColor: theme === "dark" ? "#c53030" : "#e53e3e",
              borderColor: theme === "dark" ? "#c53030" : "#e53e3e",
            }}
          >
            {t("delete_button")}
          </Button>
          <Button
            onClick={() => setShowDeleteModal(false)}
            appearance="subtle"
            style={{
              color: theme === "dark" ? "#cbd5e0" : "#718096",
            }}
          >
            {t("Cancel")}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Group Edit Modal */}
      <Modal
        open={showGroupEditModal}
        onClose={() => setShowGroupEditModal(false)}
        size="md"
        className="modal-themed"
        backdrop={true}
      >
        <Modal.Header>
          <Modal.Title>{t("edit_group_title")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form fluid onChange={setGroupEditData} formValue={groupEditData}>
            <Grid fluid>
              <Row>
                <Col xs={12}>
                  <Form.Group>
                    <Form.ControlLabel>{t("group_name")}</Form.ControlLabel>
                    <Form.Control
                      name="groupName"
                      style={{
                        backgroundColor: theme === "dark" ? "#2d3748" : "#fff",
                        color: theme === "dark" ? "#e2e8f0" : "#2d3748",
                        borderColor: theme === "dark" ? "#4a5568" : "#e2e8f0",
                      }}
                    />
                  </Form.Group>
                </Col>
                <Col xs={12}>
                  <Form.Group>
                    <Form.ControlLabel>{t("lesson_time")}</Form.ControlLabel>
                    <Form.Control
                      name="lessonTime"
                      style={{
                        backgroundColor: theme === "dark" ? "#2d3748" : "#fff",
                        color: theme === "dark" ? "#e2e8f0" : "#2d3748",
                        borderColor: theme === "dark" ? "#4a5568" : "#e2e8f0",
                      }}
                      placeholder="e.g., 14:00-16:00"
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row style={{ marginTop: 15 }}>
                <Col xs={24}>
                  <Form.Group>
                    <Form.ControlLabel>{t("Weekdays")}</Form.ControlLabel>
                    <Form.Control
                      name="days"
                      accepter={CheckPicker}
                      data={weekDaysOptions}
                      block
                      placeholder={t("Select week days")}
                      style={{
                        backgroundColor: theme === "dark" ? "#2d3748" : "#fff",
                        color: theme === "dark" ? "#e2e8f0" : "#2d3748",
                        borderColor: theme === "dark" ? "#4a5568" : "#e2e8f0",
                      }}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Grid>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            onClick={handleGroupUpdate}
            appearance="primary"
            color="blue"
            loading={loading}
          >
            {t("Save")}
          </Button>
          <Button
            onClick={() => setShowGroupEditModal(false)}
            appearance="subtle"
            style={{
              color: theme === "dark" ? "#cbd5e0" : "#718096",
            }}
          >
            {t("Cancel")}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Group Delete Modal */}
      <Modal
        backdrop="static"
        role="alertdialog"
        open={showGroupDeleteModal}
        onClose={() => setShowGroupDeleteModal(false)}
        size="xs"
        className="modal-themed"
      >
        <Modal.Body style={{ textAlign: "center" }}>
          <RemindIcon
            style={{
              color: theme === "dark" ? "#f56565" : "#e53e3e",
              fontSize: 54,
            }}
          />
          <h4
            style={{
              marginTop: 20,
              color: theme === "dark" ? "#fff" : "#2d3748",
            }}
          >
            {t("delete_group_confirm_title")}
          </h4>
          <p
            style={{
              opacity: 0.7,
              color: theme === "dark" ? "#cbd5e0" : "#718096",
              marginBottom: 10,
            }}
          >
            {t("delete_group_confirm_desc")}
          </p>
          <p
            style={{
              color: theme === "dark" ? "#fc8181" : "#e53e3e",
              fontWeight: 500,
              fontSize: 14,
            }}
          >
            ⚠️ {t("delete_group_warning")}
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            onClick={handleGroupDelete}
            color="red"
            appearance="primary"
            loading={loading}
            style={{
              backgroundColor: theme === "dark" ? "#c53030" : "#e53e3e",
              borderColor: theme === "dark" ? "#c53030" : "#e53e3e",
            }}
          >
            {t("delete_group_button")}
          </Button>
          <Button
            onClick={() => setShowGroupDeleteModal(false)}
            appearance="subtle"
            style={{
              color: theme === "dark" ? "#cbd5e0" : "#718096",
            }}
          >
            {t("Cancel")}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Group;
