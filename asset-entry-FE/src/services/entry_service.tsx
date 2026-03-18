export interface Entry {
  id: number;
  asset: string;
  expense_type: string;
  amount: number;
  date: string;
  file_name: string | null;
}

export interface AdminUser {
  id: number;
  username: string;
  is_admin: boolean;
  is_static: boolean;
  can_read: boolean;
  can_create: boolean;
  can_delete: boolean;
  created_at: string;
}

const API = "http://localhost:8000";

function authHeaders(): Record<string, string> {
  try {
    const auth = JSON.parse(localStorage.getItem("auth") ?? "null");
    return auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};
  } catch { return {}; }
}

// ── Entries ──────────────────────────────────────────────

export const getEntries = async (): Promise<Entry[]> => {
  const response = await fetch(`${API}/entries`, { headers: authHeaders() });
  if (!response.ok) throw new Error("Failed to fetch entries");
  return response.json();
};

export const createEntry = async (
  asset: string,
  expenseType: string,
  amount: string,
  date: string,
  file: File | null
) => {
  const formData = new FormData();
  formData.append("asset", asset);
  formData.append("expense_type", expenseType);
  formData.append("amount", amount);
  formData.append("date", date);
  if (file) formData.append("file", file);

  const response = await fetch(`${API}/entries`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  if (!response.ok) throw new Error("Failed to create entry");
  return response.json();
};

export const getFile = async (entryId: number, fileName: string) => {
  const response = await fetch(`${API}/entries/${entryId}/file`, { headers: authHeaders() });
  if (!response.ok) throw new Error("Download failed");

  const contentDisposition = response.headers.get("Content-Disposition");
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?(.+?)"?$/);
    if (match && match[1]) fileName = match[1];
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const deleteEntry = async (entryId: number): Promise<void> => {
  const response = await fetch(`${API}/entries/${entryId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to delete entry");
};

// ── Auth ─────────────────────────────────────────────────

export const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
  const response = await fetch(`${API}/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.detail || "Failed to change password");
  }
};

// ── Admin ────────────────────────────────────────────────

export const adminGetUsers = async (): Promise<AdminUser[]> => {
  const response = await fetch(`${API}/admin/users`, { headers: authHeaders() });
  if (!response.ok) throw new Error("Failed to fetch users");
  return response.json();
};

export const adminResetPassword = async (userId: number, newPassword: string): Promise<void> => {
  const response = await fetch(`${API}/admin/users/${userId}/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ new_password: newPassword }),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.detail || "Failed to reset password");
  }
};

export const adminUpdatePermissions = async (
  userId: number,
  perms: { can_read: boolean; can_create: boolean; can_delete: boolean }
): Promise<void> => {
  const response = await fetch(`${API}/admin/users/${userId}/permissions`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(perms),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.detail || "Failed to update permissions");
  }
};

export const adminDeleteUser = async (userId: number): Promise<void> => {
  const response = await fetch(`${API}/admin/users/${userId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.detail || "Failed to delete user");
  }
};
