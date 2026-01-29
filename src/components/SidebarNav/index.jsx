import SearchIcon from "@rsuite/icons/Search";
import { useState } from "react";
import { useSelector } from "react-redux";
import { VStack, InputGroup, Input, Nav } from "rsuite";
import { Link } from "react-router-dom";

const SidebarNav = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const groups = useSelector((state) => state.groups.items);
  const theme = useSelector((state) => state.theme.value);

  const isDark = theme === "dark";

  const filteredGroups =
    searchTerm.trim() === ""
      ? []
      : groups.filter((group) =>
          group.groupName.toLowerCase().includes(searchTerm.toLowerCase()),
        );

  return (
    <VStack spacing={12} align="stretch" style={{ position: "relative" }}>
      {/* Qidiruv Inputi */}
      <InputGroup
        inside
        size="md"
        style={{
          borderRadius: "3px",
          border: isDark ? "1px solid #4b4b4b" : "1px solid #e5e5e5",
          backgroundColor: "transparent",
        }}
      >
        <InputGroup.Addon>
          <SearchIcon />
        </InputGroup.Addon>
        <Input
          type="search"
          placeholder="Search group..."
          onChange={(val) => setSearchTerm(val)}
          value={searchTerm}
          style={{ borderRadius: "3px" }}
        />
      </InputGroup>

      {searchTerm.trim() !== "" && (
        <div
          style={{
            position: "absolute",
            top: "45px",
            left: 0,
            right: 0,
            zIndex: 1000,
            backgroundColor: isDark ? "#1a1d24" : "#ffffff",
            boxShadow: isDark
              ? "0 4px 12px rgba(0,0,0,0.5)"
              : "0 4px 12px rgba(0,0,0,0.1)",
            border: isDark ? "1px solid #4b4b4b" : "1px solid #e5e5e5",
            maxHeight: "300px",
            overflowY: "auto",
          }}
        >
          <Nav vertical>
            {filteredGroups.length > 0 ? (
              filteredGroups.map((group) => (
                <Nav.Item
                  key={group.id}
                  as={Link}
                  to={`/group/${group.id}`}
                  onClick={() => setSearchTerm("")}
                  style={{
                    borderRadius: 0,
                    borderBottom: isDark
                      ? "1px solid #333"
                      : "1px solid #f0f0f0",
                    padding: "10px 15px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 500,
                        fontSize: "14px",
                        color: isDark ? "#eee" : "#333",
                      }}
                    >
                      {group.groupName.split("")[0].toUpperCase() +
                        group.groupName.slice(1).toLowerCase()}
                    </span>
                    <span style={{ fontSize: "11px", color: "#888" }}>
                      {group.lessonTime}
                    </span>
                  </div>
                </Nav.Item>
              ))
            ) : (
              <div
                style={{
                  padding: 15,
                  textAlign: "center",
                  color: "#999",
                  fontSize: "13px",
                }}
              >
                No results found
              </div>
            )}
          </Nav>
        </div>
      )}
    </VStack>
  );
};

export default SidebarNav;
