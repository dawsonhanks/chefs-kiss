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
export const HOUSEHOLD_FILE_ID_KEY = "chefs-kiss-household-file-id";
export const PENDING_JOIN_KEY = "chefs-kiss-pending-join";
export const SYNC_INTERVAL_MS = 15000;

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const EMPTY_MEAL_PLAN = {
  weekStart: null,
  days: [null, null, null, null, null, null, null],
};

export const EMPTY_DATA = {
  pantry: [],
  recipes: [],
  shoppingList: [],
  cookHistory: [],
  mealPlan: { ...EMPTY_MEAL_PLAN },
};
