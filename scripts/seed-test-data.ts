const URL = "http://localhost:3000/api/webhook/omi?uid=b56afcb3-4f92-4e9a-9467-3105972f34dd";

const payloads = [
  // -----------------------------------------------------------------------
  // Conversation 1: Second conversation with Zach (Evercore)
  // -----------------------------------------------------------------------
  {
    id: "omi-conv-e5f6a7b8-1234-5678-abcd-111111111111",
    created_at: "2026-04-12T18:45:00.000Z",
    started_at: "2026-04-12T18:30:00.000Z",
    finished_at: "2026-04-12T18:44:00.000Z",
    transcript_segments: [
      {
        text: "Zach! How'd the superday go? You were stressed about it last time.",
        speaker: "SPEAKER_00",
        speaker_id: 0,
        is_user: true,
        start: 0.0,
        end: 4.1,
      },
      {
        text: "Dude, it actually went really well. I ran six back-to-back interviews for the TMT analyst candidates and I think we found at least two strong hires. My case prep paid off — the modeling questions I wrote were solid.",
        speaker: "SPEAKER_01",
        speaker_id: 1,
        is_user: false,
        start: 4.4,
        end: 14.2,
      },
      {
        text: "That's awesome. So you're feeling good about the Evercore stuff then?",
        speaker: "SPEAKER_00",
        speaker_id: 0,
        is_user: true,
        start: 14.5,
        end: 17.8,
      },
      {
        text: "Yeah, the TMT group is in a good spot. But honestly, I've also started interviewing at Centerview Partners. Their restructuring practice is insane right now and I kind of want exposure to that side.",
        speaker: "SPEAKER_01",
        speaker_id: 1,
        is_user: false,
        start: 18.1,
        end: 28.6,
      },
      {
        text: "Wait, Centerview? That's a big move. Are you thinking of leaving Evercore?",
        speaker: "SPEAKER_00",
        speaker_id: 0,
        is_user: true,
        start: 28.9,
        end: 32.4,
      },
      {
        text: "Not necessarily leaving, more like exploring. But their comp is supposedly crazy. Hey, do you know anyone at Centerview? I'd love a back-channel reference on the culture.",
        speaker: "SPEAKER_01",
        speaker_id: 1,
        is_user: false,
        start: 32.7,
        end: 41.3,
      },
      {
        text: "I don't off the top of my head, but let me ask around. I feel like someone in my network has a connection there.",
        speaker: "SPEAKER_00",
        speaker_id: 0,
        is_user: true,
        start: 41.6,
        end: 47.0,
      },
      {
        text: "Appreciate it. Oh, by the way, I grabbed dinner with Sarah Chen last week. She's super stressed — apparently Lazard callbacks are next week and she's been prepping nonstop. She barely ate.",
        speaker: "SPEAKER_01",
        speaker_id: 1,
        is_user: false,
        start: 47.3,
        end: 58.1,
      },
      {
        text: "Poor Sarah. I hope she gets it. She's been grinding for months.",
        speaker: "SPEAKER_00",
        speaker_id: 0,
        is_user: true,
        start: 58.4,
        end: 62.0,
      },
      {
        text: "For real. Alright, I gotta run — let me know about the Centerview thing when you get a chance.",
        speaker: "SPEAKER_01",
        speaker_id: 1,
        is_user: false,
        start: 62.3,
        end: 67.5,
      },
    ],
    structured: {
      title: "Follow-up with Zach — Evercore superday and Centerview interest",
      overview:
        "Caught up with Zach again. His Evercore TMT superday went well and he feels good about the analyst hires. He's now also interviewing at Centerview Partners for their restructuring practice. Asked user for Centerview contacts. Mentioned having dinner with Sarah Chen who is stressed about Lazard callbacks next week.",
      emoji: "💼",
      category: "networking",
      action_items: [
        { description: "Ask around for Centerview Partners contacts for Zach", completed: false },
      ],
      events: [],
    },
    discarded: false,
    apps_response: null,
  },

  // -----------------------------------------------------------------------
  // Conversation 2: Sarah Chen at a coffee shop
  // -----------------------------------------------------------------------
  {
    id: "omi-conv-f7a8b9c0-2345-6789-bcde-222222222222",
    created_at: "2026-04-13T10:20:00.000Z",
    started_at: "2026-04-13T10:05:00.000Z",
    finished_at: "2026-04-13T10:18:00.000Z",
    transcript_segments: [
      {
        text: "Sarah! I didn't expect to run into you here. How's everything?",
        speaker: "SPEAKER_00",
        speaker_id: 0,
        is_user: true,
        start: 0.0,
        end: 3.5,
      },
      {
        text: "Hey! Yeah I've basically been living at this coffee shop, it's my Lazard prep cave. But good news — I made it to the second round!",
        speaker: "SPEAKER_01",
        speaker_id: 1,
        is_user: false,
        start: 3.8,
        end: 11.2,
      },
      {
        text: "Congrats! That's huge. How was the first round?",
        speaker: "SPEAKER_00",
        speaker_id: 0,
        is_user: true,
        start: 11.5,
        end: 14.0,
      },
      {
        text: "Honestly, intense. They grilled me on restructuring case studies for like ninety minutes. But I felt good about my distressed debt analysis. The second round is supposed to be more behavioral and fit-focused.",
        speaker: "SPEAKER_01",
        speaker_id: 1,
        is_user: false,
        start: 14.3,
        end: 25.7,
      },
      {
        text: "You're going to crush it. Are you still only looking at Lazard or branching out?",
        speaker: "SPEAKER_00",
        speaker_id: 0,
        is_user: true,
        start: 26.0,
        end: 30.1,
      },
      {
        text: "So Lazard is my top choice, but I'm also considering McKinsey as a backup. I know it's consulting, not banking, but the exit opps are solid and honestly I need a plan B. The banking recruiting process is so unpredictable.",
        speaker: "SPEAKER_01",
        speaker_id: 1,
        is_user: false,
        start: 30.4,
        end: 42.6,
      },
      {
        text: "McKinsey is not a bad backup at all. Do you have connections there?",
        speaker: "SPEAKER_00",
        speaker_id: 0,
        is_user: true,
        start: 42.9,
        end: 46.3,
      },
      {
        text: "Not at McKinsey, but I do know someone at Moelis — David Park. He's a second-year analyst there and said he could intro me to their healthcare group if Lazard doesn't work out. Honestly I should probably take him up on that.",
        speaker: "SPEAKER_01",
        speaker_id: 1,
        is_user: false,
        start: 46.6,
        end: 59.0,
      },
      {
        text: "David Park at Moelis, got it. Anyway, enough about banking — what about you? I heard you've been thinking about startup stuff?",
        speaker: "SPEAKER_01",
        speaker_id: 1,
        is_user: false,
        start: 59.3,
        end: 65.8,
      },
      {
        text: "Yeah, I've been kicking around some ideas in the AI space. Nothing concrete yet, still in the research phase. But if I do go that route, I'll definitely want your take — you're one of the sharpest people I know on the business model side.",
        speaker: "SPEAKER_00",
        speaker_id: 0,
        is_user: true,
        start: 66.1,
        end: 76.4,
      },
    ],
    structured: {
      title: "Coffee catch-up with Sarah Chen — Lazard update and career options",
      overview:
        "Ran into Sarah Chen at a coffee shop. She made it to the second round at Lazard restructuring and is prepping hard. She's also considering McKinsey consulting as a backup. Mentioned David Park at Moelis who could intro her to their healthcare group. Asked the user about their startup ideas.",
      emoji: "☕",
      category: "networking",
      action_items: [
        { description: "Follow up with Sarah about startup ideas when more concrete", completed: false },
      ],
      events: [],
    },
    discarded: false,
    apps_response: null,
  },

  // -----------------------------------------------------------------------
  // Conversation 3: Mike Torres — entrepreneurship class
  // -----------------------------------------------------------------------
  {
    id: "omi-conv-a1b2c3d4-3456-7890-cdef-333333333333",
    created_at: "2026-04-14T15:10:00.000Z",
    started_at: "2026-04-14T14:55:00.000Z",
    finished_at: "2026-04-14T15:08:00.000Z",
    transcript_segments: [
      {
        text: "Mike, that pitch you did in class today was really solid. Student loan refinancing is such an obvious pain point.",
        speaker: "SPEAKER_00",
        speaker_id: 0,
        is_user: true,
        start: 0.0,
        end: 5.8,
      },
      {
        text: "Thanks man, I appreciate that. Yeah, I've been obsessing over this for months. The average grad student leaves with like a hundred grand in debt and the refinancing options are terrible. We can use alternative credit data to underwrite way better rates.",
        speaker: "SPEAKER_01",
        speaker_id: 1,
        is_user: false,
        start: 6.1,
        end: 18.3,
      },
      {
        text: "Have you started building anything yet or is it still in the research phase?",
        speaker: "SPEAKER_00",
        speaker_id: 0,
        is_user: true,
        start: 18.6,
        end: 22.0,
      },
      {
        text: "I have a prototype of the credit scoring model but I need a technical cofounder badly. I can do the business side and the financial modeling, but I need someone who can actually build the platform. Know anyone?",
        speaker: "SPEAKER_01",
        speaker_id: 1,
        is_user: false,
        start: 22.3,
        end: 34.1,
      },
      {
        text: "I might actually. Let me think about it. How are you funding this so far?",
        speaker: "SPEAKER_00",
        speaker_id: 0,
        is_user: true,
        start: 34.4,
        end: 38.5,
      },
      {
        text: "So I raised a small pre-seed — seventy-five K from a Michigan alumni angel investor. Guy named Robert Huang, he did fintech at Capital One before going independent. He's been super helpful with the regulatory stuff too.",
        speaker: "SPEAKER_01",
        speaker_id: 1,
        is_user: false,
        start: 38.8,
        end: 51.2,
      },
      {
        text: "That's awesome that you already have some funding. What's the timeline looking like?",
        speaker: "SPEAKER_00",
        speaker_id: 0,
        is_user: true,
        start: 51.5,
        end: 55.0,
      },
      {
        text: "Well, there's a startup pitch competition at Ross next month that I'm entering. If I place, it comes with twenty-five K in non-dilutive funding and some mentorship. That would give me enough runway to build an MVP.",
        speaker: "SPEAKER_01",
        speaker_id: 1,
        is_user: false,
        start: 55.3,
        end: 66.8,
      },
      {
        text: "I'd love to come watch. When is it exactly?",
        speaker: "SPEAKER_00",
        speaker_id: 0,
        is_user: true,
        start: 67.1,
        end: 69.9,
      },
      {
        text: "May fifteenth. And yeah, come through — it'd be great to have some friendly faces in the audience. I'll send you the details.",
        speaker: "SPEAKER_01",
        speaker_id: 1,
        is_user: false,
        start: 70.2,
        end: 76.5,
      },
    ],
    structured: {
      title: "Post-class chat with Mike Torres — fintech startup plans",
      overview:
        "Talked to Mike Torres after entrepreneurship class. He's building a fintech startup focused on student loan refinancing using alternative credit data. Looking for a technical cofounder. Raised a $75K pre-seed from Michigan alumni angel Robert Huang (ex-Capital One). Entering the Ross pitch competition on May 15th.",
      emoji: "🚀",
      category: "networking",
      action_items: [
        { description: "Think of potential technical cofounders for Mike Torres", completed: false },
        { description: "Attend Ross pitch competition on May 15th", completed: false },
      ],
      events: [
        { title: "Ross Startup Pitch Competition", start: "2026-05-15", end: "2026-05-15" },
      ],
    },
    discarded: false,
    apps_response: null,
  },

  // -----------------------------------------------------------------------
  // Conversation 4: Zach Williams — psych class (DIFFERENT Zach)
  // -----------------------------------------------------------------------
  {
    id: "omi-conv-d4e5f6a7-4567-8901-def0-444444444444",
    created_at: "2026-04-15T11:30:00.000Z",
    started_at: "2026-04-15T11:15:00.000Z",
    finished_at: "2026-04-15T11:28:00.000Z",
    transcript_segments: [
      {
        text: "Hey Zach, did you finish the psych problem set? I'm stuck on the memory encoding questions.",
        speaker: "SPEAKER_00",
        speaker_id: 0,
        is_user: true,
        start: 0.0,
        end: 5.2,
      },
      {
        text: "Yeah, I actually found those ones pretty straightforward — memory formation is literally my research area. Want me to walk you through it after class?",
        speaker: "SPEAKER_01",
        speaker_id: 1,
        is_user: false,
        start: 5.5,
        end: 13.0,
      },
      {
        text: "That'd be amazing. What exactly is your research on again?",
        speaker: "SPEAKER_00",
        speaker_id: 0,
        is_user: true,
        start: 13.3,
        end: 16.4,
      },
      {
        text: "I study memory formation in the hippocampus — specifically how spatial and episodic memories get consolidated during sleep. We use optogenetics to selectively activate place cells in mice and see if we can enhance or disrupt memory consolidation.",
        speaker: "SPEAKER_01",
        speaker_id: 1,
        is_user: false,
        start: 16.7,
        end: 30.5,
      },
      {
        text: "That's wild. Are you planning to stay in research after graduation?",
        speaker: "SPEAKER_00",
        speaker_id: 0,
        is_user: true,
        start: 30.8,
        end: 34.0,
      },
      {
        text: "Oh for sure. I'm applying to neuroscience PhD programs — Stanford and MIT are my top two. Stanford has this incredible lab run by Dr. Lisa Giocomo that does exactly what I want to do. MIT's BCS department is also amazing though.",
        speaker: "SPEAKER_01",
        speaker_id: 1,
        is_user: false,
        start: 34.3,
        end: 47.2,
      },
      {
        text: "Nice. I feel like everyone I know is going into finance. It's refreshing to meet someone who's not.",
        speaker: "SPEAKER_00",
        speaker_id: 0,
        is_user: true,
        start: 47.5,
        end: 52.8,
      },
      {
        text: "Ha, yeah, finance is definitely not my thing. No offense to anyone but I'd lose my mind in a bank. I need to be in a lab. Speaking of losing my mind, I went to the beach last weekend and completely forgot sunscreen. I'm still peeling.",
        speaker: "SPEAKER_01",
        speaker_id: 1,
        is_user: false,
        start: 53.1,
        end: 65.0,
      },
      {
        text: "Oh no. Which beach?",
        speaker: "SPEAKER_00",
        speaker_id: 0,
        is_user: true,
        start: 65.3,
        end: 67.0,
      },
      {
        text: "South Haven. It was beautiful but my shoulders are wrecked. Anyway, let's link up after class and I'll help you with those encoding questions. Maybe grab food after?",
        speaker: "SPEAKER_01",
        speaker_id: 1,
        is_user: false,
        start: 67.3,
        end: 75.8,
      },
    ],
    structured: {
      title: "Chat with Zach Williams before psych class",
      overview:
        "Talked to Zach Williams from psych class. He studies memory formation in the hippocampus using optogenetics and is applying to neuroscience PhD programs at Stanford and MIT. He hates finance and wants to stay in research. Got sunburned at South Haven beach last weekend. Offered to help user with psych problem set after class.",
      emoji: "🧠",
      category: "academic",
      action_items: [
        { description: "Meet Zach Williams after psych class for problem set help", completed: false },
      ],
      events: [],
    },
    discarded: false,
    apps_response: null,
  },
];

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  for (let i = 0; i < payloads.length; i++) {
    const payload = payloads[i];
    const label = `[${i + 1}/${payloads.length}] ${payload.structured.title}`;
    console.log(`\n${"=".repeat(80)}`);
    console.log(label);
    console.log(`POST ${URL}`);
    console.log(`omi_conversation_id: ${payload.id}`);
    console.log("=".repeat(80));

    try {
      const res = await fetch(URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json();
      console.log(`Status: ${res.status} ${res.statusText}`);
      console.log("Response:", JSON.stringify(body, null, 2));
    } catch (err) {
      console.error("Request failed:", err);
    }

    if (i < payloads.length - 1) {
      console.log("\nWaiting 3 seconds...");
      await sleep(3000);
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("Done — all payloads sent.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
