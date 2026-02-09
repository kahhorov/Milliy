import { useTranslation } from "react-i18next";
import { Modal, Button } from "rsuite";
import CreateStudentInput from "../CreateStudentInput";
import { useEffect, useState } from "react";
import { db } from "../../firebase/firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import React from "react";

function CreateStudent({ studentModal, setStudentModal }) {
  const { t } = useTranslation();
  const [size, setSize] = useState("sm");
  const [notfication, setNotfication] = useState(null);
  const [text, setText] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const handleClose = () => setStudentModal(false);
  const [value, setValue] = useState([]);
  const [phone, setPhone] = useState("");
  const groups = useSelector((state) => state.groups.items);

  useEffect(() => {
    const GroupWeekDays = async () => {
      if (!selectedGroupId) return;
      try {
        const docRef = doc(db, "groups", selectedGroupId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const groupData = docSnap.data();
          setValue(groupData.days || []);
        } else {
          toast.error(t("No such group found"));
        }
      } catch (error) {
        toast.warn(t("An error occurred") + " " + error);
      }
    };
    GroupWeekDays();
  }, [selectedGroupId]);
  //
  async function handleSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const getData = Object.fromEntries(formData);
    const studentName = formData.get("studentName").toLowerCase();
    const lastName = formData.get("lastName").toLowerCase();
    const phoneNumber = formData.get("phoneNumber");
    const telegramId = formData.get("telegramId");
    getData.days = value;

    if (!studentName.trim()) {
      setText(t("Student first name must not be empty!"));
      setNotfication(true);
      return;
    }
    if (!lastName.trim()) {
      setText(t("Student last name must not be empty!"));
      setNotfication(true);
      return;
    }
    if (!phoneNumber.trim()) {
      setText(t("Enter the student's phone number!"));
      setNotfication(true);
      return;
    }
    if (!telegramId.trim()) {
      setText(t("Telegram must not be empty!"));
      setNotfication(true);
      return;
    }
    if (!selectedGroupId) {
      setText(t("No group selected!"));
      setNotfication(true);
      return;
    }
    if (value.length < 1) {
      setText(t("No weekdays selected!"));
      setNotfication(true);
      return;
    }
    try {
      const studentsRef = collection(db, "groups", selectedGroupId, "students");
      //Ma'lumot qo'shish
      await addDoc(studentsRef, {
        ...getData,
        createdAt: serverTimestamp(),
      });

      toast.success(t("Student added successfully!"));
      setStudentModal(false);
      setNotfication(false);
      setValue([]);
      setPhone("");
      setSelectedGroupId(null);
      e.target.reset();
    } catch (error) {
      toast.error(t("An error occurred") + " " + error.message);
    }
  }

  return (
    <>
      <Modal size={size} open={studentModal} onClose={handleClose}>
        <Modal.Header>
          <Modal.Title>{t("Add student")}</Modal.Title>
        </Modal.Header>

        {notfication && (
          <span className="w-full mt-5 inline-flex items-center rounded-md bg-red-400/10 px-4 py-3 text-xs font-medium text-red-400 inset-ring inset-ring-red-400/20">
            {text}
          </span>
        )}
        <Modal.Body>
          <CreateStudentInput
            handleSubmit={handleSubmit}
            setSelectedGroupId={setSelectedGroupId}
            selectedGroupId={selectedGroupId}
            setValue={setValue}
            value={value}
            setPhone={setPhone}
            phone={phone}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={handleClose} appearance="subtle">
            {t("Cencle")}
          </Button>
          <Button form="add-student" type="submit" appearance="primary">
            {t("Create")}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
export default React.memo(CreateStudent);
