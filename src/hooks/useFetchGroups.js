import { useEffect } from "react";
import { useDispatch } from "react-redux";
// Firestore funksiyalari to'g'ri paketdan olindi
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../firebase/firebase"; // Firebase ulanishi
import { setGroups } from "../createSlice/GroupsSlice/index";

export default function useFetchGroups() {
  const dispatch = useDispatch();

  useEffect(() => {
    const q = query(collection(db, "groups"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const groupsData = snapshot.docs.map((doc) => {
        const data = doc.data();

        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toMillis() || null,
        };
      });
      dispatch(setGroups(groupsData));
    });
    return () => unsubscribe();
  }, [dispatch]);
}
