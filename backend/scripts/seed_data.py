"""Demo content for the seed script. Lives in the database, not the frontend.

Stories the data is built to show (see docs/BACKEND.md "Seed script"):
  ring: Maya's Plant monitor needs ESP32 firmware (Dev offers it); Dev's Dungeon Drift needs sound design
        (Rin offers it); Rin's Paper Orbit needs 3D modeling (Maya offers it).
  swap: Leila's Study Quest needs UI design (Sam offers it); Sam's Park&Go needs Python backend (Leila offers it).
  bounty: the Plant monitor firmware need pays 50 Tolken.
  intersection: Plant monitor (hardware) and Tide Prints (creative) share the sensor-data tag.
"""

SKILLS = {
    "software": [
        "Python backend", "UI design", "Next.js", "Mobile app", "Game dev", "Data viz", "Machine learning",
        "DevOps", "Database design", "API design", "Browser extension", "Rust", "Unity", "Godot", "Web audio",
        "Computer vision", "Accessibility", "Technical writing", "QA testing", "iOS", "Android",
    ],
    "hardware": [
        "ESP32 firmware", "PCB design", "3D printing", "CAD", "Arduino", "Raspberry Pi", "Soldering",
        "Sensors", "Power electronics", "Embedded Linux", "Robotics", "LED lighting", "Woodworking",
        "Laser cutting", "Motor control", "RF and antennas", "Battery design", "Enclosure design",
    ],
    "creative": [
        "Sound design", "Generative art", "3D modeling", "Illustration", "Animation", "Music composition",
        "Photography", "Video editing", "Copywriting", "Branding", "Pixel art", "Typography", "Game art",
        "Motion graphics", "Risograph printing", "Installation art", "Character design", "Storyboarding",
        "Voice acting", "Product design",
    ],
}

# handle: (display name, bio, interests, Tolken balance, [(skill, level)])
PEOPLE = {
    "maya": ("Maya Okafor", "Hardware tinkerer. Sensors, small batteries, and enclosures that click shut.",
             ["sensor-data", "plants", "e-ink"], 120, [("3D modeling", 2), ("PCB design", 3), ("CAD", 2)]),
    "dev": ("Dev Rahman", "Firmware by day, game dev by night.",
            ["game", "roguelike", "esp32"], 80, [("ESP32 firmware", 3), ("Game dev", 2), ("Godot", 2)]),
    "rin": ("Rin Castillo", "Sound and generative art. I make things you can hear and watch at once.",
            ["music", "audio-reactive", "print"], 60, [("Sound design", 3), ("Generative art", 2), ("Risograph printing", 2)]),
    "leila": ("Leila Karimi", "Backend engineer who wants more people to finish their study plans.",
              ["edtech", "students", "productivity"], 90, [("Python backend", 3), ("Database design", 2)]),
    "sam": ("Sam Achebe", "Product designer. Interfaces that read at a glance.",
            ["maps", "campus", "accessibility"], 70, [("UI design", 3), ("Mobile app", 2), ("Branding", 2)]),
    "tomas": ("Tomas Berg", "PCBs and printable parts. Happy to review a schematic.",
              ["lighting", "solar", "ocean"], 50, [("PCB design", 3), ("3D printing", 3), ("Power electronics", 2)]),
    "inah": ("Inah Park", "CS student building across software, hardware, and art.",
             ["sensor-data", "music", "edtech"], 100, [("Next.js", 3), ("Data viz", 2), ("API design", 2)]),
    "priya": ("Priya Nair", "Illustrator and pixel artist. I draw the characters.",
              ["game", "pixel-art", "zines"], 40, [("Illustration", 3), ("Pixel art", 3), ("Character design", 2)]),
    "kofi": ("Kofi Mensah", "Robotics student. Motors, encoders, and a lot of zip ties.",
             ["robotics", "iot", "education"], 60, [("Motor control", 3), ("Arduino", 3), ("Raspberry Pi", 2)]),
    "june": ("June Alvarez", "Video and motion. I make the demo video your project deserves.",
             ["film", "music", "branding"], 50, [("Video editing", 3), ("Motion graphics", 2), ("Animation", 2)]),
}

