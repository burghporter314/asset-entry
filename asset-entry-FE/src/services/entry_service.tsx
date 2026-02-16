export interface Entry {
  id: number;
  asset: string;
  expense_type: string;
  amount: number;
  date: string;
  file_name: string | null;
}

export const getEntries = async (): Promise<Entry[]> => {
  const response = await fetch("http://localhost:8000/entries", {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch entries");
  }

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
  formData.append("expense_type", expenseType); // backend expects expense_type
  formData.append("amount", amount);
  formData.append("date", date);

  if (file) {
    formData.append("file", file); // backend expects file
  }

  const response = await fetch("http://localhost:8000/entries", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Failed to create entry");
  }

  return response.json();
};

export const getFile = async (entryId: number, fileName: string) => {
  const response = await fetch(`http://localhost:8000/entries/${entryId}/file`);

  if (!response.ok) throw new Error("Download failed");

  // Extract the filename from the header
  const contentDisposition = response.headers.get("Content-Disposition");
  console.log(contentDisposition);
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?(.+?)"?$/);
    if (match && match[1]) fileName = match[1];
  }

  const blob = await response.blob();

  // Create a temporary link to trigger download
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName; // <-- use the extracted name
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const deleteEntry = async (entryId: number): Promise<void> => {
  const response = await fetch(`http://localhost:8000/entries/${entryId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete entry");
  }
};
