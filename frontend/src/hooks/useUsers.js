import { useCallback, useEffect, useMemo, useState } from "react";

import {
  deleteUserById,
  getUsers,
} from "@/api/userServices";

function getErrorMessage(error, fallbackMessage) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallbackMessage
  );
}

function normalizeUser(user = {}) {
  return {
    id: user.id ?? null,
    phoneNumber: user.phoneNumber ?? "",
    email: user.email ?? "",
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    profilePhoto: user.profilePhoto ?? "",
    preferredLang: user.preferredLang ?? "tr",
    role: user.role ?? "CUSTOMER",
    guest: Boolean(user.guest),
    active: Boolean(user.active),
    createdAt: user.createdAt ?? null,
  };
}

function useUsers() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [error, setError] = useState("");

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getUsers();

      setUsers(
        Array.isArray(response)
          ? response.map(normalizeUser)
          : [],
      );
    } catch (err) {
      console.error("Kullanıcılar alınamadı:", err);

      setError(
        getErrorMessage(
          err,
          "Kullanıcılar yüklenirken bir hata oluştu.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const removeUser = async (user) => {
    if (!user?.id) {
      return false;
    }

    try {
      setDeletingUserId(user.id);
      setError("");

      await deleteUserById(user.id);

      setUsers((currentUsers) =>
        currentUsers.filter(
          (currentUser) => currentUser.id !== user.id,
        ),
      );

      return true;
    } catch (err) {
      console.error("Kullanıcı pasife alınamadı:", err);

      setError(
        getErrorMessage(
          err,
          "Kullanıcı pasife alınırken bir hata oluştu.",
        ),
      );

      return false;
    } finally {
      setDeletingUserId(null);
    }
  };

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm
      .trim()
      .toLocaleLowerCase("tr-TR");

    return users.filter((user) => {
      const fullName = `${user.firstName} ${user.lastName}`
        .trim()
        .toLocaleLowerCase("tr-TR");

      const matchesSearch =
        !normalizedSearch ||
        fullName.includes(normalizedSearch) ||
        user.email
          .toLocaleLowerCase("tr-TR")
          .includes(normalizedSearch) ||
        user.phoneNumber.includes(normalizedSearch);

      const matchesRole =
        roleFilter === "ALL" || user.role === roleFilter;

      const matchesType =
        typeFilter === "ALL" ||
        (typeFilter === "GUEST" && user.guest) ||
        (typeFilter === "MEMBER" && !user.guest);

      return matchesSearch && matchesRole && matchesType;
    });
  }, [users, searchTerm, roleFilter, typeFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users: filteredUsers,
    totalUsers: users.length,

    searchTerm,
    roleFilter,
    typeFilter,

    loading,
    deletingUserId,
    error,

    setSearchTerm,
    setRoleFilter,
    setTypeFilter,

    fetchUsers,
    removeUser,
  };
}

export default useUsers;