import { useTranslation } from "react-i18next";
import { Modal, Button, Input } from "rsuite";
import { useEffect, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import CreateGroupInput from "../CreateGroupInput";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";

function CreateGroup({ open, setOpen }) {
  const { t } = useTranslation();
  const [value, setValue] = useState([]);
  const [text, setText] = useState(null);
  const [notfication, setNotfication] = useState(false);
  const [size, setSize] = useState("sm");
  const [lessonTime, setLessonTime] = useState(null);
  const groups = useSelector((state) => state.groups.items);
  const handleClose = () => setOpen(false);
  //
  async function handleSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const getData = Object.fromEntries(formData);
    const groupname = formData.get("groupName").toLowerCase();
    const coursePrice = formData.get("coursePrice");

    //
    if (!groupname || !groupname.trim()) {
      setText(t("Group name cannot be empty") + "!");
      setNotfication(true);
      return;
    }
    if (!lessonTime) {
      setText(t("Lesson time cannot be empty") + "!");
      setNotfication(true);
      return;
    }
    if (!coursePrice) {
      setText(t("Group price cannot be empty") + "!");
      setNotfication(true);
      return;
    }
    if (!value || value.length < 1) {
      setText(t("Please select the lesson days") + "!");
      setNotfication(true);
      return;
    }
    const isExist = groups.some(
      (g) => g.groupName.toLowerCase() === groupname.toLowerCase(),
    );
    if (isExist) {
      setText(t("A group with this name already exists!"));
      setNotfication(true);
      return;
    }
    const hours = lessonTime.getHours().toString().padStart(2, "0");
    const minutes = lessonTime.getMinutes().toString().padStart(2, "0");
    const formattedTime = `${hours}:${minutes}`;
    getData.days = value;
    getData.lessonTime = formattedTime;
    setNotfication(false);
    // Firebasega Guruhni qo'shish;
    try {
      await addDoc(collection(db, "groups"), {
        ...getData,
        createdAt: serverTimestamp(),
      });
      toast.success(t("Group created successfully!"));
      console.log(getData);

      setOpen(false);
      // Formani tozalash
      setLessonTime(null);
      setValue([]);
      e.target.reset();
    } catch (error) {
      toast.error(t("Failed to create group!"));
      console.error(error);
    }
  }
  //

  return (
    <>
      <Modal size={size} open={open} onClose={handleClose}>
        <Modal.Header>
          <Modal.Title>{t("Create group")}</Modal.Title>
        </Modal.Header>

        {notfication && (
          <span className="w-full mt-5 inline-flex items-center rounded-md bg-red-400/10 px-4 py-3 text-xs font-medium text-red-400 inset-ring inset-ring-red-400/20">
            {text}
          </span>
        )}
        <Modal.Body>
          <CreateGroupInput
            handleSubmit={handleSubmit}
            value={value}
            setValue={setValue}
            setLessonTime={setLessonTime}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={handleClose} appearance="subtle">
            {t("Cencle")}
          </Button>
          <Button form="create-group" type="submit" appearance="primary">
            {t("Create")}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
export default CreateGroup;
