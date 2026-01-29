import { forwardRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Menu, Popover } from "rsuite";
import { MdOutlineGroupAdd } from "react-icons/md";
import { RiUserAddLine } from "react-icons/ri";
import { CiExport } from "react-icons/ci";
//
const SidebarMenu = forwardRef(
  ({ onClose, className, setOpen, setStudentModal }, ref) => {
    const handleOpen = () => setOpen(true);
    const handleOpenStudent = () => setStudentModal(true);
    const { t } = useTranslation();
    const handleSelect = (eventKey) => {
      onClose();
      console.log("Selected:", eventKey);
    };

    return (
      <>
        <Popover ref={ref} className={className} full>
          <Menu onSelect={handleSelect}>
            <Menu.Item
              onClick={handleOpen}
              eventKey={1}
              shortcut={<MdOutlineGroupAdd size={20} />}
            >
              {t("Create group")}
            </Menu.Item>
            <Menu.Item
              onClick={handleOpenStudent}
              eventKey={2}
              shortcut={<RiUserAddLine size={20} />}
            >
              {t("Add student")}
            </Menu.Item>
            <Menu.Separator />
            <Menu.Item eventKey={3} shortcut={<CiExport size={20} />}>
              {t("Export excel")}
            </Menu.Item>
          </Menu>
        </Popover>
      </>
    );
  }
);

export default SidebarMenu;
