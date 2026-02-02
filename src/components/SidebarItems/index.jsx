import DashboardIcon from "@rsuite/icons/Dashboard";
import PeoplesIcon from "@rsuite/icons/Peoples";
import SettingIcon from "@rsuite/icons/Setting";
import PieChartIcon from "@rsuite/icons/PieChart";
import DataAuthorizeIcon from "@rsuite/icons/DataAuthorize";
import { Nav } from "rsuite";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MdPayment } from "react-icons/md";
import { PiClipboardText } from "react-icons/pi";
import { useSelector } from "react-redux";
import React from "react";
import { CiSettings } from "react-icons/ci";

function SidebarItems() {
  const location = useLocation();
  const { t } = useTranslation();
  const theme = useSelector((state) => state.theme.value);

  const groups = useSelector((state) => state.groups.items);

  return (
    <Nav activeKey={location.pathname}>
      <Nav.Item
        as={NavLink}
        to={"/"}
        eventKey="/"
        icon={<DashboardIcon size={15} />}
      >
        {t("Dashboard")}
      </Nav.Item>
      <Nav.Menu
        eventKey="/groups"
        title={t("Groups")}
        icon={<PeoplesIcon size={15} />}
      >
        {groups.map((group) => (
          <Nav.Item
            key={group.id}
            as={NavLink}
            to={`/group/${group.id}`}
            eventKey={`/group/${group.id}`}
            style={{
              borderTop:
                theme === "light" ? "1px solid #e5e5e5" : "1px solid #4b4b4b",
              padding: "8px 12px",
              borderRadius: "0px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px",
                width: "100%",
              }}
            >
              <span style={{ fontWeight: 500, fontSize: "14px" }}>
                {group.groupName.split("")[0].toUpperCase() +
                  group.groupName.slice(1).toLowerCase()}
              </span>
              <span style={{ fontSize: "12px", color: "#888" }}>
                {group.lessonTime}
              </span>
            </div>
          </Nav.Item>
        ))}
      </Nav.Menu>
      <Nav.Menu
        eventKey="/attendance"
        title={t("Attendance")}
        icon={<PiClipboardText size={15} />}
      >
        <Nav.Item
          eventKey="/dailyAttendance"
          as={NavLink}
          to={"/dailyAttendance"}
        >
          {t("Daily Attendance")}
        </Nav.Item>
        <Nav.Item
          eventKey="/attendanceHistory"
          as={NavLink}
          to={"/attendanceHistory"}
        >
          {t("Attendance History")}
        </Nav.Item>
        <Nav.Item
          eventKey="/markAttendance"
          as={NavLink}
          to={"/markAttendance"}
        >
          {t("Mark attendance")}
        </Nav.Item>
      </Nav.Menu>
      <Nav.Menu
        eventKey="/payments"
        title={t("Payments")}
        icon={<MdPayment size={15} />}
      >
        <Nav.Item as={NavLink} to={"/add-payments"} eventKey="/add-payments">
          {t("Add payment")}
        </Nav.Item>
        <Nav.Item as={NavLink} to={"/payment-list"} eventKey="/payment-list">
          {t("Payment list")}
        </Nav.Item>
      </Nav.Menu>
    </Nav>
  );
}

export default React.memo(SidebarItems);
