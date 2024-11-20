import * as XLSX from "xlsx";
import { hasQuotedPortion, splitCsvRespectingQuotes } from "./utils";

const mapRow = (row: string[], tr: HTMLTableRowElement): void => {
  row.forEach((cell) => {
    const td = document.createElement("td");
    td.textContent = cell.trim();
    tr.appendChild(td);
  });
};

const displayCSVTable = (
  csvText: string,
  tableHeader: string,
  tableBody: string
) => {
  const lines = csvText.split("\n");
  const tableHeaderRow = document.getElementById(tableHeader)!;
  const TBody = document.getElementById(tableBody)!;

  tableHeaderRow.innerHTML = "";
  TBody.innerHTML = "";

  if (lines.length > 0) {
    const headers = lines[0].split(",");
    headers.forEach((header) => {
      const th = document.createElement("th");
      th.textContent = header.trim();
      tableHeaderRow.appendChild(th);
    });
    for (let i = 1; i < lines.length; i++) {
      if (hasQuotedPortion(lines[i])) {
        const row = splitCsvRespectingQuotes(lines[i]);
        const tr = document.createElement("tr");
        mapRow(row, tr);
        TBody.appendChild(tr);
      } else {
        const row = lines[i].split(",");
        const tr = document.createElement("tr");
        mapRow(row, tr);
        TBody.appendChild(tr);
      }
    }
  }
};

const createFormFromHeaders = (
  tableHeader: string,
  DynamicFormContainer: string
) => {
  const tableHeaderRow = document.getElementById(tableHeader)!;
  const formContainer = document.getElementById(DynamicFormContainer)!;
  const headers = Array.from(tableHeaderRow.children).map(
    (th) => th.textContent
  );

  formContainer.innerHTML = "";

  headers.forEach((header) => {
    const label = document.createElement("label");
    label.textContent = header;

    const input = document.createElement("input");
    input.type = "text";

    label.appendChild(input);
    formContainer.appendChild(label);
  });
};

const escapeCsvValue = (value: string): string => {
  if (value.includes(",") || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const flattenObject = (
  obj: any,
  parentKey = "",
  sep = "/"
): Record<string, any> => {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    const newKey = parentKey ? `${parentKey}${sep}${key}` : key;

    if (Array.isArray(value)) {
      if (typeof value[0] === "object" && value[0] !== null) {
        value.forEach((item, index) => {
          Object.assign(acc, flattenObject(item, `${newKey}[${index}]`, sep));
        });
      } else {
        acc[newKey] = escapeCsvValue(
          value
            .map((item) =>
              typeof item === "string"
                ? escapeCsvValue(String(item))
                : JSON.stringify(item)
            )
            .join(",")
        );
      }
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(acc, flattenObject(value, newKey, sep));
    } else {
      acc[newKey] = value;
    }
    return acc;
  }, {} as Record<string, any>);
};

const jsonToCSV = (jsonData: any[]): string => {
  if (!Array.isArray(jsonData)) {
    throw new Error("The input JSON should be an array of objects.");
  }
  const flatData = jsonData.map((item) => flattenObject(item));
  const keys = Array.from(
    new Set(flatData.flatMap((item) => Object.keys(item)))
  );
  const headers = keys.join(",");
  const rows = flatData.map((item) => keys.map((key) => item[key]).join(","));
  return [headers, ...rows].join("\n");
};

const readFile = (file: File) => {
  const reader = new FileReader();
  const fileExtension = file.name.split(".").pop()?.toLowerCase();

  reader.onload = (event) => {
    if (fileExtension === "json") {
      const jsonData = JSON.parse(event.target!.result as string);
      const csvText = jsonToCSV(jsonData);
      displayCSVTable(csvText, "tableHeader", "tableBody");
      createFormFromHeaders("tableHeader", "formContainer");
    } else if (
      fileExtension === "csv" ||
      fileExtension === "xls" ||
      fileExtension === "xlsx" ||
      fileExtension === "ods"
    ) {
      const data = new Uint8Array(event.target!.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const csvText = XLSX.utils.sheet_to_csv(worksheet);
      displayCSVTable(csvText, "tableHeader", "tableBody");
      createFormFromHeaders("tableHeader", "formContainer");
    }
  };
  if (fileExtension === "json") {
    reader.readAsText(file);
  } else if (
    fileExtension === "csv" ||
    fileExtension === "xls" ||
    fileExtension === "xlsx" ||
    fileExtension === "ods"
  ) {
    reader.readAsArrayBuffer(file);
  }
};

export { createFormFromHeaders, displayCSVTable, readFile };