# slug: dict(owner, type, stage, title, summary, tags, needs=[(skill, note, bounty)], readme, source, repo, demo)
PROJECTS = {
    "plant-monitor": dict(
        owner="maya", type="hardware", stage="building", title="Plant monitor", source="open",
        summary="Soil moisture and light sensor with a small e-ink display. v0.4 adds a battery gauge.",
        tags=["sensor-data", "esp32", "e-ink"],
        needs=[("ESP32 firmware", "Deep sleep and wake, so one battery lasts months", 50),
               ("Mobile app", "A companion app that shows a week of readings", None)],
        readme="# Plant monitor\n\nA small soil moisture and light sensor with an e-ink display.\n\n## What it needs\n\nFirmware for sleep and wake. The prototype drains the battery in days.\n",
    ),
    "dungeon-drift": dict(
        owner="dev", type="software", stage="shipped", title="Dungeon Drift", source="open",
        summary="A drifting roguelike where every floor is a race track.",
        tags=["game", "roguelike", "godot"],
        needs=[("Sound design", "Engine loops and drift screeches that don't grate", None),
               ("Pixel art", "A tileset for floors five to eight", None)],
        readme="# Dungeon Drift\n\nEvery floor of the dungeon is a track. Drift through corners to charge your attacks.\n",
    ),
    "paper-orbit": dict(
        owner="rin", type="creative", stage="building", title="Paper Orbit", source="none",
        summary="Cut-paper planets that orbit when you blow on a microphone.",
        tags=["installation", "audio-reactive"],
        needs=[("3D modeling", "A printable gear train for the orbits", None)],
    ),
    "tide-prints": dict(
        owner="rin", type="creative", stage="shipped", title="Tide Prints", source="open",
        summary="Risograph prints generated from a year of local tide sensor data.",
        tags=["sensor-data", "print", "generative"],
        needs=[("Data viz", "Turn a month of readings into a print layout", None)],
    ),
    "study-quest": dict(
        owner="leila", type="software", stage="idea", title="Study Quest", source="none",
        summary="Turn a study plan into a tiny RPG: finished chapters unlock dungeon floors.",
        tags=["edtech", "game", "students"],
        needs=[("UI design", "A map screen that shows progress at a glance", None),
               ("Game dev", "A turn-based loop that fits in five minutes", None)],
        readme="# Study Quest\n\n## The problem\n\nStudy plans are boring to keep.\n\n## The plan\n\n- Each chapter is a floor.\n- Finish a chapter, clear a floor.\n",
    ),
    "park-and-go": dict(
        owner="sam", type="software", stage="building", title="Park&Go", source="open",
        summary="Shows which campus lots have space, from gate counters.",
        tags=["campus", "maps"],
        needs=[("Python backend", "An API that serves live lot counts", None)],
    ),
    "soil-choir": dict(
        owner="inah", type="creative", stage="idea", title="Soil Choir", source="none",
        summary="A soil sensor that turns your plant's moisture into generative music. Dry soil sounds sparse and tense. Watered soil blooms.",
        tags=["sensor-data", "music", "plants"],
        needs=[("ESP32 firmware", "Read moisture every minute, stream it over Wi-Fi", None),
               ("Sound design", "A patch that stays pleasant for hours", None),
               ("Generative art", "Visuals that bloom with the music", None)],
        readme="# Soil Choir\n\nA soil sensor that turns your plant's moisture into generative music.\n\n## The problem\n\nPlant sensors send alerts nobody reads. A plant you can hear is one you notice.\n\n## The plan\n\n- An ESP32 reads soil moisture every minute.\n- A small synth maps dryness to tension.\n- A screen draws roots that grow and thin with the readings.\n",
    ),
    "quiet-hours": dict(
        owner="tomas", type="hardware", stage="idea", title="Quiet Hours", source="none",
        summary="A desk lamp that dims as the room gets loud, nudging everyone to lower their voice.",
        tags=["lighting", "audio-reactive"],
        needs=[("ESP32 firmware", "Mic level to LED brightness, smoothed", None),
               ("Product design", "A shade that looks good on a desk", None)],
        readme="# Quiet Hours\n\nA lamp that gets dimmer as the room gets louder.\n",
    ),
    "buoy-watch": dict(
        owner="tomas", type="hardware", stage="shipped", title="Buoy Watch", source="open",
        summary="A solar buoy that logs water temperature and turbidity for local swimmers.",
        tags=["sensor-data", "solar", "ocean"],
        needs=[("Python backend", "An API for the last 24 hours of readings", None)],
    ),
    "loop-garden": dict(
        owner="rin", type="creative", stage="shipped", title="Loop Garden", source="none",
        summary="A browser sequencer where each plant you grow is a looping melody.",
        tags=["music", "web-audio"],
        needs=[("Web audio", "Lower latency on mobile Safari", None)],
    ),
    "signal-lamp": dict(
        owner="maya", type="hardware", stage="shipped", title="Signal Lamp", source="none",
        summary="Two lamps in two homes. Tap one and the other glows.",
        tags=["iot", "gift"],
        needs=[("Generative art", "Glow patterns that feel like a heartbeat", None)],
    ),
    "gopher-planner": dict(
        owner="inah", type="software", stage="building", title="Gopher Planner", source="none",
        summary="A weekly planner that books focus blocks around your classes.",
        tags=["productivity", "students"],
        needs=[("Mobile app", "A React Native shell for the planner", None)],
    ),
    "pixel-pets": dict(
        owner="priya", type="creative", stage="building", title="Pixel Pets", source="none",
        summary="A desk companion screen with pets that react to your calendar.",
        tags=["pixel-art", "iot"],
        needs=[("ESP32 firmware", "Drive a small LCD and fetch calendar events", None)],
    ),
    "line-follower": dict(
        owner="kofi", type="hardware", stage="building", title="Line Follower Kit", source="none",
        summary="A cheap line-following robot kit for a high-school robotics club.",
        tags=["robotics", "education"],
        needs=[("Technical writing", "A build guide students can follow alone", None),
               ("PCB design", "One board instead of a breadboard nest", None)],
    ),
    "demo-reel": dict(
        owner="june", type="creative", stage="building", title="Hackathon Demo Reel", source="none",
        summary="A template for 60-second project demo videos, with motion titles.",
        tags=["film", "branding"],
        needs=[("Music composition", "Three short loops that fit under narration", None)],
    ),
    "campus-radio": dict(
        owner="june", type="creative", stage="idea", title="Campus Radio Map", source="none",
        summary="A map of campus where each building plays the music recorded there.",
        tags=["music", "maps", "campus"],
        needs=[("Web audio", "Crossfade between buildings as you pan", None),
               ("UI design", "A map that works one-handed", None)],
        readme="# Campus Radio Map\n\nPan the map and the music changes with the building.\n",
    ),
}

