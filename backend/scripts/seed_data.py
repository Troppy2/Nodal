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

FOLLOWS = [
    ("inah", "maya"), ("inah", "rin"), ("inah", "dev"), ("inah", "leila"), ("inah", "sam"),
    ("maya", "dev"), ("maya", "rin"), ("maya", "inah"), ("maya", "tomas"),
    ("dev", "rin"), ("dev", "maya"), ("dev", "priya"), ("dev", "june"),
    ("rin", "maya"), ("rin", "dev"), ("rin", "june"), ("rin", "inah"),
    ("leila", "sam"), ("leila", "inah"), ("leila", "kofi"),
    ("sam", "leila"), ("sam", "inah"), ("sam", "june"), ("sam", "dev"),
    ("tomas", "maya"), ("tomas", "kofi"), ("tomas", "dev"),
    ("june", "rin"), ("june", "sam"), ("june", "priya"), ("june", "dev"),
    ("kofi", "tomas"), ("kofi", "maya"), ("kofi", "dev"),
    ("priya", "dev"), ("priya", "rin"), ("priya", "june"),
]

STARS = [
    ("inah", "plant-monitor"), ("inah", "tide-prints"), ("inah", "dungeon-drift"), ("inah", "soil-choir"),
    ("dev", "plant-monitor"), ("dev", "soil-choir"), ("dev", "pixel-pets"), ("dev", "line-follower"),
    ("rin", "soil-choir"), ("rin", "plant-monitor"), ("rin", "campus-radio"), ("rin", "dungeon-drift"),
    ("maya", "soil-choir"), ("maya", "paper-orbit"), ("maya", "quiet-hours"), ("maya", "dungeon-drift"),
    ("sam", "study-quest"), ("sam", "park-and-go"), ("sam", "campus-radio"), ("sam", "demo-reel"),
    ("leila", "park-and-go"), ("leila", "gopher-planner"), ("leila", "study-quest"),
    ("tomas", "plant-monitor"), ("tomas", "buoy-watch"), ("tomas", "quiet-hours"), ("tomas", "signal-lamp"),
    ("june", "dungeon-drift"), ("june", "campus-radio"), ("june", "paper-orbit"), ("june", "demo-reel"),
    ("priya", "dungeon-drift"), ("priya", "pixel-pets"), ("priya", "paper-orbit"), ("priya", "loop-garden"),
    ("kofi", "line-follower"), ("kofi", "plant-monitor"), ("kofi", "buoy-watch"), ("kofi", "quiet-hours"),
]

COMMENTS = [
    ("plant-monitor", "dev", "Deep sleep with a timer wakeup should get you weeks. Happy to pair on it."),
    ("plant-monitor", "inah", "Could the readings feed a dashboard? I'd build it."),
    ("plant-monitor", "tomas", "I have a capacitive sensor breakout board I'm not using. DM me if you want it."),
    ("plant-monitor", "kofi", "Have you looked at the light sleep modes? You can wake on GPIO change from the sensor."),
    ("soil-choir", "rin", "Dry soil sounding tense is a great idea. I'd draw roots that thin out as it dries."),
    ("soil-choir", "maya", "My plant monitor already streams moisture. You could reuse that firmware."),
    ("soil-choir", "dev", "I could help with the firmware side. The ESP32 streaming is basically the same pattern."),
    ("soil-choir", "june", "I'd love to film this when it's running. A one-minute demo would look incredible."),
    ("dungeon-drift", "rin", "I can do engine loops that don't grate after an hour."),
    ("dungeon-drift", "priya", "The floor-five tileset needs more contrast. I could sketch a few options."),
    ("dungeon-drift", "june", "This needs a trailer. I'll cut one if you want."),
    ("dungeon-drift", "inah", "The drift mechanic is brilliant. Feels like a rhythm game at speed."),
    ("study-quest", "sam", "The map screen could double as the progress bar."),
    ("study-quest", "inah", "I'd use this for my algorithms class. You need a spaced repetition layer."),
    ("study-quest", "leila", "I started scaffolding the backend. The chapter model fits a simple tree."),
    ("park-and-go", "leila", "I'll build the API this weekend. The counter data is just a REST pull, right?"),
    ("park-and-go", "inah", "If you open-source the API I can add a Next.js frontend on top."),
    ("paper-orbit", "maya", "I can model the gear train. What's the orbit radius?"),
    ("paper-orbit", "june", "I want to film this as a stop-motion piece."),
    ("tide-prints", "inah", "The riso layers are gorgeous. Would you share the color separation script?"),
    ("quiet-hours", "maya", "A smoothed mic level is tricky. I'd filter with a rolling median over 500ms."),
    ("quiet-hours", "kofi", "I built something similar with an Arduino. Happy to share the sketch."),
    ("pixel-pets", "priya", "I'll draw three starter pets this week. What size frames are you thinking?"),
    ("pixel-pets", "dev", "Calendar fetch on ESP32 is rough. Consider polling a small server instead."),
    ("line-follower", "tomas", "I can do the PCB. Single board with the H-bridge and sensor header."),
    ("line-follower", "maya", "The enclosure could be lasercut acrylic. I have files for a similar chassis."),
    ("campus-radio", "sam", "The one-handed map needs a swipe gesture for building selection."),
    ("campus-radio", "rin", "I'd contribute field recordings from the music building."),
    ("demo-reel", "rin", "I'll compose three 15-second loops. What tempo range works under narration?"),
    ("demo-reel", "sam", "The title card template should work in 9:16 too for socials."),
    ("buoy-watch", "kofi", "How waterproof is the enclosure? I'm planning something similar for a lake."),
    ("buoy-watch", "inah", "If you publish the API I'll build a public dashboard."),
    ("gopher-planner", "leila", "A focus-block algorithm that avoids class times would be useful. I can help."),
    ("gopher-planner", "sam", "The weekly view needs color coding per course. I'll mock it up."),
    ("loop-garden", "dev", "Mobile Safari latency is a WebAudio scheduling issue. Double-buffer the lookahead."),
    ("loop-garden", "inah", "This is delightful. I played with it for twenty minutes straight."),
    ("signal-lamp", "rin", "Heartbeat glow patterns? Try a sine wave with a slight bounce at the peak."),
    ("signal-lamp", "tomas", "The ESP32 can drive WS2812Bs directly. No extra driver board needed."),
]

