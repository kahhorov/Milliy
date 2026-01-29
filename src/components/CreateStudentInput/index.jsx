import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { CheckTree, Input, InputGroup, InputPicker } from "rsuite";
import CalendarIcon from "@rsuite/icons/Calendar";
import TimeIcon from "@rsuite/icons/Time";

function CreateStudentInput({
  handleSubmit,
  setValue,
  value,
  selectedGroupId,
  setSelectedGroupId,
  setPhone,
  phone,
}) {
  const { t } = useTranslation();
  const groups = useSelector((state) => state.groups.items);
  const theme = useSelector((state) => state.theme.value);
  const data = groups?.map((item) => ({
    label: `${item.groupName} (${item.lessonTime})`,
    value: item.id,
  }));
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
  const handlePhoneChange = (value) => {
    const onlyNums = value.replace(/[^0-9]/g, "");
    if (onlyNums.length <= 9) {
      setPhone(onlyNums);
    }
  };
  return (
    <>
      <form
        id="add-student"
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        onSubmit={handleSubmit}
      >
        <Input placeholder={t("Student name")} name="studentName" />
        <Input placeholder={t("Student lastName")} name="lastName" />
        <InputGroup
          style={{
            width: "100%",
            border:
              theme === "light" ? "1px solid #d9d8d8" : "1px solid #4c4d4d",
            borderRadius: "5px",
          }}
          className="focus:outline-[#33B6FC] outline-offset-1 "
        >
          <InputGroup.Addon
            style={{ background: "transparent", paddingLeft: "5px" }}
          >
            +998
          </InputGroup.Addon>
          <Input
            placeholder={t("Student phoneNumber")}
            name="phoneNumber"
            value={phone}
            onChange={handlePhoneChange}
            autoComplete="off"
          />
        </InputGroup>
        <InputPicker
          data={data}
          placeholder={t("Select group")}
          name="studentGroup"
          onChange={(value) => {
            setSelectedGroupId(value);
          }}
          defaultValue={selectedGroupId}
          className={`text-gray-300 h-9`}
        />
      </form>
      <CheckTree
        data={daysData}
        value={value}
        style={{
          width: "100%",
          border: theme === "light" ? "1px solid #d9d8d8" : "1px solid #4c4d4d",
          borderRadius: "5px",
        }}
        className={`${
          theme === "dark"
            ? "bg-input-bg text-gray-300"
            : "bg-none text-gray-900/70"
        } py-1 mt-4.5`}
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
    </>
  );
}

export default React.memo(CreateStudentInput);
