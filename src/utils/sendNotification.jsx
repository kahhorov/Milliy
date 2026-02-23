import { toast } from "react-toastify";

const BACKEND_URL = "http://localhost:8000/send-notifications";

export const sendNotifications = async (
  notifications,
  options = {
    showToast: true,
    toastSuccess: "Xabar yuborildi",
    toastError: "Xabar yuborilmadi",
  },
) => {
  try {
    console.log("Sending notifications to backend:", notifications);

    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        notifications,
        date: new Date().toISOString().split("T")[0],
      }),
    });

    console.log("Backend response status:", response.status);

    const data = await response.json();
    console.log("Backend response data:", data);

    // Backenddan muvaffaqiyatli javob kelganda
    if (response.ok) {
      // data.success yoki data.status orqali tekshirish
      const isSuccess =
        data.success === true ||
        data.status === "success" ||
        data.deliveredCount > 0;

      if (isSuccess) {
        if (options.showToast) {
          toast.success(
            <div>
              <div className="font-bold">{options.toastSuccess}</div>
              <div className="text-xs opacity-80 mt-1">
                {data.deliveredCount || notifications.length} ta o'quvchiga
                xabar yuborildi
              </div>
            </div>,
            {
              position: "top-right",
              autoClose: 5000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
            },
          );
        }
        return {
          success: true,
          deliveredCount: data.deliveredCount || notifications.length,
          failedCount: data.failedCount || 0,
          data: data,
        };
      } else {
        // Backend javob berdi lekin xatolik bor
        if (options.showToast) {
          toast.error(
            <div>
              <div className="font-bold">{options.toastError}</div>
              <div className="text-xs opacity-80 mt-1">
                {data.error || "Backend server xatolik qaytardi"}
              </div>
            </div>,
            {
              position: "top-right",
              autoClose: 7000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              // theme: "colored",
            },
          );
        }
        return {
          success: false,
          error: data.error || "Backend error",
          data: data,
        };
      }
    } else {
      // Backend 200 OK qaytarmadi
      if (options.showToast) {
        toast.error(
          <div>
            <div className="font-bold">{options.toastError}</div>
            <div className="text-xs opacity-80 mt-1">
              Server xatolik: {response.status} {response.statusText}
            </div>
          </div>,
          {
            position: "top-right",
            autoClose: 7000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            // theme: "colored",
          },
        );
      }
      return {
        success: false,
        error: `Server xatolik: ${response.status}`,
        data: data,
      };
    }
  } catch (error) {
    console.error("Notification error - network error:", error);

    if (options.showToast) {
      toast.error(
        <div>
          <div className="font-bold">{options.toastError}</div>
          <div className="text-xs opacity-80 mt-1">
            Backend serverga ulanib bo'lmadi. Server ishga tushganligini
            tekshiring.
          </div>
        </div>,
        {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          // theme: "colored",
        },
      );
    }

    return {
      success: false,
      error: "Connection failed",
      details: error.message,
    };
  }
};
