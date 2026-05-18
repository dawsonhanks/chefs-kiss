export const UNITS = ["g", "kg", "ml", "L", "cups", "oz", "tbsp", "tsp", "whole"];

export const CATEGORIES = [
  "Produce",
  "Dairy",
  "Meat",
  "Grains",
  "Spices",
  "Canned",
  "Frozen",
  "Other",
];

export const RATINGS = [
  { value: 1, emoji: "😐", label: "Meh" },
  { value: 2, emoji: "🙂", label: "Good" },
  { value: 3, emoji: "😋", label: "Great" },
  { value: 4, emoji: "🤩", label: "Amazing" },
];

export const DRIVE_FILE_NAME = "chefs-assistant-data.json";
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

export const EMPTY_DATA = {
  pantry: [],
  recipes: [],
  shoppingList: [],
  cookHistory: [],
};
