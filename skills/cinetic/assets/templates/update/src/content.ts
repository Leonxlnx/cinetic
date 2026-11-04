// The film's screen content: the people (real faces), the pictures, the request typed into its input, the page it makes,
// its site, the notifications it sets off. The hero shots and src/update.ts fill themselves from it (a change's people are
// CONTENT.people[k].photo, a page is CONTENT.doc or CONTENT.site). Write it from the brief:
//   node scripts/content.mjs --brief BRIEF.md --fetch --force   (--fetch downloads the faces and the pictures; --force
//   replaces this stand-in), then read it: keep what is true of the product, change the rest; node scripts/content.mjs --check.
// cinetic:placeholder - the template's stand-in content: write the film's own with scripts/content.mjs, then delete this line.
import { staticFile } from 'remotion';
import type { FilmContent } from './kit/screens';

const img = (p: string) => staticFile(p);
void img;

export const CONTENT: FilmContent = {
  "meta": {
    "product": "[Product]",
    "does": "[what the product does]",
    "domain": "team",
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
      "handle": "diego_pm"
    },
    {
      "name": "Elias Jensen",
      "first": "Elias",
      "handle": "eliasj_81"
    },
    {
      "name": "Sofia Larsen",
      "first": "Sofia",
      "handle": "sofia_pm"
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
      "handle": "elena_team"
    },
    {
      "name": "Jamal Quinn",
      "first": "Jamal",
      "handle": "jamalq_84"
    }
  ],
  "prompt": {
    "text": "Summarize what changed in projects this week",
    "placeholder": "Ask [Product] about your team",
    "attach": {
      "name": "kickoff-notes.pdf",
      "meta": "PDF · 2.1 MB",
      "kind": "pdf"
    }
  },
  "url": {
    "url": "product.com/workspace",
    "logo": "notion",
    "action": "Import workspace",
    "busy": "Importing",
    "done": "Imported",
    "placeholder": "Your workspace link"
  },
  "profile": {
    "name": "[Product]",
    "handle": "@product",
    "verified": false,
    "stats": [
      "352 members",
      "113 projects"
    ],
    "action": "Join workspace",
    "done": "Joined"
  },
  "thumbs": [
    {
      "title": "Onboarding guide",
      "meta": "Edited 3 weeks ago · Mei"
    },
    {
      "title": "Q4 roadmap",
      "meta": "Edited 4 weeks ago · Kai"
    },
    {
      "title": "Offsite agenda",
      "meta": "Edited 1 day ago · Jade"
    },
    {
      "title": "Launch plan",
      "meta": "Edited 2 weeks ago · Hana"
    },
    {
      "title": "Brand refresh",
      "meta": "Edited 4 weeks ago · Diego"
    },
    {
      "title": "Design review",
      "meta": "Edited 4 weeks ago · Elias"
    },
    {
      "title": "Customer interviews",
      "meta": "Edited 4 weeks ago · Sofia"
    },
    {
      "title": "Hiring board",
      "meta": "Edited 1 week ago · Isaac"
    },
    {
      "title": "Pricing research",
      "meta": "Edited 3 weeks ago · Victor"
    }
  ],
  "comments": {
    "comments": [
      {
        "name": "Mei Okafor",
        "handle": "Mei Okafor",
        "ago": "11 hours ago",
        "text": "Love the new layout, much easier to scan.",
        "likes": 293,
        "replies": 1
      },
      {
        "name": "Kai Ibrahim",
        "handle": "Kai Ibrahim",
        "ago": "20 hours ago",
        "text": "Who owns the follow-up with the client?",
        "likes": 263,
        "replies": 1
      },
      {
        "name": "Jade Brooks",
        "handle": "Jade Brooks",
        "ago": "22 hours ago",
        "text": "Can we split this into two tickets?",
        "likes": 43
      },
      {
        "name": "Hana Rivera",
        "handle": "Hana Rivera",
        "ago": "23 hours ago",
        "text": "Looks good, one note on the timeline.",
        "likes": 16,
        "replies": 12
      },
      {
        "name": "Diego Osei",
        "handle": "Diego Osei",
        "ago": "1 day ago",
        "text": "Shipped! Thanks everyone.",
        "likes": 161
      },
      {
        "name": "Elias Jensen",
        "handle": "Elias Jensen",
        "ago": "1 day ago",
        "text": "I'll take the copy, can someone review the screens?",
        "likes": 105
      }
    ],
    "header": {
      "label": "Reading {n} comments",
      "total": 858
    }
  },
  "notices": {
    "items": [
      {
        "app": "notion",
        "glyph": "doc",
        "title": "Project brief updated",
        "body": "Hana added new requirements",
        "ago": "34m ago"
      },
      {
        "app": "slack",
        "glyph": "chat",
        "title": "Diego replied in #launch",
        "body": "Screens are ready for review",
        "ago": "12m ago"
      },
      {
        "app": "figma",
        "glyph": "paint",
        "title": "New comment",
        "body": "Elias on Home screen: “Love this.”",
        "ago": "4m ago"
      },
      {
        "app": "google-drive",
        "glyph": "folder",
        "title": "New file uploaded",
        "body": "Sofia added logo_final.ai",
        "ago": "now"
      }
    ]
  },
  "payments": {
    "items": [
      {
        "title": "Seats",
        "sub": "60K this month",
        "value": "$36.76",
        "glyph": "chart"
      },
      {
        "title": "Storage",
        "sub": "77K this month",
        "value": "$10.11",
        "glyph": "chart"
      },
      {
        "title": "Guests",
        "sub": "6K this month",
        "value": "$31.27",
        "glyph": "chart"
      },
      {
        "title": "Automations",
        "sub": "76K this month",
        "value": "$36.90",
        "glyph": "chart"
      },
      {
        "title": "Video calls",
        "sub": "29K this month",
        "value": "$59.02",
        "glyph": "chart"
      },
      {
        "title": "Seats",
        "sub": "34K this month",
        "value": "$16.08",
        "glyph": "chart"
      }
    ],
    "header": {
      "title": "Spend this month",
      "value": 190.14,
      "money": true,
      "currency": "$"
    }
  },
  "products": {
    "items": [
      {
        "title": "Roadmap template",
        "sub": "6 tasks · due Fri, Nov 6",
        "value": "58%",
        "glyph": "doc"
      },
      {
        "title": "Launch checklist",
        "sub": "10 tasks · on track",
        "value": "46%",
        "glyph": "doc"
      },
      {
        "title": "Sprint board",
        "sub": "10 tasks · blocked",
        "value": "95%",
        "glyph": "doc"
      },
      {
        "title": "Meeting notes",
        "sub": "12 tasks · due Fri, Nov 6",
        "value": "47%",
        "glyph": "doc"
      }
    ]
  },
  "steps": {
    "title": "Launch plan",
    "sub": "31 tasks · 6 people",
    "steps": [
      {
        "label": "Notes from 6 meetings read"
      },
      {
        "label": "Tasks pulled out and assigned"
      },
      {
        "label": "Timeline drafted"
      },
      {
        "label": "Shared with the team"
      }
    ]
  },
  "progress": {
    "label": "Writing the plan · {n}%",
    "to": 71
  },
  "plans": {
    "plans": [
      {
        "name": "Free",
        "price": 0,
        "period": "/mo",
        "features": [
          "Up to five people",
          "Unlimited docs",
          "Seven days of history"
        ],
        "cta": "Start free"
      },
      {
        "name": "Team",
        "price": 10,
        "period": "/seat",
        "badge": "Popular",
        "featured": true,
        "features": [
          "Unlimited people",
          "Projects and timelines",
          "Guests and sharing",
          "Full history"
        ],
        "cta": "Choose Team"
      },
      {
        "name": "Business",
        "price": 18,
        "period": "/seat",
        "features": [
          "Everything in Team",
          "SSO and audit log",
          "Advanced permissions",
          "Priority support"
        ],
        "cta": "Talk to us"
      }
    ],
    "currency": "$"
  },
  "doc": {
    "brand": "[Product]",
    "title": "Launch plan",
    "accentWord": "plan",
    "lead": "Everything we ship on Fri, Nov 6, and who owns it.",
    "section": "The plan",
    "body": [
      "We launch on Friday, November 6. The week before is for polish only: no new features, no new pages. Every open question has an owner and a date.",
      "Design freezes on Monday, the launch email goes to review on Tuesday and the press kit is out Wednesday morning."
    ],
    "table": {
      "head": [
        "#",
        "What",
        "Owner"
      ],
      "rows": [
        [
          "1",
          "Freeze the design",
          "Mei"
        ],
        [
          "2",
          "Launch email to review",
          "Kai"
        ],
        [
          "3",
          "Press kit out",
          "Jade"
        ],
        [
          "4",
          "Go live",
          "Everyone"
        ]
      ],
      "numbered": true
    }
  },
  "code": {
    "file": "plan.md",
    "lang": "text",
    "code": "# Launch plan\n\n## Owners\n- Design freeze: Mei\n- Launch email: Kai\n- Press kit: Jade\n\n## Dates\n- Freeze: Wed, Nov 4\n- Review: Thu, Nov 5\n- Launch: Wed, Nov 11\n\n## Open questions\n- Final pricing for teams\n- Who hosts the live demo",
    "tabs": []
  },
  "reply": {
    "ask": "Who is blocked and why?",
    "who": {
      "name": "[Product]"
    },
    "text": "Two people are blocked this week:",
    "items": [
      {
        "text": "Kai is waiting on legal for the terms page",
        "glyph": "checkCircle"
      },
      {
        "text": "Jade needs the final logo files",
        "glyph": "calendar"
      },
      {
        "text": "Everyone else is on track",
        "glyph": "doc"
      }
    ],
    "close": "Want me to nudge legal and the designers?"
  },
  "site": {
    "url": "product.so",
    "brand": "[Product]",
    "glyph": "stack",
    "nav": [
      "Product",
      "Templates",
      "Pricing"
    ],
    "signIn": "Sign in",
    "cta": "Get started",
    "headline": "[what the product does]",
    "accentWord": "product does]",
    "lead": "Projects, docs and decisions in one place, so everyone knows what ships and who owns it.",
    "ctaAlt": "Book a demo",
    "notice": {
      "title": "New file uploaded",
      "body": "Sofia added logo_final.ai",
      "logo": "google-drive",
      "glyph": "folder"
    },
    "cards": [
      {
        "kind": "people",
        "title": "Teams this week",
        "value": "6,886 teams",
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
        "title": "Shipped this week",
        "value": "13",
        "delta": "5 more than last"
      },
      {
        "kind": "photo",
        "title": "Onboarding guide",
        "sub": "Edited 3 weeks ago · Mei"
      }
    ]
  },
  "request": {
    "label": "Most upvoted",
    "text": "Dark mode for docs",
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
    "count": 117,
    "countLabel": "{n} votes"
  },
  "cover": {
    "kicker": "[Product]",
    "items": [
      {
        "title": "Launch plan",
        "sub": "Doc · 8 pages"
      },
      {
        "title": "Brand guide",
        "sub": "Doc · 24 pages"
      },
      {
        "title": "The Q1 roadmap",
        "accentWord": "Q1",
        "sub": "Board · 18 cards"
      }
    ]
  }
};
