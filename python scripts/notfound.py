import os
import json

# ====== INPUT PATHS ======
json_path = input("Enter JSON file path: ").strip()

print("\nEnter 4 GitHub store folder paths:")
store_paths = []
for i in range(4):
    path = input(f"Store {i+1} path: ").strip()
    store_paths.append(path)

# ====== LOAD JSON ======
with open(json_path, "r", encoding="utf-8") as f:
    songs = json.load(f)

# ====== HELPER FUNCTION ======
def file_exists_in_stores(file_path):
    filename = os.path.basename(file_path)

    for store in store_paths:
        for root, dirs, files in os.walk(store):
            if filename in files:
                return True
    return False

# ====== CHECK MISSING ======
missing_songs = []

for song in songs:
    audio_path = song.get("file", "")

    if not file_exists_in_stores(audio_path):
        missing_songs.append({
            "title": song.get("title"),
            "artist": song.get("artist"),
            "image": song.get("image")
        })

# ====== OUTPUT ======
print("\n===== MISSING AUDIO FILES =====\n")

if not missing_songs:
    print("All songs have audio files ✅")
else:
    for i, s in enumerate(missing_songs, 1):
        print(f"{i}. Title : {s['title']}")
        print(f"   Artist: {s['artist']}")
        print(f"   Image : {s['image']}")
        print("-" * 40)

    print(f"\nTotal Missing: {len(missing_songs)} ❌")