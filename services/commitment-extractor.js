const { APP_CONFIG } = require("../config/app");
const { normalizeOwnerName } = require("../config/team-mapping");

async function extractCommitmentWithOpenAI(client, text) {
  console.log("Sending to OpenAI:", text);

  const prompt = `
You are extracting structured site action items from construction project messages.

IMPORTANT:
Return "is_commitment": true for ANY message that should appear on the dashboard.

That includes:
- commitments
- tasks
- follow ups
- reminders
- issues
- unknown items that seem important but are unclear

Only return "is_commitment": false if the message is casual conversation, noise, or not something worth tracking.

Return ONLY valid JSON.
Do not include markdown.
Do not include explanation text.

Return exactly this shape:
{
  "is_commitment": true,
  "item_type": "task",
  "owner": "string or null",
  "task": "string or null",
  "due_date_text": "string or null",
  "trade": "string or null",
  "confidence": 0.0
}

If the message is NOT trackable, return:
{
  "is_commitment": false,
  "item_type": "commitment",
  "owner": null,
  "task": null,
  "due_date_text": null,
  "trade": null,
  "confidence": 0.0
}

Classify item_type using these rules:

- "commitment" = someone promises they will do something
- "task" = direct action item or assigned task
- "follow_up" = follow up, check back, chase, confirm again
- "reminder" = reminder, remember, note to self
- "issue" = delay, blocked, problem, incomplete, missing, behind, not finished
- "unknown" = message should be tracked, but it does not clearly fit the other types

If the message should appear on the dashboard but classification is unclear, use "unknown" instead of false.

Examples:
- "Electrician will finish level 2 by Friday" -> is_commitment true, item_type commitment
- "Justin to review drawings Friday" -> is_commitment true, item_type task
- "Follow up with plumber on level 3 Thursday" -> is_commitment true, item_type follow_up
- "Reminder to call supplier tomorrow" -> is_commitment true, item_type reminder
- "Window delivery is delayed again" -> is_commitment true, item_type issue
- "Need to check that weird ceiling thing in unit 204" -> is_commitment true, item_type unknown
- "Hello how are you" -> is_commitment false

For due_date_text:
- keep it short and human readable
- examples: "Friday", "next Thursday", "in 3 days", "April 22", "2026-04-22", "end of next week"
- preserve useful timing phrases when present

For owner:
- if clearly assigned to a person or trade, use that
- if not clear, return null

Message:
${text}
`;

  const response = await client.chat.completions.create({
    model: APP_CONFIG.openaiModel,
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "You extract structured site action items from construction messages and return JSON only.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const content = response.choices[0].message.content.trim();
  console.log("Raw OpenAI response:", content);

  const result = JSON.parse(content);

  const validTypes = [
    "commitment",
    "task",
    "follow_up",
    "reminder",
    "issue",
    "unknown",
  ];

  if (
    result.is_commitment &&
    (!result.item_type || !validTypes.includes(result.item_type))
  ) {
    result.item_type = "unknown";
  }

  if (result.is_commitment && (!result.task || !String(result.task).trim())) {
    result.task = "Unknown task";
  }

  if (result.is_commitment) {
    const normalizedOwnerFromFullText = normalizeOwnerName(text);
    const normalizedOwnerFromOwnerField = normalizeOwnerName(result.owner);

    if (normalizedOwnerFromFullText) {
      result.owner = normalizedOwnerFromFullText;
    } else if (normalizedOwnerFromOwnerField) {
      result.owner = normalizedOwnerFromOwnerField;
    } else {
      result.owner = "Justin C";
    }
  }

  if (result.is_commitment && !result.priority) {
    result.priority = "normal";
  }

  return result;
}

module.exports = {
  extractCommitmentWithOpenAI,
};
