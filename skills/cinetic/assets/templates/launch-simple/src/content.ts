// The film's screen content: the request typed into its input, the page it makes, the notifications it sets off, the
// people, the pictures, the plans. The hero shots (src/hero) fill themselves from it. Write it from the brief:
//   node scripts/content.mjs --brief BRIEF.md --fetch --force   (--fetch downloads the faces and the pictures; --force
//   replaces this stand-in), then read it: keep what is true of the product, change the rest; node scripts/content.mjs --check.
// cinetic:placeholder - the template's stand-in content: write the film's own with scripts/content.mjs, then delete this line.
import type { FilmContent } from './kit/screens';

export const CONTENT: FilmContent = {
  "meta": {
    "product": "[Product]",
    "does": "[what the product does]",
    "domain": "assistant",
    "date": "2026-11-01",
    "weekday": "Sunday",
    "now": "3:00 PM",
    "seed": "[Product]",
    "currency": "$"
  },
  "people": [
    {
      "name": "Noor Novak",
      "first": "Noor",
      "handle": "noor-nov5"
    },
    {
      "name": "Mei Okafor",
      "first": "Mei",
      "handle": "mei.okafor"
    },
    {
      "name": "Kai Ibrahim",
      "first": "Kai",
      "handle": "kaii_81"
    },
    {
      "name": "Jade Brooks",
      "first": "Jade",
      "handle": "jade.brooks"
    },
    {
      "name": "Hana Rivera",
      "first": "Hana",
      "handle": "hana-riv2"
    },
    {
      "name": "Diego Osei",
      "first": "Diego",
      "handle": "diego_hq"
    },
    {
      "name": "Elias Jensen",
      "first": "Elias",
      "handle": "eliasj_81"
    },
    {
      "name": "Sofia Larsen",
      "first": "Sofia",
      "handle": "sofia_hq"
    },
    {
      "name": "Isaac Patel",
      "first": "Isaac",
      "handle": "isaac.patel"
    },
    {
      "name": "Victor Romero",
      "first": "Victor",
      "handle": "victor-rom6"
    },
    {
      "name": "Luca Alvarez",
      "first": "Luca",
      "handle": "lucaa_97"
    },
    {
      "name": "Talia Kaur",
      "first": "Talia",
      "handle": "talia-kau4"
    },
    {
      "name": "Elena Mercer",
      "first": "Elena",
      "handle": "elena_works"
    },
    {
      "name": "Jamal Quinn",
      "first": "Jamal",
      "handle": "jamalq_84"
    }
  ],
  "prompt": {
    "text": "Move my 3 PM and tell Mei why",
    "placeholder": "Ask [Product] to do anything",
    "model": "Auto"
  },
  "url": {
    "url": "mail.google.com/mail/u/0/#inbox",
    "logo": "gmail",
    "action": "Connect inbox",
    "busy": "Syncing",
    "done": "Connected",
    "placeholder": "Connect an account"
  },
  "profile": {
    "name": "[Product]",
    "handle": "@product",
    "verified": false,
    "stats": [
      "113 tasks done",
      "352 hours saved"
    ],
    "action": "New task",
    "done": "Started"
  },
  "thumbs": [
    {
      "title": "Library meeting room",
      "meta": "4.7 · 7 min away"
    },
    {
      "title": "Studio by the river",
      "meta": "4.8 · 7 min away"
    },
    {
      "title": "Private room at Halden",
      "meta": "4.5 · 20 min away"
    },
    {
      "title": "Corner table at Lune",
      "meta": "4.8 · 5 min away"
    },
    {
      "title": "Conference room 4B",
      "meta": "4.6 · 11 min away"
    },
    {
      "title": "Rooftop room, 12 people",
      "meta": "4.9 · 17 min away"
    },
    {
      "title": "Garden terrace, heated",
      "meta": "4.9 · 4 min away"
    },
    {
      "title": "Quiet café near the office",
      "meta": "4.9 · 6 min away"
    },
    {
      "title": "Hotel bar, open late",
      "meta": "4.7 · 25 min away"
    }
  ],
  "comments": {
    "comments": [
      {
        "name": "Mei Okafor",
        "handle": "Mei Okafor",
        "ago": "11 hours ago",
        "text": "Can you send me the notes from yesterday?",
        "likes": 293,
        "replies": 1
      },
      {
        "name": "Kai Ibrahim",
        "handle": "Kai Ibrahim",
        "ago": "20 hours ago",
        "text": "Lunch is on me if we finish by noon.",
        "likes": 263,
        "replies": 1
      },
      {
        "name": "Jade Brooks",
        "handle": "Jade Brooks",
        "ago": "22 hours ago",
        "text": "Approved. Go ahead and send it.",
        "likes": 43
      },
      {
        "name": "Hana Rivera",
        "handle": "Hana Rivera",
        "ago": "23 hours ago",
        "text": "Sent the deck, have a look before 3.",
        "likes": 16,
        "replies": 12
      },
      {
        "name": "Diego Osei",
        "handle": "Diego Osei",
        "ago": "1 day ago",
        "text": "Can we move the sync to Thursday?",
        "likes": 161
      },
      {
        "name": "Elias Jensen",
        "handle": "Elias Jensen",
        "ago": "1 day ago",
        "text": "Booked the room for Friday, it fits all of us.",
        "likes": 105
      }
    ],
    "header": {
      "label": "Reading {n} messages",
      "total": 858
    }
  },
  "notices": {
    "items": [
      {
        "app": "gmail",
        "glyph": "mail",
        "title": "Hana Rivera",
        "body": "Re: the contract, can we talk at 6:00 PM?",
        "ago": "34m ago",
        "person": "Hana Rivera"
      },
      {
        "app": "google-calendar",
        "glyph": "calendar",
        "title": "Daily sync at 3:30 PM",
        "body": "Room 4B · 30 minutes · 6 people",
        "ago": "12m ago"
      },
      {
        "app": "slack",
        "glyph": "chat",
        "title": "Elias mentioned you",
        "body": "Can you check the numbers before the call?",
        "ago": "4m ago"
      },
      {
        "app": "gmail",
        "glyph": "mail",
        "title": "Reply drafted",
        "body": "[Product] wrote back to Sofia for you",
        "ago": "now"
      }
    ]
  },
  "payments": {
    "items": [
      {
        "title": "Lunch with a client",
        "sub": "Sun, Nov 1",
        "value": "$135.04",
        "glyph": "card"
      },
      {
        "title": "Train to the airport",
        "sub": "Thu, Oct 29",
        "value": "$37.64",
        "glyph": "card"
      },
      {
        "title": "Hotel, one night",
        "sub": "Thu, Oct 29",
        "value": "$115",
        "glyph": "card"
      },
      {
        "title": "Taxi to the venue",
        "sub": "Sun, Nov 1",
        "value": "$135.56",
        "glyph": "card"
      },
      {
        "title": "Team coffee",
        "sub": "Wed, Oct 28",
        "value": "$216.43",
        "glyph": "card"
      },
      {
        "title": "Printing for the workshop",
        "sub": "Sun, Nov 1",
        "value": "$59.46",
        "glyph": "card"
      }
    ],
    "header": {
      "title": "Expenses this week",
      "value": 699.13,
      "money": true,
      "currency": "$"
    }
  },
  "products": {
    "items": [
      {
        "title": "Review the venue contract",
        "sub": "30 min · video call",
        "value": "3:30 PM",
        "glyph": "mail"
      },
      {
        "title": "Call with Kai",
        "sub": "Due Thu, Nov 5",
        "value": "4:45 PM",
        "glyph": "calendar"
      },
      {
        "title": "Send the Q4 numbers",
        "sub": "Room 4B · 15 min",
        "value": "6:00 PM",
        "glyph": "doc"
      },
      {
        "title": "Pick up the passports",
        "sub": "Due today",
        "value": "7:00 PM",
        "glyph": "check"
      }
    ]
  },
  "steps": {
    "title": "Planning your Friday",
    "sub": "31 emails · 6 events",
    "steps": [
      {
        "label": "Read 31 new emails"
      },
      {
        "label": "Drafted 6 replies"
      },
      {
        "label": "Moved two meetings"
      },
      {
        "label": "Booked the room and sent invites"
      }
    ]
  },
  "progress": {
    "label": "Planning your week · {n}%",
    "to": 71
  },
  "plans": {
    "plans": [
      {
        "name": "Free",
        "price": 0,
        "period": "/mo",
        "features": [
          "One inbox and one calendar",
          "50 tasks a month",
          "Daily summary"
        ],
        "cta": "Start free"
      },
      {
        "name": "Plus",
        "price": 12,
        "period": "/mo",
        "badge": "Popular",
        "featured": true,
        "features": [
          "Every inbox and calendar",
          "Unlimited tasks",
          "Replies in your voice",
          "Bookings and reminders"
        ],
        "cta": "Get Plus"
      },
      {
        "name": "Team",
        "price": 24,
        "period": "/seat",
        "features": [
          "Everything in Plus",
          "Shared calendars",
          "Meeting notes for the team",
          "Admin controls"
        ],
        "cta": "Talk to us"
      }
    ],
    "currency": "$"
  },
  "doc": {
    "brand": "[Product]",
    "title": "Weekly sync",
    "accentWord": "sync",
    "lead": "Friday, November 6 · 30 minutes · 6 people",
    "section": "What we decided",
    "body": [
      "The launch moves to Thu, Nov 12, so the review lands a week earlier and nobody works the weekend. Design hands over the final screens on Monday.",
      "Budget stays as planned. Mei owns the venue, the rest of us own our talks. Questions go in the thread, not in a meeting."
    ],
    "table": {
      "head": [
        "#",
        "Task",
        "Owner"
      ],
      "rows": [
        [
          "1",
          "Final screens to engineering",
          "Mei"
        ],
        [
          "2",
          "Book the venue",
          "Kai"
        ],
        [
          "3",
          "Draft the launch email",
          "Jade"
        ],
        [
          "4",
          "Dry run with the team",
          "Everyone"
        ]
      ],
      "numbered": true
    }
  },
  "code": {
    "file": "week.json",
    "lang": "json",
    "code": "[\n  { \"time\": \"9:00 AM\", \"with\": \"Mei\", \"what\": \"Venue walkthrough\" },\n  { \"time\": \"10:15 AM\", \"with\": \"Kai\", \"what\": \"Contract review\" },\n  { \"time\": \"11:30 AM\", \"with\": \"Jade\", \"what\": \"Team sync\" },\n  { \"time\": \"12:45 PM\", \"with\": \"Hana\", \"what\": \"Call with the bank\" }\n]",
    "tabs": []
  },
  "reply": {
    "ask": "What is left for me to finish today?",
    "who": {
      "name": "[Product]"
    },
    "text": "I read your calendar, inbox and tasks. Three things matter today:",
    "items": [
      {
        "text": "Reply to Kai about the contract",
        "glyph": "checkCircle"
      },
      {
        "text": "Review the new venue photos",
        "glyph": "calendar"
      },
      {
        "text": "Daily sync at 3:30 PM",
        "glyph": "doc"
      }
    ],
    "close": "Shall I deal with the first two for you?"
  },
  "site": {
    "url": "product.ai",
    "brand": "[Product]",
    "glyph": "sparkle",
    "nav": [
      "Product",
      "Use cases",
      "Pricing"
    ],
    "signIn": "Sign in",
    "cta": "Try it free",
    "headline": "[what the product does]",
    "accentWord": "product does]",
    "lead": "Email, calendar and errands in one place. [Product] reads, replies and books, and checks with you first.",
    "ctaAlt": "See it work",
    "notice": {
      "title": "Reply drafted",
      "body": "[Product] wrote back to Sofia for you",
      "logo": "gmail",
      "glyph": "mail"
    },
    "cards": [
      {
        "kind": "people",
        "title": "Teams on [Product]",
        "value": "6,886 people",
        "faces": [
          {
            "name": "Elias Jensen"
          },
          {
            "name": "Sofia Larsen"
          },
          {
            "name": "Isaac Patel"
          },
          {
            "name": "Victor Romero"
          }
        ],
        "tag": "Live"
      },
      {
        "kind": "stat",
        "title": "Hours saved",
        "value": "352",
        "delta": "+6 this week"
      },
      {
        "kind": "photo",
        "title": "Library meeting room",
        "sub": "4.7 · 7 min away"
      }
    ]
  },
  "request": {
    "label": "Asked most this week",
    "text": "Can we move the sync?",
    "people": [
      {
        "name": "Luca Alvarez"
      },
      {
        "name": "Talia Kaur"
      },
      {
        "name": "Elena Mercer"
      }
    ],
    "count": 14,
    "countLabel": "{n} messages"
  },
  "cover": {
    "kicker": "[Product]",
    "items": [
      {
        "title": "Your week, planned",
        "sub": "Plan · 12 tasks"
      },
      {
        "title": "Board meeting prep",
        "sub": "Brief · 6 pages"
      },
      {
        "title": "Trip to Lisbon",
        "sub": "Itinerary · 3 days"
      }
    ]
  }
};