# Contributors who've joined projects (handle, project_slug, skill_name)
CONTRIBUTORS = [
    ("dev", "plant-monitor", "ESP32 firmware"),
    ("rin", "dungeon-drift", "Sound design"),
    ("maya", "paper-orbit", "3D modeling"),
    ("sam", "study-quest", "UI design"),
    ("leila", "park-and-go", "Python backend"),
    ("tomas", "line-follower", "PCB design"),
    ("priya", "dungeon-drift", "Pixel art"),
    ("priya", "pixel-pets", "Illustration"),
    ("inah", "tide-prints", "Data viz"),
    ("june", "demo-reel", "Video editing"),
    ("kofi", "quiet-hours", "Arduino"),
    ("maya", "quiet-hours", "Sensors"),
    ("rin", "campus-radio", "Sound design"),
    ("sam", "campus-radio", "UI design"),
]

# Collab requests (requester_handle, project_slug, skill_name, message, status)
COLLAB_REQUESTS = [
    ("dev", "plant-monitor", "ESP32 firmware", "I've done deep sleep on the ESP32 before. Happy to help.", "accepted"),
    ("rin", "dungeon-drift", "Sound design", "I make audio-reactive stuff, engine loops would be fun.", "accepted"),
    ("maya", "paper-orbit", "3D modeling", "I can model the gear train. What's the orbit radius?", "accepted"),
    ("sam", "study-quest", "UI design", "The map-as-progress-bar idea is interesting. I'll mock it up.", "accepted"),
    ("leila", "park-and-go", "Python backend", "I'll build the lot-count API this weekend.", "accepted"),
    ("tomas", "line-follower", "PCB design", "Single board with H-bridge. I have a template.", "accepted"),
    ("priya", "dungeon-drift", "Pixel art", "I'll draw floors five through eight.", "accepted"),
    ("inah", "tide-prints", "Data viz", "I'd love to turn a month of readings into a layout.", "accepted"),
    ("june", "soil-choir", "Video editing", "I'd love to film this running. A one-minute demo reel.", "pending"),
    ("kofi", "quiet-hours", "Arduino", "I built a similar noise-reactive lamp. Can share the code.", "accepted"),
    ("dev", "pixel-pets", "ESP32 firmware", "Calendar polling on the ESP32 \u2014 I have a working pattern.", "pending"),
    ("inah", "campus-radio", "Next.js", "I can build the map frontend if you want.", "pending"),
    ("maya", "buoy-watch", "Sensors", "The turbidity sensor calibration is tricky. I've done it before.", "pending"),
]

