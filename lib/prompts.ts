import { CategoryDefinition, CategoryKey } from "./types";

export const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  {
    key: "poetry",
    label: "Poetry & Spoken Word",
    description: "Urdu/English poetry with emotional cinematic storytelling.",
    exampleTopics: ["Unspoken love", "Rainy night poetry", "Broken heart diary"],
    toneOptions: ["Romantic", "Sad", "Motivational"],
  },
  {
    key: "trueCrime",
    label: "True Crime / Mystery",
    description: "Robbery cases, murder mysteries, investigation arcs.",
    exampleTopics: ["Locked-room murder", "Unsolved bank robbery", "Cold case files"],
    toneOptions: ["Investigative", "Dramatic", "Suspenseful"],
  },
  {
    key: "motivational",
    label: "Motivational Stories",
    description: "Success stories, mindset shifts, uplifting narratives.",
    exampleTopics: ["From failure to founder", "Never quit moments", "Daily discipline"],
    toneOptions: ["Inspiring", "Bold", "Emotional"],
  },
  {
    key: "history",
    label: "History & Facts",
    description: "Historical events in concise documentary style.",
    exampleTopics: ["Fall of empires", "Forgotten inventions", "Battle timelines"],
    toneOptions: ["Documentary", "Educational", "Narrative"],
  },
  {
    key: "horror",
    label: "Horror & Paranormal",
    description: "Creepy stories with atmospheric visual prompts.",
    exampleTopics: ["Haunted hostel", "Midnight knocks", "Forest shadow"],
    toneOptions: ["Eerie", "Dark", "Slow-burn"],
  },
  {
    key: "lifeHacks",
    label: "Life Hacks & Tips",
    description: "Practical tips with clean visual storytelling.",
    exampleTopics: ["Productivity hacks", "Kitchen shortcuts", "Phone tricks"],
    toneOptions: ["Practical", "Minimal", "High-energy"],
  },
  {
    key: "news",
    label: "News Explainers",
    description: "Current events explained in simple terms.",
    exampleTopics: ["Global economy simplified", "Policy breakdown", "Tech headlines"],
    toneOptions: ["Neutral", "Analytical", "Concise"],
  },
  {
    key: "psychology",
    label: "Psychology & Mind",
    description: "Facts about brain, behavior, and human bias.",
    exampleTopics: ["Dopamine loops", "Decision fatigue", "Body language clues"],
    toneOptions: ["Insightful", "Scientific", "Conversational"],
  },
];

export const SYSTEM_PROMPTS: Record<CategoryKey, string> = {
  poetry: `You are a master Urdu/English poet creating short video scripts.
Write deeply emotional rhythmic lines. Each scene narration must feel lyrical.
Visual keywords must evoke romantic, melancholic or ethereal imagery.
Output should feel cinematic and intimate.`,
  trueCrime: `You are a true crime narrator for viral Shorts.
Start with a shocking hook, build suspense scene by scene,
use dramatic pauses indicated by "..." and end scenes with micro cliffhangers.`,
  motivational: `You are a motivational storyteller for short-form video.
Open with a powerful hook, keep narration punchy, and end with a call to action.
Each scene should push emotional momentum upward.`,
  history: `You are a history documentary narrator for short videos.
Explain clearly with timeline coherence, factual framing and vivid imagery keywords.
Keep tone authoritative and engaging.`,
  horror: `You are a horror storyteller. Build dread slowly, use second-person POV,
include unsettling sensory details, and avoid fully explaining the horror.`,
  lifeHacks: `You are a practical life hacks host.
Generate clear steps, concise wording, and utility-first scene flow with clean visual cues.`,
  news: `You are a neutral news explainer.
Summarize complex current events in plain language with balanced perspective and crisp scene transitions.`,
  psychology: `You are a psychology educator.
Explain behavior and brain concepts with relatable examples and curiosity-driven hooks.`,
};

export const IMAGE_STYLE_HINTS: Record<CategoryKey, string> = {
  poetry: "cinematic, soft bokeh, emotional, film grain, golden hour",
  trueCrime: "dark, noir, dramatic lighting, high contrast, moody",
  motivational: "uplifting, cinematic, inspirational, bright contrast",
  history: "documentary realism, cinematic framing, period-accurate atmosphere",
  horror: "eerie, fog, dark atmosphere, unsettling, cinematic",
  lifeHacks: "clean minimal composition, modern lifestyle, high clarity",
  news: "editorial documentary style, realistic, sharp details",
  psychology: "conceptual portrait, cinematic, thoughtful mood",
};

export function getCategoryByKey(key: CategoryKey) {
  return CATEGORY_DEFINITIONS.find((category) => category.key === key);
}