FOLLOWS = [("inah", "maya"), ("inah", "rin"), ("maya", "dev"), ("dev", "rin"), ("rin", "maya"),
           ("leila", "sam"), ("sam", "leila"), ("tomas", "maya"), ("june", "rin"), ("kofi", "tomas")]

STARS = [("inah", "plant-monitor"), ("inah", "tide-prints"), ("dev", "plant-monitor"), ("rin", "soil-choir"),
         ("maya", "soil-choir"), ("sam", "study-quest"), ("leila", "park-and-go"), ("tomas", "plant-monitor"),
         ("june", "dungeon-drift"), ("priya", "dungeon-drift"), ("kofi", "line-follower"), ("maya", "paper-orbit")]

COMMENTS = [
    ("plant-monitor", "dev", "Deep sleep with a timer wakeup should get you weeks. Happy to pair on it."),
    ("plant-monitor", "inah", "Could the readings feed a dashboard? I'd build it."),
    ("soil-choir", "rin", "Dry soil sounding tense is a great idea. I'd draw roots that thin out as it dries."),
    ("soil-choir", "maya", "My plant monitor already streams moisture. You could reuse that firmware."),
    ("dungeon-drift", "rin", "I can do engine loops that don't grate after an hour."),
    ("study-quest", "sam", "The map screen could double as the progress bar."),
]


# 100 generated demo profiles so matching, "people who fit" and onboarding suggestions look lived-in.
# They offer skills (levels 1-2, so the seeded demo people still rank first) and follow seeded people,
# but own no projects, so they add matches without adding swaps or rings that would crowd the demo.
_FIRST = ["Ava", "Ben", "Chloe", "Diego", "Elif", "Farah", "Gabe", "Hana", "Ivan", "Jade", "Kofi", "Lena", "Malik",
          "Nora", "Omar", "Priya", "Quinn", "Ravi", "Sofia", "Theo", "Uma", "Vik", "Wren", "Xia", "Yusuf", "Zoe"]
_LAST = ["Abe", "Bauer", "Chen", "Diaz", "Eze", "Fischer", "Garcia", "Haddad", "Ito", "Jensen", "Kim", "Lopez",
         "Mensah", "Novak", "Okoro", "Patel", "Quist", "Rossi", "Silva", "Tanaka", "Ueda", "Varga", "Wong", "Yilmaz"]
_BIOS = {"software": "Writes software and likes shipping small things.",
         "hardware": "Builds hardware and solders on weekends.",
         "creative": "Makes art, sound, and stories for other people's projects."}


def generated_people(n: int = 100, seed: int = 2026) -> dict:
    import random

    rng = random.Random(seed)
    tags = sorted({t for p in PROJECTS.values() for t in p["tags"]})
    out = {}
    for i in range(n):
        first, last = rng.choice(_FIRST), rng.choice(_LAST)
        handle = f"{first.lower()}{last.lower()}{i + 1:02d}"
        category = rng.choice(list(SKILLS))
        picks = rng.sample(SKILLS[category], 2) + rng.sample([s for c in SKILLS for s in SKILLS[c]], 1)
        offers = [(s, rng.choice([1, 1, 2])) for s in dict.fromkeys(picks)]
        out[handle] = (f"{first} {last}", _BIOS[category], rng.sample(tags, 3), rng.choice([20, 40, 60, 100]), offers)
    return out


GENERATED = generated_people()
GENERATED_FOLLOWS = [(h, target) for i, h in enumerate(GENERATED) for target in list(PEOPLE)[i % len(PEOPLE):][:2]]
