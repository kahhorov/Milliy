import { useTranslation } from "react-i18next";
import { Input } from "rsuite";
import { CheckTree } from "rsuite";
import CalendarIcon from "@rsuite/icons/Calendar";
import TimeIcon from "@rsuite/icons/Time";
import { useSelector } from "react-redux";
import { TimePicker } from "rsuite";
//
const CreateGroupInput = ({ value, setValue, handleSubmit, setLessonTime }) => {
  const { t } = useTranslation();
  const theme = useSelector((state) => state.theme.value);
  const groups = useSelector((state) => state.groups.items);
  console.log(groups);

  //  Hafta kunlari
  const daysData = [
    {
      label: t("Weekdays"),
      value: "Every day",
      children: [
        { label: t("Monday"), value: "Monday" },
        { label: t("Tuesday"), value: "Tuesday" },
        { label: t("Wednesday"), value: "Wednesday" },
        { label: t("Thursday"), value: "Thursday" },
        { label: t("Friday"), value: "Friday" },
        { label: t("Saturday"), value: "Saturday" },
      ],
    },
  ];
  //
  return (
    <>
      <form
        id="create-group"
        onSubmit={handleSubmit}
        className={`${theme === "light" ? "text-gray-800" : "text-gray-200"}`}
        autoComplete="off"
      >
        <div className="flex gap-4">
          <Input placeholder={t("Group name")} name="groupName" />
          <Input
            placeholder={t("Course price")}
            name="coursePrice"
            type="number"
          />
          <TimePicker
            format="HH:mm"
            placeholder={t("Lesson time")}
            name="lessonTime"
            onChange={(date) => setLessonTime(date)}
            style={{ width: 300, borderRadius: 0 }}
          />
        </div>
        <h5 className="pt-3 pb-1">{t("Select week days")}:</h5>
        <CheckTree
          data={daysData}
          value={value}
          style={{
            width: "100%",
            border:
              theme === "light" ? "1px solid #d9d8d8" : "1px solid #4c4d4d",
            borderRadius: "5px",
          }}
          className={`${theme === "dark" ? "bg-input-bg" : "bg-none"} py-1`}
          onChange={(nextValue) => setValue(nextValue)}
          renderTreeNode={(node) => {
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {node.children ? <CalendarIcon /> : <TimeIcon />}
                {node.label}
              </div>
            );
          }}
        />
      </form>
    </>
  );
};

export default CreateGroupInput;
