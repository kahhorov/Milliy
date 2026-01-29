import { CustomProvider } from "rsuite";
import Router from "./routes/Router";
import { useSelector } from "react-redux";
import useFetchGroups from "./hooks/useFetchGroups";

function App() {
  const theme = useSelector((state) => state.theme.value);
  useFetchGroups();
  return (
    <>
      <CustomProvider theme={theme}>
        <Router />
      </CustomProvider>
    </>
  );
}

export default App;