/**
 * What the newer house scenes take beyond CONTENT (acts/bank.tsx fillOf reads it; a film without this export plays the
 * scenes' own defaults): the phone app phone-pullback opens (its feed cards, the two rows its "+" opens, the search
 * field and the tabs), and the real photographs some scenes stand on, fetched at film time with scripts/assets.mjs
 * (open collections, no credit needed) and written here with their corners in the photograph's own pixels, read off a
 * gridded copy: `street` 1-4 street or wall photographs with the four corners of each board (street-poster puts the
 * product's output on them), `room` a room photograph with the four corners of its screen (room-push pushes into it),
 * `clouds` a cloud-sea plate (`node scripts/assets.mjs plate clouds`) for cloud-dome. Empty `street` / null `room`: the
 * deal never plays those scenes (src/bank.ts CONTENT_HAVE); no `clouds`: cloud-dome paints its own cloud sea.
 */
type Pt = readonly [number, number];
export const SCENE_CONTENT: {
  phone: { search?: string; tabs?: readonly [string, string]; menu: readonly [string, string]; nav?: readonly [string, string, string, string]; cards: readonly { who: string; meta?: string; photo?: string; title: string; body?: string; tags?: readonly string[]; action?: string }[] };
  plates: { clouds?: string; street: readonly { src: string; w: number; h: number; boards: readonly (readonly [Pt, Pt, Pt, Pt])[]; night?: boolean }[]; room: { src: string; w: number; h: number; screen: readonly [Pt, Pt, Pt, Pt] } | null };
} = {
  phone: {
    search: '[Search]',
    tabs: ['[For you]', '[Recent]'],
    menu: ['[New request]', '[New list]'],
    nav: ['[Home]', '[Search]', '[Inbox]', '[You]'],
    cards: [
      { who: '[a person]', meta: '[2m]', title: '[the result it makes]', body: '[one line about it]', tags: ['[tag]', '[tag]'] },
      { who: '[a person]', meta: '[1h]', title: '[the request, in the user\'s own words]' },
    ],
  },
  plates: { street: [], room: null },
};
