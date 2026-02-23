import { Navbar, Avatar, HStack, Button, Tooltip, Whisper } from "rsuite";
import { Link } from "react-router-dom";
// translate i18n
import { useTranslation } from "react-i18next";
// icons
import { TbLayoutSidebar } from "react-icons/tb";
import { MdOutlineDarkMode } from "react-icons/md";
import { IoLanguageOutline } from "react-icons/io5";
import { CiLight } from "react-icons/ci";
//
import { useDispatch, useSelector } from "react-redux";
import { changeTheme } from "../../createSlice/ThemeSlice";
import ChangeLanguage from "../ChangeLanguage";
import { useState, useEffect } from "react";
//
import NotificationBell from "../NotificationBell";
import { checkEndedHolidays } from "../../utils/holidayNotificationChecker";
import { addNotification } from "../../createSlice/notificationSlice";

const Brand = ({ theme }) => (
  <Link
    to={"/"}
    style={{
      textDecoration: "none",
      color: theme === "light" ? "#343434" : "#fff",
    }}
  >
    <HStack>
      <img src="/NavLogo.png" width={35} alt="Logo" />
      <h3>Milliy</h3>
    </HStack>
  </Link>
);

function SiteNavbar({ setExpanded }) {
  // states
  const [open, setOpen] = useState(false);
  const handleOpen = () => setOpen(true);

  const theme = useSelector((state) => state.theme.value);
  const { t } = useTranslation();
  const dispatch = useDispatch();

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

  return (
    <Navbar
      rounded={"5px"}
      style={{
        background: theme === "light" ? "#FAFAFA" : "#0F131A",
        border: theme === "light" ? "1px solid #E4E4E7" : "1px solid #2a2c31",
      }}
    >
      {/* change Language modal */}
      <ChangeLanguage open={open} setOpen={setOpen} />
      {/*  */}
      <Navbar.Content showFrom="xs">
        <Link
          to={"/"}
          style={{
            textDecoration: "none",
            color: theme === "light" ? "#343434" : "#fff",
          }}
        >
          <HStack>
            <img src="/NavLogo.png" width={55} alt="Logo" />
            <h1>Milliy</h1>
          </HStack>
        </Link>
      </Navbar.Content>

      <Navbar.Content hideFrom="xs">
        <Brand theme={theme} />
      </Navbar.Content>

      <HStack>
        <Whisper
          placement="bottom"
          controlId="control-id-hover"
          trigger="hover"
          speaker={<Tooltip>{t("Sidebar")}</Tooltip>}
        >
          <Button
            appearance="subtle"
            onClick={() => setExpanded((prev) => !prev)}
            style={{ color: theme === "light" ? "#343434" : "#fff" }}
          >
            <TbLayoutSidebar size={20} />
          </Button>
        </Whisper>

        {/* Notification Bell qo'shildi */}
        <NotificationBell />

        <Whisper
          placement="bottom"
          controlId="control-id-hover"
          trigger="hover"
          speaker={
            <Tooltip>
              {theme === "light" ? t("Dark mode") : t("Light mode")}
            </Tooltip>
          }
        >
          <Button
            appearance="subtle"
            onClick={() =>
              dispatch(changeTheme(theme === "light" ? "dark" : "light"))
            }
            style={{ color: theme === "light" ? "#343434" : "#fff" }}
          >
            {theme === "light" ? (
              <MdOutlineDarkMode size={20} />
            ) : (
              <CiLight size={20} />
            )}
          </Button>
        </Whisper>

        <Whisper
          placement="bottom"
          controlId="control-id-hover"
          trigger="hover"
          speaker={<Tooltip>{t("Change language")}</Tooltip>}
        >
          <Button
            appearance="subtle"
            style={{ color: theme === "light" ? "#343434" : "#fff" }}
            onClick={handleOpen}
          >
            <IoLanguageOutline size={20} />
          </Button>
        </Whisper>

        {/*  */}
        <HStack>
          <Avatar src="https://i.pravatar.cc/150?u=19" circle size="sm" />
        </HStack>
      </HStack>
    </Navbar>
  );
}

export default SiteNavbar;
