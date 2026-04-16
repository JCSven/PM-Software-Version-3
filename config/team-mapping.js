const TEAM_OWNER_MAP = [
  {
    canonical: "Kevin G",
    aliases: ["kevin g", "kevin", "kev"],
  },
  {
    canonical: "Justin V",
    aliases: ["justin v", "vanmeer", "dickhead", "dick head", "princess", "jv"],
  },
  {
    canonical: "Justin C",
    aliases: ["justin c", "justin carleton", "jc", "justin"],
  },
  {
    canonical: "Solomon P",
    aliases: ["solomon p", "sully", "sol", "solomon"],
  },
  {
    canonical: "Blake P",
    aliases: ["blake p", "blake"],
  },
];

function normalizeOwnerName(owner) {
  const raw = String(owner || "").trim().toLowerCase();

  if (!raw) {
    return null;
  }

  const normalizedMap = TEAM_OWNER_MAP.map((person) => ({
    canonical: person.canonical,
    aliases: person.aliases.map((alias) => String(alias).trim().toLowerCase()),
  }));

  for (const person of normalizedMap) {
    for (const alias of person.aliases) {
      if (raw === alias) {
        return person.canonical;
      }
    }
  }

  const aliasPairs = normalizedMap
    .flatMap((person) =>
      person.aliases.map((alias) => ({
        canonical: person.canonical,
        alias,
      }))
    )
    .sort((a, b) => b.alias.length - a.alias.length);

  for (const pair of aliasPairs) {
    if (raw.includes(pair.alias)) {
      return pair.canonical;
    }
  }

  return null;
}

module.exports = {
  TEAM_OWNER_MAP,
  normalizeOwnerName,
};
