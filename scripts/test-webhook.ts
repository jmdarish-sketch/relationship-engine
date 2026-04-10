const payload = {
  id: "omi-conv-a1b2c3d4-5678-9012-ef34-567890abcdef",
  created_at: "2026-04-10T14:32:00.000Z",
  started_at: "2026-04-10T14:15:00.000Z",
  finished_at: "2026-04-10T14:30:00.000Z",
  transcript_segments: [
    {
      text: "Hey Zach, good to see you again. How's everything going at Evercore?",
      speaker: "SPEAKER_00",
      speaker_id: 0,
      is_user: true,
      start: 0.0,
      end: 4.2,
    },
    {
      text: "Hey! Yeah, it's been intense honestly. I'm leading recruiting for the TMT group this cycle and we're slammed. Trying to fill three analyst spots before June.",
      speaker: "SPEAKER_01",
      speaker_id: 1,
      is_user: false,
      start: 4.5,
      end: 12.1,
    },
    {
      text: "TMT specifically? That's the tech, media, telecom coverage right? I feel like everyone's been trying to get into that group.",
      speaker: "SPEAKER_00",
      speaker_id: 0,
      is_user: true,
      start: 12.4,
      end: 17.8,
    },
    {
      text: "Exactly, it's super competitive. And honestly the case prep is killing me — I have to evaluate like forty candidates' models this week alone. I've been at the office until midnight every night.",
      speaker: "SPEAKER_01",
      speaker_id: 1,
      is_user: false,
      start: 18.0,
      end: 27.3,
    },
    {
      text: "That's rough. Are you finding good people at least?",
      speaker: "SPEAKER_00",
      speaker_id: 0,
      is_user: true,
      start: 27.5,
      end: 30.1,
    },
    {
      text: "Some yeah. Oh actually, you know Sarah Chen right? She just got a first-round interview at Lazard for their restructuring group. I think she'd honestly be a better fit with us but she's keeping her options open.",
      speaker: "SPEAKER_01",
      speaker_id: 1,
      is_user: false,
      start: 30.4,
      end: 42.6,
    },
    {
      text: "Oh wow, I didn't know Sarah was looking at Lazard. Last time I talked to her she was still focused on the buy side.",
      speaker: "SPEAKER_00",
      speaker_id: 0,
      is_user: true,
      start: 42.9,
      end: 49.0,
    },
    {
      text: "Yeah she pivoted. Anyway, if you know anyone strong with LBO modeling experience who wants to do TMT, send them my way. I can get them a first round.",
      speaker: "SPEAKER_01",
      speaker_id: 1,
      is_user: false,
      start: 49.3,
      end: 58.7,
    },
    {
      text: "Will do — I actually might know a couple people. Let me check and I'll text you this weekend.",
      speaker: "SPEAKER_00",
      speaker_id: 0,
      is_user: true,
      start: 59.0,
      end: 64.2,
    },
    {
      text: "Perfect, appreciate it. And hey, we should grab coffee more often. I feel like I only see you at these things.",
      speaker: "SPEAKER_01",
      speaker_id: 1,
      is_user: false,
      start: 64.5,
      end: 70.0,
    },
  ],
  structured: {
    title: "Networking catch-up with Zach from Evercore",
    overview:
      "Caught up with Zach who leads TMT recruiting at Evercore. He's stressed about filling three analyst spots before June and overwhelmed with case prep. He mentioned Sarah Chen got a first-round at Lazard restructuring. User offered to send referrals with LBO modeling experience.",
    emoji: "🤝",
    category: "networking",
    action_items: [
      {
        description: "Send Zach contacts with LBO modeling experience for Evercore TMT roles",
        completed: false,
      },
      {
        description: "Text Zach this weekend with referral names",
        completed: false,
      },
    ],
    events: [],
  },
  discarded: false,
  apps_response: null,
};

async function main() {
  const uid = "b56afcb3-4f92-4e9a-9467-3105972f34dd";
  const url = `http://localhost:3000/api/webhook/omi?uid=${uid}`;

  console.log(`POST ${url}\n`);
  console.log("Payload:", JSON.stringify(payload, null, 2).slice(0, 200), "...\n");

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  console.log(`Status: ${res.status} ${res.statusText}`);

  const body = await res.json();
  console.log("\nResponse:");
  console.log(JSON.stringify(body, null, 2));
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
