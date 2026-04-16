// lib/date-parser.js

function getTodayMidnight() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function toIsoDate(dateObj) {
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    return null;
  }

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseMonthName(name) {
  const months = {
    january: 0,
    february: 1,
    march: 2,
    april: 3,
    may: 4,
    june: 5,
    july: 6,
    august: 7,
    september: 8,
    october: 9,
    november: 10,
    december: 11,
  };

  return months[name.toLowerCase()];
}

function addDays(baseDate, numDays) {
  const result = new Date(baseDate);
  result.setDate(result.getDate() + numDays);
  return new Date(result.getFullYear(), result.getMonth(), result.getDate());
}

function endOfWeek(dateObj) {
  const result = new Date(dateObj);
  const day = result.getDay(); // Sunday=0 ... Saturday=6
  const diffToFriday = 5 - day;
  result.setDate(result.getDate() + diffToFriday);
  return new Date(result.getFullYear(), result.getMonth(), result.getDate());
}

function endOfNextWeek(dateObj) {
  const endThisWeek = endOfWeek(dateObj);
  return addDays(endThisWeek, 7);
}

function endOfMonth(dateObj) {
  return new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0);
}

function startOfNextWeek(dateObj) {
  const result = new Date(dateObj);
  const day = result.getDay(); // Sunday=0 ... Saturday=6
  const diffToNextMonday = ((8 - day) % 7) || 7;
  result.setDate(result.getDate() + diffToNextMonday);
  return new Date(result.getFullYear(), result.getMonth(), result.getDate());
}

function weekdayMap() {
  return {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };
}

function cleanDueDateText(text) {
  if (!text || typeof text !== "string") {
    return "";
  }

  return text
    .trim()
    .toLowerCase()
    .replace(/[,\.]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^(due|target|scheduled|schedule)\s+/, "")
    .replace(/^(by|on|before)\s+/, "")
    .replace(/^the\s+/, "")
    .replace(/^this coming\s+/, "next ")
    .replace(/^upcoming\s+/, "next ")
    .replace(/^end of the week$/, "end of week")
    .replace(/^end of the month$/, "end of month")
    .replace(/^end of the next week$/, "end of next week")
    .replace(/^by end of the day$/, "by end of day")
    .replace(/^by the end of the week$/, "end of week")
    .replace(/^by the end of next week$/, "end of next week")
    .replace(/^by the end of the month$/, "end of month")
    .replace(/^by end of week$/, "end of week")
    .replace(/^by end of month$/, "end of month")
    .replace(/^by this week\s+/, "this week ")
    .replace(/^by next week\s+/, "next week ")
    .replace(/^before this week\s+/, "this week ")
    .replace(/^before next week\s+/, "next week ");
}

function parseRelativePhrase(text, today) {
  const lower = cleanDueDateText(text);

  if (
    lower === "today" ||
    lower === "this afternoon" ||
    lower === "this morning" ||
    lower === "by end of day" ||
    lower === "eod"
  ) {
    return today;
  }

  if (lower === "tomorrow") {
    return addDays(today, 1);
  }

  if (lower === "day after tomorrow") {
    return addDays(today, 2);
  }

  const inDaysMatch = lower.match(/^in\s+(\d+)\s+day(s)?$/);
  if (inDaysMatch) {
    return addDays(today, Number(inDaysMatch[1]));
  }

  const withinDaysMatch = lower.match(/^within\s+(\d+)\s+day(s)?$/);
  if (withinDaysMatch) {
    return addDays(today, Number(withinDaysMatch[1]));
  }

  const inWeeksMatch = lower.match(/^in\s+(\d+)\s+week(s)?$/);
  if (inWeeksMatch) {
    return addDays(today, Number(inWeeksMatch[1]) * 7);
  }

  const withinWeeksMatch = lower.match(/^within\s+(\d+)\s+week(s)?$/);
  if (withinWeeksMatch) {
    return addDays(today, Number(withinWeeksMatch[1]) * 7);
  }

  if (lower === "end of week") {
    return endOfWeek(today);
  }

  if (lower === "end of next week") {
    return endOfNextWeek(today);
  }

  if (lower === "end of month") {
    return endOfMonth(today);
  }

  if (lower === "sometime next week") {
    return endOfNextWeek(today);
  }

  if (lower === "early next week") {
    return startOfNextWeek(today); // Monday
  }

  if (lower === "mid next week") {
    return addDays(startOfNextWeek(today), 2); // Wednesday
  }

  if (lower === "late next week") {
    return addDays(startOfNextWeek(today), 4); // Friday
  }

  return null;
}

function resolveWeekdayFromBase(baseDate, targetDay) {
  const currentDay = baseDate.getDay();
  let diff = targetDay - currentDay;

  if (diff < 0) {
    diff += 7;
  }

  return addDays(baseDate, diff);
}

