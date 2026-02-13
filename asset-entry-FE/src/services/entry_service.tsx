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