# Direct messages (from_handle, to_handle, project_slug_or_None, kind, body)
MESSAGES = [
    # Dev and Maya discuss the plant monitor collab
    ("maya", "dev", "plant-monitor", "invite", "Hi Dev \u2014 I'm building Plant monitor and could use your ESP32 firmware."),
    ("dev", "maya", "plant-monitor", "text", "Definitely interested! I've done deep sleep with timer wakeup on the ESP32 before."),
    ("maya", "dev", "plant-monitor", "text", "Amazing. The current prototype drains the battery in about three days."),
    ("dev", "maya", "plant-monitor", "text", "That's the busy-wait loop. I'll swap it for light sleep with GPIO wakeup."),
    ("maya", "dev", "plant-monitor", "text", "That would be perfect. Can you take a look at the firmware folder in the repo?"),
    ("dev", "maya", "plant-monitor", "text", "Just cloned it. I'll have a PR by the weekend."),

    # Rin and Dev discuss sound design for Dungeon Drift
    ("dev", "rin", "dungeon-drift", "invite", "Hi Rin \u2014 I'm building Dungeon Drift and could use your Sound design."),
    ("rin", "dev", "dungeon-drift", "text", "Engine loops that don't grate \u2014 challenge accepted."),
    ("dev", "rin", "dungeon-drift", "text", "The current placeholder sounds are just sine waves. Anything would be an upgrade."),
    ("rin", "dev", "dungeon-drift", "text", "I'll start with three layers: idle hum, drift screech, and boost whoosh."),
    ("dev", "rin", "dungeon-drift", "text", "That sounds perfect. Can you export as OGG? Godot handles those best."),
    ("rin", "dev", "dungeon-drift", "text", "Sure. I'll push a first batch by Thursday."),

    # Maya and Rin discuss Paper Orbit
    ("rin", "maya", "paper-orbit", "invite", "Hi Maya \u2014 I'm building Paper Orbit and could use your 3D modeling."),
    ("maya", "rin", "paper-orbit", "text", "A printable gear train for the orbits? That sounds really fun."),
    ("rin", "maya", "paper-orbit", "text", "The planets are cut paper. The gears need to be small enough to hide behind them."),
    ("maya", "rin", "paper-orbit", "text", "I'll model a planetary gear set. What's the max diameter?"),
    ("rin", "maya", "paper-orbit", "text", "About 40mm. And it needs to be quiet \u2014 the installation picks up mic input."),

    # Sam and Leila discuss the swap
    ("leila", "sam", "study-quest", "invite", "Hi Sam \u2014 I'm building Study Quest and could use your UI design."),
    ("sam", "leila", "study-quest", "text", "The map screen could double as the progress bar. I have ideas."),
    ("leila", "sam", "study-quest", "text", "That's exactly what I was thinking. A dungeon map where cleared rooms light up."),
    ("sam", "leila", "park-and-go", "invite", "Hi Leila \u2014 I'm building Park&Go and could use your Python backend."),
    ("leila", "sam", "park-and-go", "text", "I'll build the API this weekend. The gate counter data \u2014 is it a REST endpoint?"),
    ("sam", "leila", "park-and-go", "text", "Yes, the university publishes it as JSON every five minutes."),
    ("leila", "sam", "park-and-go", "text", "Perfect. I'll cache it and add a WebSocket for live updates."),

    # Inah and Maya chat about sensors
    ("inah", "maya", None, "text", "Hey Maya, I saw your plant monitor. The sensor setup is really clean."),
    ("maya", "inah", None, "text", "Thanks! The capacitive sensor was the tricky part. Resistive ones corrode."),
    ("inah", "maya", None, "text", "I'm thinking about building something similar for Soil Choir. Could I reuse your schematic?"),
    ("maya", "inah", None, "text", "Absolutely. I'll share the KiCad files."),

    # June and Rin discuss demo videos
    ("june", "rin", None, "text", "Hey Rin, I saw Paper Orbit and Tide Prints. Your work is incredible."),
    ("rin", "june", None, "text", "Thank you! I love your motion graphics on the demo reel project."),
    ("june", "rin", None, "text", "I'd love to film Paper Orbit when it's running. Would you be up for that?"),
    ("rin", "june", None, "text", "Absolutely. It'll be ready for a shoot in about two weeks."),

    # Priya and Dev discuss pixel art for the game
    ("priya", "dev", "dungeon-drift", "text", "The floor-five tileset \u2014 are you thinking dark stone or something more organic?"),
    ("dev", "priya", "dungeon-drift", "text", "Dark stone for five and six, then a lava theme for seven and eight."),
    ("priya", "dev", "dungeon-drift", "text", "Nice. I'll sketch both palettes and send you options."),
    ("dev", "priya", "dungeon-drift", "text", "Take your time. Rin's doing the sound at the same time so we can sync."),

    # Kofi and Tomas discuss hardware
    ("kofi", "tomas", "line-follower", "text", "The single PCB idea is great. Have you picked a motor driver IC?"),
    ("tomas", "kofi", "line-follower", "text", "DRV8833. Dual H-bridge, tiny footprint, and cheap."),
    ("kofi", "tomas", "line-follower", "text", "Perfect for the kit. I'll test it with the motors I have."),
    ("tomas", "kofi", None, "text", "Also, your line follower robot at the fair was impressive. Clean PID tuning."),
    ("kofi", "tomas", None, "text", "Thanks! Took me a while to get the derivative term right on the carpet surface."),

    # Sam and June discuss branding
    ("sam", "june", "demo-reel", "text", "The title card template \u2014 can you do a 9:16 version for social posts?"),
    ("june", "sam", "demo-reel", "text", "Good call. I'll add vertical and square templates to the pack."),
    ("sam", "june", None, "text", "Also, the Campus Radio Map idea is really cool. I'd love to help with the map UI."),
    ("june", "sam", None, "text", "That's actually Rin's project but I agree \u2014 it needs a proper map designer."),
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
