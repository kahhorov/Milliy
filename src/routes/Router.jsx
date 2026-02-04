import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import { DashboardLoading, PageNotFound } from "../components";
import Login from "../pages/Login";
import ProtectedRoute from "./ProtectedRoute";

// Sahifalar
const Dashboard = lazy(() => import("../pages/Dashboard"));
const DailyAttendance = lazy(() => import("../pages/DailyAttendance"));
const AttendanceHistory = lazy(() => import("../pages/AttendanceHistory"));
const MarkAttendance = lazy(() => import("../pages/MarkAttendance"));
const Group = lazy(() => import("../pages/Group"));
const AddPayments = lazy(() => import("../pages/AddPayments"));
const PaymentList = lazy(() => import("../pages/PaymentList"));

function Router() {
  const route = createBrowserRouter([
    {
      path: "/",
      element: (
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      ),
      children: [
        {
          index: true,
          element: (
            <Suspense fallback={<DashboardLoading />}>
              <Dashboard />
            </Suspense>
          ),
        },
        { path: "dailyAttendance", element: <DailyAttendance /> },
        { path: "attendanceHistory", element: <AttendanceHistory /> },
        { path: "markAttendance", element: <MarkAttendance /> },
        { path: "group/:id", element: <Group /> },
        { path: "add-payments", element: <AddPayments /> },
        { path: "payment-list", element: <PaymentList /> },
      ],
    },
    {
      path: "/login",
      element: <Login />,
    },
    {
      path: "*",
      element: <PageNotFound />,
    },
  ]);

  return <RouterProvider router={route} />;
}

export default Router;
