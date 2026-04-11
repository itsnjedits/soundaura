import json

# INPUT aur OUTPUT file path
input_file = r"C:\Users\Nishant\Desktop\files\songs.json"
output_file = r"C:\Users\Nishant\Desktop\files\song2.json"

# unwanted moods
REMOVE_MOODS = {"rap", "mix", "patriotic", "inspirational", "hindi-new"}

# rename mapping
RENAME_MAP = {
    "slowed-reverb": "slowedreverb",
    "without-music": "vocalsonly",
    "hindi-old": "oldisgold"
}

def process_songs(data):
    for song in data:
        # Step 1: genre values ko mood me daalo
        genre_values = song.get("genre", [])
        mood_values = song.get("mood", [])

        combined = mood_values + genre_values

        # Step 2: lowercase + strip
        combined = [m.strip().lower() for m in combined]

        # Step 3: rename apply karo
        combined = [RENAME_MAP.get(m, m) for m in combined]

        # Step 4: unwanted remove karo
        combined = [m for m in combined if m not in REMOVE_MOODS]

        # Step 5: duplicates hatao (order maintain karte hue)
        seen = set()
        final_mood = []
        for m in combined:
            if m not in seen:
                seen.add(m)
                final_mood.append(m)

        # Step 6: update mood
        song["mood"] = final_mood

        # Step 7: genre field delete
        if "genre" in song:
            del song["genre"]

    return data


# JSON load karo
with open(input_file, "r", encoding="utf-8") as f:
    data = json.load(f)

# Process karo
updated_data = process_songs(data)

# Save karo
with open(output_file, "w", encoding="utf-8") as f:
    json.dump(updated_data, f, indent=2, ensure_ascii=False)

print("✅ Done! Cleaned JSON saved in", output_file)