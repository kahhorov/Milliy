import {
  Container,
  Header,
  Sidebar,
  Sidenav,
  Content,
  useMediaQuery,
  HStack,
  Center,
  Button,
  Whisper,
  Box,
} from "rsuite";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";
import { FaPlus } from "react-icons/fa6";
import { useDispatch, useSelector } from "react-redux";
// components
import {
  SidebarNav,
  SidebarItems,
  SiteNavbar,
  CreateGroup,
  CreateStudent,
} from "../components";
import SidebarMenu from "../components/SidebarMenu";
import { checkEndedHolidays } from "../utils/holidayNotificationChecker";
import { addNotification } from "../createSlice/notificationSlice";

// component function
const MainLayout = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [expanded, setExpanded] = useState(true);
  const [open, setOpen] = useState(false);
  const [studentModal, setStudentModal] = useState(false);

  const [isMobile] = useMediaQuery("(max-width: 768px)");
  const isExpanded = expanded && !isMobile;
  const theme = useSelector((state) => state.theme.value);

  // Tatil tugaganligini tekshirish
  useEffect(() => {
    // Sahifa yuklanganda tekshirish
    checkEndedHolidays(dispatch, addNotification);

    // Har daqiqada tekshirish (60000 ms = 1 daqiqa)
    const interval = setInterval(() => {
      checkEndedHolidays(dispatch, addNotification);
    }, 60000);

    // Cleanup function - komponent o'chirilganda intervalni tozalash
    return () => clearInterval(interval);
  }, [dispatch]);

  // Theme o'zgarishini kuzatish
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <Container
      style={{
        minHeight: "100vh",
        background: theme === "light" ? "#fff" : "#10151cde",
        padding: "10px",
        display: "flex",
        flexDirection: "row",
        gap: "10px",
      }}
    >
      {/*create group modal */}
      <CreateGroup open={open} setOpen={setOpen} />
      {/* add student modal */}
      <CreateStudent
        setStudentModal={setStudentModal}
        studentModal={studentModal}
      />

      {/* Sidebar qismi */}
      <Sidebar
        width={isExpanded ? 260 : 56}
        collapsible
        style={{
          display: "flex",
          flexDirection: "column",
          transition: "all 0.3s",
          background: theme === "light" ? "#FAFAFA" : "#0F131A",
          borderRadius: "5px",
          position: "sticky",
          top: "10px",
          height: isMobile ? "calc(100vh - 20px)" : "calc(100vh - 20px)",
          border: theme === "light" ? "1px solid #E4E4E7" : "1px solid #2a2c31",
        }}
      >
        <Sidenav expanded={isExpanded} h="100%" appearance="subtle">
          <Sidenav.Header>
            {/* sidebar Nav */}
            <SidebarNav expanded={isExpanded} />
          </Sidenav.Header>
          <Sidenav.Body>
            {isExpanded && (
              <HStack
                pl={15}
                py={7}
                borderBottom={
                  theme === "light" ? "1px solid #e9ebf0" : "1px solid #2a2c31"
                }
                color={theme === "light" ? "#a4a9b3" : "#cbced4"}
              >
                {t("Pages")}
              </HStack>
            )}

            {/* sidebar Items */}
            <SidebarItems isExpanded={isExpanded} />
          </Sidenav.Body>
          <Sidenav.Footer
            style={{
              display: "flex",
              justifyContent: isExpanded ? "end" : "center",
              padding: isExpanded ? "16px" : "8px",
            }}
          >
            <Whisper
              placement={isExpanded ? "topEnd" : "topStart"}
              trigger="click"
              speaker={(props, ref) => (
                <SidebarMenu
                  {...props}
                  ref={ref}
                  setOpen={setOpen}
                  setStudentModal={setStudentModal}
                />
              )}
            >
              <button className="rounded-full bg-primary text-white p-3 cursor-pointer group">
                <FaPlus
                  size={20}
                  className="transition-transform duration-200 ease-linear group-hover:rotate-180"
                />
              </button>
            </Whisper>
          </Sidenav.Footer>
        </Sidenav>
      </Sidebar>

      <Container>
        <Header
          style={{
            padding: "0px 8px",
            position: "sticky",
            top: "10px",
            zIndex: "10",
          }}
        >
          {/* Navbar */}
          <SiteNavbar setExpanded={setExpanded} />
        </Header>

        {/* Asosiy Kontent */}
        <Center>
          <Content>
            <div
              style={{
                padding: isMobile ? "0" : "20px",
              }}
            >
              <Outlet />
            </div>
          </Content>
        </Center>
      </Container>
    </Container>
  );
};

export default MainLayout;
