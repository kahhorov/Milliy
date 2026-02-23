import React, { useEffect, useState, useCallback, useRef } from "react";
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
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import {
  Table,
  Pagination,
  Tag,
  TagGroup,
  InputGroup,
  Input,
  Stack,
  HStack,
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
  Loader,
  Badge,
  Tooltip,
  Avatar,
} from "rsuite";
import { useSelector } from "react-redux";
import {
  FiSearch,
  FiX,
  FiEdit2,
  FiTrash2,
  FiMoreVertical,
  FiUsers,
  FiClock,
  FiPhone,
  FiAlertCircle,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";
import {
  MdOutlineGroups,
  MdOutlineEdit,
  MdOutlineDelete,
} from "react-icons/md";
import { FaTelegram } from "react-icons/fa";

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
  const isDark = theme === "dark";

  // States
  const [groupData, setGroupData] = useState(null);
  const [students, setStudents] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [groupSearchLoading, setGroupSearchLoading] = useState(false);
  const [accordionExpanded, setAccordionExpanded] = useState(true);

  const [activePage, setActivePage] = useState(1);
  const [displayLimit] = useState(20);
  const [totalStudents, setTotalStudents] = useState(0);
  const [lastDoc, setLastDoc] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [selectedId, setSelectedId] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showGroupEditModal, setShowGroupEditModal] = useState(false);
  const [showGroupDeleteModal, setShowGroupDeleteModal] = useState(false);
  const [editData, setEditData] = useState({
    studentName: "",
    lastName: "",
    phoneNumber: "",
    telegramId: "",
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

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchKeyword);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchKeyword]);

  // Search effect
  useEffect(() => {
    if (!id) return;
    setActivePage(1);
    fetchTotalCount(debouncedSearch);
    loadData(1, true, debouncedSearch);
  }, [debouncedSearch, id]);

  // Real-time students listener
  useEffect(() => {
    if (!id) return;

    const studentsRef = collection(db, "groups", id, "students");
    const q = query(studentsRef, orderBy("studentName"), limit(displayLimit));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        days: processDays(doc.data().days),
      }));
      setStudents(list);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setInitialLoading(false);
    });

    return () => unsubscribe();
  }, [id, displayLimit]);

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
      <Popover
        ref={ref}
        className={`${className} ${isDark ? "dark-menu" : ""}`}
        style={{ left, top, zIndex: 9999 }}
        arrow={false}
      >
        <Dropdown.Menu onSelect={handleSelect}>
          <Dropdown.Item
            eventKey={1}
            icon={<MdOutlineEdit className="text-blue-500" size={18} />}
          >
            <span className={isDark ? "text-gray-200" : "text-gray-700"}>
              {t("edit_group")}
            </span>
          </Dropdown.Item>
          <Dropdown.Item
            eventKey={2}
            icon={<MdOutlineDelete className="text-red-500" size={18} />}
          >
            <span className={isDark ? "text-gray-200" : "text-gray-700"}>
              {t("delete_group")}
            </span>
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
    async (pageNum = 1, isNewSearch = false, search = "") => {
      setLoading(true);
      try {
        const studentsRef = collection(db, "groups", id, "students");
        let q;
        const trimmedSearch = search.trim();

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
    [id, displayLimit, lastDoc, t, processDays],
  );

  const fetchAllGroups = async (search = "") => {
    setGroupSearchLoading(true);
    try {
      const groupsRef = collection(db, "groups");
      let q = query(groupsRef, orderBy("groupName"), limit(50)); // Increased limit for better UX
      if (search) {
        q = query(
          groupsRef,
          orderBy("groupName"),
          where("groupName", ">=", search),
          where("groupName", "<=", search + "\uf8ff"),
          limit(50),
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
    };
    init();
  }, [id]);

  const handleEditOpen = (rowData) => {
    const uiDays = rowData.days.includes("Everyday")
      ? ALL_WORKING_DAYS
      : rowData.days;
    setSelectedId(rowData.id);
    setEditData({
      studentName: rowData.studentName || "",
      lastName: rowData.lastName || "",
      phoneNumber: rowData.phoneNumber || "",
      telegramId: rowData.telegramId || "",
      targetGroupId: id,
      days: uiDays,
    });
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
            telegramId: editData.telegramId || "",
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
          telegramId: editData.telegramId || "",
          days: finalDaysToSave,
        });
        toast.success(t("student_updated_successfully"));
      }

      setShowEditModal(false);
      setSelectedId(null);
      await fetchTotalCount(debouncedSearch);
    } catch (error) {
      console.error("Update error:", error);
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
      await fetchTotalCount(debouncedSearch);
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
        weekdays: finalDays,
      });

      toast.success(t("group_updated_successfully"));
      setShowGroupEditModal(false);
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
      const studentsRef = collection(db, "groups", id, "students");
      const studentsSnapshot = await getDocs(studentsRef);

      if (!studentsSnapshot.empty) {
        const batch = writeBatch(db);
        studentsSnapshot.docs.forEach((studentDoc) => {
          batch.delete(studentDoc.ref);
        });
        await batch.commit();
      }

      await deleteDoc(doc(db, "groups", id));

      toast.success(t("group_deleted_successfully"));
      setShowGroupDeleteModal(false);
      navigate("/");
    } catch (error) {
      console.error("Group delete error:", error);
      toast.error(t("error_deleting_group"));
    } finally {
      setLoading(false);
    }
  };

  const toggleAccordion = (e) => {
    e.stopPropagation();
    setAccordionExpanded(!accordionExpanded);
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader size="lg" content={t("loading")} vertical />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen p-4 md:p-6 ${isDark ? "bg-gray-900" : "bg-gray-50"}`}
    >
      {/* Header */}
      <div className="mb-6">
        <h1
          className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}
        >
          {t("group_details")}
        </h1>
        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
          {t("manage_students_and_group_settings")}
        </p>
      </div>

      {/* Group Accordion */}
      <div
        className={`rounded-xl border overflow-hidden mb-6 ${
          isDark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"
        }`}
      >
        {/* Accordion Header */}
        <div
          className={`p-4 cursor-pointer flex items-center justify-between ${
            isDark ? "hover:bg-gray-700" : "hover:bg-gray-50"
          }`}
          onClick={toggleAccordion}
        >
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <MdOutlineGroups
                size={24}
                className={isDark ? "text-blue-400" : "text-blue-600"}
              />
              <span
                className={`font-bold text-lg ${
                  isDark ? "text-white" : "text-gray-800"
                }`}
              >
                {groupData?.groupName || "---"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                color="blue"
                content={
                  <div className="flex items-center gap-1">
                    <FiClock size={12} />
                    <span>{groupData?.lessonTime}</span>
                  </div>
                }
              />

              {groupData?.days?.includes("Everyday") ? (
                <Tag
                  color="green"
                  className="!rounded-full !px-3 !py-1 text-xs font-medium"
                >
                  {t("Everyday")}
                </Tag>
              ) : (
                <TagGroup>
                  {groupData?.days?.map((day) => (
                    <Tag
                      key={day}
                      color="cyan"
                      className="!rounded-full !px-3 !py-1 text-xs font-medium"
                    >
                      {t(day)}
                    </Tag>
                  ))}
                </TagGroup>
              )}
            </div>

            <div className="flex items-center gap-1">
              <FiUsers
                size={16}
                className={isDark ? "text-gray-400" : "text-gray-500"}
              />
              <span
                className={`text-sm font-medium ${
                  isDark ? "text-gray-300" : "text-gray-600"
                }`}
              >
                {totalStudents} {t("students")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 3 nuqta menu */}
            <Whisper
              placement="bottomEnd"
              trigger="click"
              speaker={renderMenu}
              controlId={`dropdown-${id}`}
              onClick={(e) => e.stopPropagation()}
            >
              <IconButton
                size="sm"
                appearance="subtle"
                icon={<FiMoreVertical size={18} />}
                className={`!rounded-full ${
                  isDark
                    ? "text-gray-400 hover:text-white hover:bg-gray-700"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
                onClick={(e) => e.stopPropagation()}
              />
            </Whisper>

            {/* Accordion toggle icon */}
            {accordionExpanded ? (
              <FiChevronUp
                size={20}
                className={isDark ? "text-gray-400" : "text-gray-500"}
              />
            ) : (
              <FiChevronDown
                size={20}
                className={isDark ? "text-gray-400" : "text-gray-500"}
              />
            )}
          </div>
        </div>

        {/* Accordion Content */}
        {accordionExpanded && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            {/* Search Bar */}
            <div className="mb-4">
              <InputGroup inside className="w-full md:w-96">
                <Input
                  placeholder={t("search_placeholder")}
                  value={searchKeyword}
                  onChange={setSearchKeyword}
                  className={
                    isDark ? "bg-gray-700 text-white border-gray-600" : ""
                  }
                />
                {searchKeyword && (
                  <InputGroup.Button
                    onClick={() => setSearchKeyword("")}
                    className={isDark ? "bg-gray-700 border-gray-600" : ""}
                  >
                    <FiX
                      className={isDark ? "text-gray-400" : "text-gray-500"}
                    />
                  </InputGroup.Button>
                )}
                <InputGroup.Button
                  className={isDark ? "bg-gray-700 border-gray-600" : ""}
                >
                  <FiSearch
                    className={isDark ? "text-blue-400" : "text-blue-600"}
                  />
                </InputGroup.Button>
              </InputGroup>
            </div>

            {/* Students Table */}
            <div className="w-full overflow-x-auto">
              <Table
                height={450}
                data={students}
                loading={loading}
                cellBordered
                rowHeight={70}
                headerHeight={50}
                className={`w-full rounded-lg overflow-hidden ${
                  isDark ? "dark-table" : ""
                }`}
                style={{ width: "100%" }}
              >
                <Column width={60} align="center" fixed>
                  <HeaderCell className="text-xs font-bold uppercase">
                    {t("№")}
                  </HeaderCell>
                  <Cell>
                    {(rowData, index) => (
                      <span
                        className={`font-medium ${
                          isDark ? "text-gray-300" : "text-gray-600"
                        }`}
                      >
                        {(activePage - 1) * displayLimit + index + 1}
                      </span>
                    )}
                  </Cell>
                </Column>
                <Column width={250} flexGrow={1}>
                  <HeaderCell className="text-xs font-bold uppercase">
                    {t("student_name")}
                  </HeaderCell>
                  <Cell>
                    {(rowData) => (
                      <div className="flex items-center gap-2">
                        <Avatar
                          circle
                          size="sm"
                          className="bg-blue-100 text-blue-600"
                        >
                          {(rowData.studentName || "?").charAt(0)}
                        </Avatar>
                        <div>
                          <div
                            className={`font-medium ${
                              isDark ? "text-white" : "text-gray-800"
                            }`}
                          >
                            {rowData.studentName} {rowData.lastName}
                          </div>
                        </div>
                      </div>
                    )}
                  </Cell>
                </Column>
                <Column width={180}>
                  <HeaderCell className="text-xs font-bold uppercase">
                    {t("phone")}
                  </HeaderCell>
                  <Cell>
                    {(rowData) => (
                      <div className="flex items-center gap-2">
                        <FiPhone
                          size={14}
                          className={isDark ? "text-gray-400" : "text-gray-500"}
                        />
                        <span
                          className={`text-sm ${
                            isDark ? "text-gray-300" : "text-gray-600"
                          }`}
                        >
                          +998 {rowData.phoneNumber}
                        </span>
                      </div>
                    )}
                  </Cell>
                </Column>
                <Column width={180}>
                  <HeaderCell className="text-xs font-bold uppercase">
                    {t("telegram")}
                  </HeaderCell>
                  <Cell>
                    {(rowData) => (
                      <div className="flex items-center gap-2">
                        {rowData.telegramId ? (
                          <>
                            <FaTelegram className="text-blue-500" size={16} />
                            <span
                              className={`text-sm ${
                                isDark ? "text-gray-300" : "text-gray-600"
                              }`}
                            >
                              {rowData.telegramId}
                            </span>
                          </>
                        ) : (
                          <span
                            className={`text-sm italic ${
                              isDark ? "text-gray-500" : "text-gray-400"
                            }`}
                          >
                            {t("not_set")}
                          </span>
                        )}
                      </div>
                    )}
                  </Cell>
                </Column>
                <Column width={220}>
                  <HeaderCell className="text-xs font-bold uppercase">
                    {t("weekdays")}
                  </HeaderCell>
                  <Cell>
                    {(rowData) => (
                      <TagGroup>
                        {rowData.days.includes("Everyday") ? (
                          <Tag
                            color="green"
                            className="!rounded-full !px-3 !py-1 text-xs font-medium"
                          >
                            {t("Everyday")}
                          </Tag>
                        ) : (
                          <div className="flex w-full justify-center items-center gap-2">
                            {rowData.days.map((day) => (
                              <Tag
                                key={day}
                                color="cyan"
                                className="!rounded-full !px-3 !py-1 !text-[10px] font-light"
                              >
                                {t(day.slice(0, 3))}
                              </Tag>
                            ))}
                          </div>
                        )}
                      </TagGroup>
                    )}
                  </Cell>
                </Column>
                <Column width={120} fixed="right">
                  <HeaderCell className="text-xs font-bold uppercase">
                    {t("actions")}
                  </HeaderCell>
                  <Cell>
                    {(rowData) => (
                      <HStack spacing={6}>
                        <Whisper
                          trigger="hover"
                          placement="top"
                          speaker={<Tooltip>{t("edit")}</Tooltip>}
                        >
                          <IconButton
                            size="sm"
                            appearance="subtle"
                            icon={<FiEdit2 size={16} />}
                            onClick={() => handleEditOpen(rowData)}
                            className={`!rounded-full ${
                              isDark
                                ? "text-blue-400 hover:bg-blue-900/30"
                                : "text-blue-600 hover:bg-blue-50"
                            }`}
                          />
                        </Whisper>

                        <Whisper
                          trigger="hover"
                          placement="top"
                          speaker={<Tooltip>{t("delete")}</Tooltip>}
                        >
                          <IconButton
                            size="sm"
                            appearance="subtle"
                            icon={<FiTrash2 size={16} />}
                            onClick={() => {
                              setSelectedId(rowData.id);
                              setShowDeleteModal(true);
                            }}
                            className={`!rounded-full ${
                              isDark
                                ? "text-red-400 hover:bg-red-900/30"
                                : "text-red-600 hover:bg-red-50"
                            }`}
                          />
                        </Whisper>
                      </HStack>
                    )}
                  </Cell>
                </Column>
              </Table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex justify-end">
              <Pagination
                total={totalStudents}
                limit={displayLimit}
                activePage={activePage}
                onChangePage={(p) => {
                  setActivePage(p);
                  loadData(p, false, debouncedSearch);
                }}
                first
                last
                ellipsis
                boundaryLinks
                size="md"
                className={isDark ? "dark-pagination" : ""}
              />
            </div>
          </div>
        )}
      </div>

      {/* Edit Student Modal */}
      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        size="md"
        backdrop="static"
        className={`modal-themed ${isDark ? "dark" : ""}`}
      >
        <Modal.Header>
          <Modal.Title className="flex items-center gap-2">
            <FiEdit2 className="text-blue-500" size={24} />
            <span>{t("edit_student")}</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form fluid onChange={setEditData} formValue={editData}>
            <Grid fluid>
              <Row className="mb-4">
                <Col xs={12}>
                  <Form.Group>
                    <Form.ControlLabel className="text-sm font-medium">
                      {t("first_name")} *
                    </Form.ControlLabel>
                    <Form.Control
                      name="studentName"
                      className={
                        isDark ? "bg-gray-700 text-white border-gray-600" : ""
                      }
                    />
                  </Form.Group>
                </Col>
                <Col xs={12}>
                  <Form.Group>
                    <Form.ControlLabel className="text-sm font-medium">
                      {t("last_name")}
                    </Form.ControlLabel>
                    <Form.Control
                      name="lastName"
                      className={
                        isDark ? "bg-gray-700 text-white border-gray-600" : ""
                      }
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row className="mb-4">
                <Col xs={12}>
                  <Form.Group>
                    <Form.ControlLabel className="text-sm font-medium">
                      {t("phone_number")} *
                    </Form.ControlLabel>
                    <InputGroup
                      className={isDark ? "bg-gray-700 border-gray-600" : ""}
                    >
                      <InputGroup.Addon
                        className={isDark ? "bg-gray-600 text-gray-300" : ""}
                      >
                        +998
                      </InputGroup.Addon>
                      <Form.Control
                        name="phoneNumber"
                        className={
                          isDark ? "bg-gray-700 text-white border-gray-600" : ""
                        }
                      />
                    </InputGroup>
                  </Form.Group>
                </Col>
                <Col xs={12}>
                  <Form.Group>
                    <Form.ControlLabel className="text-sm font-medium">
                      {t("telegram_id")}
                    </Form.ControlLabel>
                    <InputGroup
                      className={isDark ? "bg-gray-700 border-gray-600" : ""}
                    >
                      <InputGroup.Addon
                        className={isDark ? "bg-gray-600 text-gray-300" : ""}
                      >
                        <FaTelegram size={16} className="text-blue-500" />
                      </InputGroup.Addon>
                      <Form.Control
                        name="telegramId"
                        className={
                          isDark ? "bg-gray-700 text-white border-gray-600" : ""
                        }
                      />
                    </InputGroup>
                  </Form.Group>
                </Col>
              </Row>

              <Row className="mb-4">
                <Col xs={24}>
                  <Form.Group>
                    <Form.ControlLabel className="text-sm font-medium">
                      {t("change_group")}
                    </Form.ControlLabel>
                    <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                      <Form.Control
                        name="targetGroupId"
                        accepter={SelectPicker}
                        data={allGroups}
                        block
                        cleanable={false}
                        loading={groupSearchLoading}
                        onSearch={fetchAllGroups}
                        onOpen={() => fetchAllGroups("")}
                        className={isDark ? "dark-picker" : ""}
                        menuStyle={{ maxHeight: 200, overflow: "auto" }}
                        listProps={{
                          style: { maxHeight: 200, overflow: "auto" },
                        }}
                      />
                    </div>
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col xs={24}>
                  <Form.Group>
                    <Form.ControlLabel className="text-sm font-medium">
                      {t("weekdays")}
                    </Form.ControlLabel>
                    <Form.Control
                      name="days"
                      accepter={CheckPicker}
                      data={weekDaysOptions}
                      block
                      placeholder={t("select_weekdays")}
                      className={isDark ? "dark-picker" : ""}
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
            className="!px-6 !py-2"
          >
            {t("save_changes")}
          </Button>
          <Button
            onClick={() => setShowEditModal(false)}
            appearance="subtle"
            className={isDark ? "text-gray-300" : ""}
          >
            {t("cancel")}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Student Modal */}
      <Modal
        backdrop="static"
        role="alertdialog"
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        size="xs"
        className={`modal-themed ${isDark ? "dark" : ""}`}
      >
        <Modal.Body className="text-center py-6">
          <FiAlertCircle className="text-red-500 mx-auto mb-4" size={48} />
          <h4
            className={`text-lg font-bold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}
          >
            {t("delete_student_title")}
          </h4>
          <p
            className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}
          >
            {t("delete_student_confirm")}
          </p>
        </Modal.Body>
        <Modal.Footer className="border-t pt-4">
          <Button
            onClick={confirmDelete}
            color="red"
            appearance="primary"
            loading={loading}
            className="!px-6 !py-2"
          >
            {t("delete")}
          </Button>
          <Button
            onClick={() => setShowDeleteModal(false)}
            appearance="subtle"
            className={isDark ? "text-gray-300" : ""}
          >
            {t("cancel")}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Group Edit Modal */}
      <Modal
        open={showGroupEditModal}
        onClose={() => setShowGroupEditModal(false)}
        size="md"
        backdrop="static"
        className={`modal-themed ${isDark ? "dark" : ""}`}
      >
        <Modal.Header>
          <Modal.Title className="flex items-center gap-2">
            <MdOutlineEdit className="text-blue-500" size={24} />
            <span>{t("edit_group")}</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form fluid onChange={setGroupEditData} formValue={groupEditData}>
            <Grid fluid>
              <Row className="mb-4">
                <Col xs={12}>
                  <Form.Group>
                    <Form.ControlLabel className="text-sm font-medium">
                      {t("group_name")} *
                    </Form.ControlLabel>
                    <Form.Control
                      name="groupName"
                      className={
                        isDark ? "bg-gray-700 text-white border-gray-600" : ""
                      }
                    />
                  </Form.Group>
                </Col>
                <Col xs={12}>
                  <Form.Group>
                    <Form.ControlLabel className="text-sm font-medium">
                      {t("lesson_time")} *
                    </Form.ControlLabel>
                    <Form.Control
                      name="lessonTime"
                      placeholder="14:00-16:00"
                      className={
                        isDark ? "bg-gray-700 text-white border-gray-600" : ""
                      }
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col xs={24}>
                  <Form.Group>
                    <Form.ControlLabel className="text-sm font-medium">
                      {t("weekdays")}
                    </Form.ControlLabel>
                    <Form.Control
                      name="days"
                      accepter={CheckPicker}
                      data={weekDaysOptions}
                      block
                      placeholder={t("select_weekdays")}
                      className={isDark ? "dark-picker" : ""}
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
            className="!px-6 !py-2"
          >
            {t("save_changes")}
          </Button>
          <Button
            onClick={() => setShowGroupEditModal(false)}
            appearance="subtle"
            className={isDark ? "text-gray-300" : ""}
          >
            {t("cancel")}
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
        className={`modal-themed ${isDark ? "dark" : ""}`}
      >
        <Modal.Body className="text-center py-6">
          <FiAlertCircle className="text-red-500 mx-auto mb-4" size={48} />
          <h4
            className={`text-lg font-bold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}
          >
            {t("delete_group_title")}
          </h4>
          <p
            className={`text-sm mb-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}
          >
            {t("delete_group_confirm")}
          </p>
          <p className="text-sm font-medium text-red-500">
            ⚠️ {t("delete_group_warning")}
          </p>
        </Modal.Body>
        <Modal.Footer className="border-t pt-4">
          <Button
            onClick={handleGroupDelete}
            color="red"
            appearance="primary"
            loading={loading}
            className="!px-6 !py-2"
          >
            {t("delete_group")}
          </Button>
          <Button
            onClick={() => setShowGroupDeleteModal(false)}
            appearance="subtle"
            className={isDark ? "text-gray-300" : ""}
          >
            {t("cancel")}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* CSS Styles */}
      <style jsx>{`
        .dark-table .rs-table-cell {
          background-color: #1a1d24 !important;
          border-color: #2d3748 !important;
          color: #e2e8f0 !important;
        }

        .dark-table .rs-table-header-cell {
          background-color: #2d3748 !important;
          border-color: #4a5568 !important;
          color: #cbd5e0 !important;
        }

        .dark-table .rs-table-row:hover .rs-table-cell {
          background-color: #2d3748 !important;
        }

        .dark-pagination .rs-pagination-btn {
          background-color: #2d3748 !important;
          border-color: #4a5568 !important;
          color: #cbd5e0 !important;
        }

        .dark-pagination .rs-pagination-btn:hover {
          background-color: #4a5568 !important;
        }

        .dark-pagination .rs-pagination-btn.rs-pagination-btn-active {
          background-color: #4299e1 !important;
          border-color: #4299e1 !important;
          color: white !important;
        }

        .dark-picker .rs-picker-toggle {
          background-color: #2d3748 !important;
          border-color: #4a5568 !important;
          color: #e2e8f0 !important;
        }

        .dark-picker .rs-picker-toggle:hover {
          background-color: #4a5568 !important;
        }

        .dark-picker .rs-picker-menu {
          max-height: 200px !important;
          overflow: auto !important;
        }

        .dark-menu .rs-popover-content {
          background-color: #1a1d24 !important;
          border-color: #2d3748 !important;
        }

        .dark-menu .rs-dropdown-item {
          color: #e2e8f0 !important;
        }

        .dark-menu .rs-dropdown-item:hover {
          background-color: #2d3748 !important;
        }

        .modal-themed.dark .rs-modal-content {
          background-color: #1a1d24;
          color: #e2e8f0;
        }

        .modal-themed.dark .rs-modal-header {
          border-bottom-color: #2d3748;
        }

        .modal-themed.dark .rs-modal-footer {
          border-top-color: #2d3748;
        }

        .modal-themed.dark .rs-modal-title {
          color: white;
        }

        .modal-themed.dark .rs-form-control-label {
          color: #cbd5e0 !important;
        }

        /* Select Picker scroll styles */
        .rs-picker-select-menu {
          max-height: 200px !important;
          overflow-y: auto !important;
        }

        .rs-picker-select-menu-items {
          max-height: 200px !important;
          overflow-y: auto !important;
        }

        .rs-picker-menu {
          max-height: 200px !important;
          overflow-y: auto !important;
        }
      `}</style>
    </div>
  );
}

export default Group;
