import React from "react";
import { FiX, FiSend } from "react-icons/fi";
import { useSelector } from "react-redux";

const ManualMessageModal = ({
  showMsgModal,
  setShowMsgModal,
  groups,
  msgGroupId,
  setMsgGroupId,
  msgStudentsList,
  msgStudentId,
  setMsgStudentId,
  msgText,
  setMsgText,
  handleSendManualMessage,
  sendingMsg,
}) => {
  if (!showMsgModal) return null;
  const theme = useSelector((state) => state.theme.value);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div
        className={`${theme === "light" ? "bg-white" : "bg-slate-800"} rounded-[40px] w-full max-w-lg shadow-2xl animate-in zoom-in duration-200 overflow-hidden relative`}
      >
        <div
          className={`${theme === "light" ? "bg-slate-50 border-b border-slate-100" : "bg-slate-800 border-b border-slate-600"} px-8 py-6 flex justify-between items-center`}
        >
          <div>
            <h3
              className={`${theme === "light" ? "text-slate-800" : "text-slate-300"} text-xl font-black`}
            >
              Xabar Yuborish
            </h3>

            <p className="text-sm text-slate-500 font-medium">
              Bot orqali shaxsiy xabar
            </p>
          </div>
          <button
            onClick={() => setShowMsgModal(false)}
            className={`${theme === "light" ? "hover:bg-slate-200" : "hover:bg-slate-700"} p-2 rounded-full text-slate-400 transition-colors`}
          >
            <FiX size={24} />
          </button>
        </div>

        <div className="p-8 space-y-5">
          {/* Group Select */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">
              Guruhni Tanlang
            </label>
            <div className="relative">
              <select
                value={msgGroupId}
                onChange={(e) => {
                  setMsgGroupId(e.target.value);
                  setMsgStudentId("");
                }}
                className={`${theme === "light" ? "bg-slate-50 focus:bg-white text-slate-700" : "bg-slate-700/50 text-slate-300"} w-full border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 px-4 font-bold outline-none transition-all cursor-pointer max-h-40 overflow-y-auto`}
              >
                <option
                  value=""
                  className={`${theme === "light" ? "bg-white" : "bg-slate-800"}`}
                >
                  Tanlang...
                </option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.groupName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Student Select */}
          {msgGroupId && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">
                O'quvchini Tanlang
              </label>
              <div className="relative">
                <select
                  value={msgStudentId}
                  onChange={(e) => setMsgStudentId(e.target.value)}
                  className={`${theme === "light" ? "bg-slate-50 focus:bg-white text-slate-700" : "bg-slate-700/50 text-slate-300"}  w-full border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 px-4 font-bold  outline-none transition-all cursor-pointer`}
                >
                  <option
                    value=""
                    className={`${theme === "light" ? "bg-white" : "bg-slate-800"}`}
                  >
                    Tanlang...
                  </option>
                  {msgStudentsList.map((s) => (
                    <option
                      key={s.id}
                      value={s.id}
                      className={`${theme === "light" ? "bg-white" : "bg-slate-800"}`}
                    >
                      {s.studentName || `${s.firstName} ${s.lastName}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Message Textarea */}
          {msgStudentId && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">
                Xabar Matni
              </label>
              <textarea
                rows={4}
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                placeholder="Xabaringizni yozing..."
                className={`${
                  theme === "light"
                    ? `bg-slate-50 focus:bg-white text-slate-700 
                  resize-none [&::-webkit-scrollbar]:w-2
              [&::-webkit-scrollbar-track]:bg-gray-300
              [&::-webkit-scrollbar-track]:rounded-r-[300px]
              [&::-webkit-scrollbar-track]:m-1
              [&::-webkit-scrollbar-track]:rounded-2xl
              [&::-webkit-scrollbar-thumb]:bg-blue-500
              [&::-webkit-scrollbar-thumb]:rounded-l-[300px]
                [&::-webkit-scrollbar-thumb]:rounded-full
              hover:[&::-webkit-scrollbar-thumb]:bg-blue-700`
                    : `bg-slate-700/50 text-slate-300
                    resize-none [&::-webkit-scrollbar]:w-2
              [&::-webkit-scrollbar-track]:bg-slate-500
              [&::-webkit-scrollbar-track]:rounded-r-[300px]
              [&::-webkit-scrollbar-track]:m-1
              [&::-webkit-scrollbar-thumb]:bg-blue-500
              [&::-webkit-scrollbar-thumb]:rounded-l-[300px]
                [&::-webkit-scrollbar-thumb]:rounded-full
              hover:[&::-webkit-scrollbar-thumb]:bg-blue-600
                    `
                } w-full border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-medium outline-none transition-all `}
              ></textarea>
            </div>
          )}

          <button
            onClick={handleSendManualMessage}
            disabled={sendingMsg || !msgText || !msgStudentId}
            className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg text-white transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2 ${
              sendingMsg
                ? "bg-slate-400 cursor-wait"
                : `${theme === "light" ? "shadow-blue-200" : "shadow-slate-700"} bg-blue-600 hover:bg-blue-700`
            }`}
          >
            {sendingMsg ? (
              "Yuborilmoqda..."
            ) : (
              <>
                <FiSend /> Yuborish
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManualMessageModal;
