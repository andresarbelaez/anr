/** OpenAI-compatible `tools` array for chat/completions. */

export const AGENT_READ_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "list_releases",
      description:
        "List the signed-in user's releases (id, title, status, type, updated date). Use create_release to add a new draft release; update_release only for existing ids.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_catalog_songs",
      description:
        "List library/catalog songs for the user (id, title). For MP3 versions on a song, call list_catalog_versions with that song_id.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_catalog_versions",
      description:
        "List MP3 versions for one library song (id, label, file_name). Use before creating a feedback link or editing a version.",
      parameters: {
        type: "object",
        properties: {
          song_id: { type: "string", description: "UUID of catalog_songs row" },
        },
        required: ["song_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_crm_contacts",
      description:
        "List CRM contacts (id, name, email, role, status). Call this before creating or updating a contact to see existing rows and correct contact_id values. Use create_crm_contact for new people; update_crm_contact only when editing an existing id.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_feedback_links",
      description:
        "List feedback share links. Each row includes **guestListenUrl** (server-built full URL from DB token + app origin). Does **not** include comment text — use list_feedback_comments. For a single link the user asked for, prefer **get_guest_listen_url** with the version id. Never substitute /feedback for guests.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_guest_listen_url",
      description:
        "Fetch the canonical guest listen URL for one library MP3 version from the database (computed on the server). **Always use this** when the user wants a share link for a specific version. Reply with the **guestListenUrl** string exactly as returned — full UUID in the path, no truncation, do not rebuild the URL yourself.",
      parameters: {
        type: "object",
        properties: {
          catalog_song_version_id: {
            type: "string",
            description: "UUID of catalog_song_versions row (from list_catalog_versions or list_feedback_links)",
          },
        },
        required: ["catalog_song_version_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_calendar_events",
      description:
        "List calendar events (including expanded recurring occurrences and release dates) for a date range. Use before creating or updating events to check for conflicts or find event ids.",
      parameters: {
        type: "object",
        properties: {
          start_date: {
            type: "string",
            description: "YYYY-MM-DD start of range (defaults to today)",
          },
          end_date: {
            type: "string",
            description: "YYYY-MM-DD end of range (defaults to 30 days from start)",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_feedback_comments",
      description:
        "Read guest feedback comments for one library MP3 version (threaded roots with replies, plus latestComment by time). Requires catalog_song_version_id: use list_catalog_songs → list_catalog_versions (match song title + version label) or list_feedback_links (includes version id).",
      parameters: {
        type: "object",
        properties: {
          catalog_song_version_id: {
            type: "string",
            description: "UUID of catalog_song_versions row",
          },
        },
        required: ["catalog_song_version_id"],
        additionalProperties: false,
      },
    },
  },
];

/** Tools that queue a row in agent_mutation_proposals until the user approves in the UI. */
export const AGENT_MUTATION_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "update_release",
      description:
        "Queue an update to an **existing** distribution release (by release_id from list_releases). For a **new** release use create_release. Does not change release status. Requires user approval.",
      parameters: {
        type: "object",
        properties: {
          release_id: { type: "string", description: "UUID of the release" },
          title: { type: "string", description: "New title (optional)" },
          release_date: {
            type: "string",
            description: "ISO date YYYY-MM-DD (optional)",
          },
          type: {
            type: "string",
            enum: ["single", "ep", "album"],
            description: "Release type (optional)",
          },
          genre: { type: "string", description: "Genre (optional)" },
          description: { type: "string", description: "Description (optional)" },
        },
        required: ["release_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "delete_draft_release",
      description:
        "Queue deletion of a release that is still in draft status only. Fails at apply time if the release is not draft. Requires user approval.",
      parameters: {
        type: "object",
        properties: {
          release_id: { type: "string", description: "UUID of the draft release" },
        },
        required: ["release_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_release",
      description:
        "Queue a **new** distribution release as **draft** (title, type, optional genre, description, release_date). Use for new releases, not update_release. Requires user approval.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          type: {
            type: "string",
            enum: ["single", "ep", "album"],
            description: "Defaults to single if omitted",
          },
          genre: { type: "string" },
          description: { type: "string" },
          release_date: { type: "string", description: "YYYY-MM-DD (optional)" },
        },
        required: ["title"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_catalog_song",
      description:
        "Queue a **new** library/catalog song (title, optional link to a release). Use for new songs, not update_catalog_song. Requires user approval.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          release_id: {
            type: "string",
            description: "Optional UUID of a release to associate",
          },
        },
        required: ["title"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_catalog_song",
      description:
        "Queue an update to a library/catalog song. Set unlink_from_release true to clear the release link, or set release_id to link to a release. Requires user approval.",
      parameters: {
        type: "object",
        properties: {
          song_id: { type: "string", description: "UUID of catalog_songs row" },
          title: { type: "string", description: "New title (optional)" },
          release_id: {
            type: "string",
            description: "UUID of release to link (optional)",
          },
          unlink_from_release: {
            type: "boolean",
            description: "If true, remove link to any release (optional)",
          },
        },
        required: ["song_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "delete_catalog_song",
      description:
        "Queue permanent deletion of a catalog song and its MP3 versions and feedback link. Requires user approval.",
      parameters: {
        type: "object",
        properties: {
          song_id: { type: "string", description: "UUID of catalog_songs row" },
        },
        required: ["song_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_catalog_song_version",
      description:
        "Queue adding an **MP3** version to a library song. Use **exactly one** source: (1) **agent_attachment_path** — path string from the user's attached MP3 in chat, or (2) **existing_catalog_mp3_path** — object already uploaded to catalog_mp3 under `{userId}/{songId}/...` (e.g. after manual upload). Requires file_name (.mp3). Requires user approval.",
      parameters: {
        type: "object",
        properties: {
          song_id: { type: "string" },
          file_name: {
            type: "string",
            description: "Display name ending in .mp3",
          },
          label: { type: "string", description: "Optional version label" },
          agent_attachment_path: {
            type: "string",
            description: "Path from attached audio line in chat (mutually exclusive with existing_catalog_mp3_path)",
          },
          existing_catalog_mp3_path: {
            type: "string",
            description: "Full catalog_mp3 object path if file is already uploaded (mutually exclusive)",
          },
        },
        required: ["song_id", "file_name"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_catalog_song_version",
      description:
        "Queue updating a version's label and/or display file_name (not the storage file). Requires version id from list_catalog_versions. Requires user approval.",
      parameters: {
        type: "object",
        properties: {
          version_id: { type: "string" },
          label: { type: "string" },
          file_name: { type: "string" },
        },
        required: ["version_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "delete_catalog_song_version",
      description:
        "Queue removing one MP3 version (deletes storage object and row; feedback link for that version is removed). Requires user approval.",
      parameters: {
        type: "object",
        properties: {
          version_id: { type: "string" },
        },
        required: ["version_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_feedback_link",
      description:
        "Queue creating the **guest listen / feedback** share row for a catalog MP3 version (one link per version). Fails if a link already exists — then use set_feedback_link_enabled. Requires user approval.",
      parameters: {
        type: "object",
        properties: {
          version_id: {
            type: "string",
            description: "UUID of catalog_song_versions row",
          },
        },
        required: ["version_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "set_feedback_link_enabled",
      description:
        "Queue enabling or disabling a guest listen/feedback link for a catalog version. Requires user approval.",
      parameters: {
        type: "object",
        properties: {
          link_id: {
            type: "string",
            description: "UUID of feedback_version_links row",
          },
          enabled: { type: "boolean" },
        },
        required: ["link_id", "enabled"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_crm_contact",
      description:
        "Queue creating a **new** CRM contact. Use this when the user asks to add someone who is not already in CRM. Do **not** use update_crm_contact for new people. Call list_crm_contacts first if you need to avoid duplicates. Requires user approval.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Contact name (required)" },
          email: { type: "string" },
          instagram: { type: "string" },
          tiktok: { type: "string" },
          role: { type: "string" },
          notes: { type: "string" },
          last_contacted_at: {
            type: "string",
            description: "YYYY-MM-DD (optional)",
          },
          status: {
            type: "string",
            description: "Optional; defaults to active",
          },
        },
        required: ["name"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_crm_contact",
      description:
        "Queue changes to an **existing** CRM contact only. Requires **contact_id** from list_crm_contacts. **Never** use this to add a new person—use **create_crm_contact** instead. Only include fields to change. Requires user approval.",
      parameters: {
        type: "object",
        properties: {
          contact_id: { type: "string" },
          name: { type: "string" },
          email: { type: "string" },
          instagram: { type: "string" },
          tiktok: { type: "string" },
          role: { type: "string" },
          notes: { type: "string" },
          last_contacted_at: {
            type: "string",
            description: "YYYY-MM-DD or empty string to clear",
          },
          status: { type: "string" },
        },
        required: ["contact_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "delete_crm_contact",
      description:
        "Queue deletion of a CRM contact and their collaboration rows. Requires user approval.",
      parameters: {
        type: "object",
        properties: {
          contact_id: { type: "string" },
        },
        required: ["contact_id"],
        additionalProperties: false,
      },
    },
  },
  // Calendar mutations
  {
    type: "function" as const,
    function: {
      name: "create_calendar_event",
      description:
        "Queue creating a new calendar event. Supports single and recurring events. Requires user approval.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          start_at: { type: "string", description: "ISO datetime or YYYY-MM-DD for all-day events" },
          end_at: { type: "string", description: "ISO datetime or YYYY-MM-DD (optional)" },
          all_day: { type: "boolean" },
          description: { type: "string" },
          color: {
            type: "string",
            enum: ["default","red","orange","yellow","green","blue","purple","pink"],
          },
          location: { type: "string" },
          link: { type: "string", description: "Meeting/video call URL" },
          recurrence: {
            type: "object",
            description: "Omit for non-recurring events",
            properties: {
              frequency: { type: "string", enum: ["daily","weekly","monthly","yearly"] },
              interval: { type: "number", description: "Repeat every N units. Default 1." },
              days_of_week: {
                type: "array",
                items: { type: "number" },
                description: "For weekly only: 0=Sun … 6=Sat",
              },
              end_date: { type: "string", description: "YYYY-MM-DD inclusive last date" },
              count: { type: "number", description: "Max occurrences" },
            },
            required: ["frequency", "interval"],
            additionalProperties: false,
          },
        },
        required: ["title", "start_at"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_calendar_event",
      description:
        "Queue updating an existing calendar event. For recurring events, specify scope: 'this' (one occurrence), 'following' (this and future), or 'all' (entire series). occurrence_date is required when scope is 'this' or 'following'. Requires user approval.",
      parameters: {
        type: "object",
        properties: {
          event_id: { type: "string", description: "Master event UUID from list_calendar_events" },
          scope: { type: "string", enum: ["this","following","all"], description: "Required for recurring events; use 'all' for single events" },
          occurrence_date: { type: "string", description: "YYYY-MM-DD of the specific occurrence (required when scope is 'this' or 'following')" },
          title: { type: "string" },
          start_at: { type: "string" },
          end_at: { type: "string" },
          all_day: { type: "boolean" },
          description: { type: "string" },
          color: { type: "string", enum: ["default","red","orange","yellow","green","blue","purple","pink"] },
          location: { type: "string" },
          link: { type: "string" },
          recurrence: {
            type: "object",
            properties: {
              frequency: { type: "string", enum: ["daily","weekly","monthly","yearly"] },
              interval: { type: "number" },
              days_of_week: { type: "array", items: { type: "number" } },
              end_date: { type: "string" },
              count: { type: "number" },
            },
            required: ["frequency", "interval"],
            additionalProperties: false,
          },
        },
        required: ["event_id", "scope"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "delete_calendar_event",
      description:
        "Queue deleting a calendar event. For recurring events, specify scope: 'this', 'following', or 'all'. occurrence_date required for 'this' and 'following'. Requires user approval.",
      parameters: {
        type: "object",
        properties: {
          event_id: { type: "string" },
          scope: { type: "string", enum: ["this","following","all"] },
          occurrence_date: { type: "string", description: "YYYY-MM-DD (required for 'this' or 'following')" },
        },
        required: ["event_id", "scope"],
        additionalProperties: false,
      },
    },
  },
] as const;

export const AGENT_ALL_TOOLS = [
  ...AGENT_READ_TOOLS,
  ...AGENT_MUTATION_TOOLS,
] as const;