function parseWeekdayPhrase(text, today) {
  const lower = cleanDueDateText(text);
  const weekdays = weekdayMap();

  if (weekdays[lower] !== undefined) {
    return resolveWeekdayFromBase(today, weekdays[lower]);
  }

  const thisWeekdayMatch = lower.match(
    /^this\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/
  );
  if (thisWeekdayMatch) {
    const targetDay = weekdays[thisWeekdayMatch[1]];
    const currentDay = today.getDay();

    let diff = targetDay - currentDay;
    if (diff < 0) {
      diff = 0;
    }

    return addDays(today, diff);
  }

  const nextWeekdayMatch = lower.match(
    /^next\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/
  );
  if (nextWeekdayMatch) {
    const targetDay = weekdays[nextWeekdayMatch[1]];
    const currentDay = today.getDay();

    let diff = targetDay - currentDay + 7;
    if (diff <= 0) {
      diff += 7;
    }

    return addDays(today, diff);
  }

  const thisWeekWeekdayMatch = lower.match(
    /^this week\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/
  );
  if (thisWeekWeekdayMatch) {
    const targetDay = weekdays[thisWeekWeekdayMatch[1]];
    const start = today;
    const result = resolveWeekdayFromBase(start, targetDay);

    // do not roll into next week for "this week ..."
    const daysAhead = Math.round((result - today) / (1000 * 60 * 60 * 24));
    if (daysAhead > 6) {
      return null;
    }

    return result;
  }

  const nextWeekWeekdayMatch = lower.match(
    /^next week\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/
  );
  if (nextWeekWeekdayMatch) {
    const targetDay = weekdays[nextWeekWeekdayMatch[1]];
    const nextMonday = startOfNextWeek(today);
    return resolveWeekdayFromBase(nextMonday, targetDay);
  }

  const weekdayNextWeekMatch = lower.match(
    /^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\s+next week$/
  );
  if (weekdayNextWeekMatch) {
    const targetDay = weekdays[weekdayNextWeekMatch[1]];
    const nextMonday = startOfNextWeek(today);
    return resolveWeekdayFromBase(nextMonday, targetDay);
  }

  const weekdayThisWeekMatch = lower.match(
    /^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\s+this week$/
  );
  if (weekdayThisWeekMatch) {
    const targetDay = weekdays[weekdayThisWeekMatch[1]];
    const result = resolveWeekdayFromBase(today, targetDay);

    const daysAhead = Math.round((result - today) / (1000 * 60 * 60 * 24));
    if (daysAhead > 6) {
      return null;
    }

    return result;
  }

  return null;
}

function parseAbsoluteDate(text, today) {
  const lower = cleanDueDateText(text);

  const isoMatch = lower.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]) - 1;
    const day = Number(isoMatch[3]);

    const result = new Date(year, month, day);

    if (
      !isNaN(result.getTime()) &&
      result.getFullYear() === year &&
      result.getMonth() === month &&
      result.getDate() === day
    ) {
      return result;
    }
  }

  const slashMatch = lower.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (slashMatch) {
    const month = Number(slashMatch[1]) - 1;
    const day = Number(slashMatch[2]);
    let year = slashMatch[3] ? Number(slashMatch[3]) : today.getFullYear();

    if (year < 100) {
      year += 2000;
    }

    const result = new Date(year, month, day);

    if (
      !isNaN(result.getTime()) &&
      result.getFullYear() === year &&
      result.getMonth() === month &&
      result.getDate() === day
    ) {
      if (!slashMatch[3] && result < today) {
        result.setFullYear(result.getFullYear() + 1);
      }

      return new Date(
        result.getFullYear(),
        result.getMonth(),
        result.getDate()
      );
    }
  }

  const monthNameMatch = lower.match(
    /^(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(\d{4}))?$/
  );
  if (monthNameMatch) {
    const month = parseMonthName(monthNameMatch[1]);
    const day = Number(monthNameMatch[2]);
    let year = monthNameMatch[3]
      ? Number(monthNameMatch[3])
      : today.getFullYear();

    const result = new Date(year, month, day);

    if (
      !isNaN(result.getTime()) &&
      result.getFullYear() === year &&
      result.getMonth() === month &&
      result.getDate() === day
    ) {
      if (!monthNameMatch[3] && result < today) {
        result.setFullYear(result.getFullYear() + 1);
      }

      return new Date(
        result.getFullYear(),
        result.getMonth(),
        result.getDate()
      );
    }
  }

  return null;
}

function parseDueDateTextToDate(dueText) {
  if (!dueText || typeof dueText !== "string") {
    return null;
  }

  const today = getTodayMidnight();

  return (
    parseRelativePhrase(dueText, today) ||
    parseWeekdayPhrase(dueText, today) ||
    parseAbsoluteDate(dueText, today)
  );
}

module.exports = {
  getTodayMidnight,
  parseDueDateTextToDate,
  toIsoDate,
};