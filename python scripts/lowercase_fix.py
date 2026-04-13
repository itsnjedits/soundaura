import os
import json
import uuid

# -------------------------------
# PATHS
# -------------------------------
stores = [
    r"Y:\WEB DEVELOPMENT\store1\audio",
    r"Y:\WEB DEVELOPMENT\store2\audio",
    r"Y:\WEB DEVELOPMENT\store3\audio",
    r"Y:\WEB DEVELOPMENT\store4\audio"
]

thumbnail_path = r"Y:\WEB DEVELOPMENT\soundaura\thumbnails"


# -------------------------------
# FORCE RENAME FUNCTION (IMPORTANT)
# -------------------------------
def force_lowercase_rename(folder, extensions):
    print(f"\nProcessing: {folder}")

    for root, dirs, files in os.walk(folder):
        for file in files:
            if any(file.lower().endswith(ext) for ext in extensions):

                old_path = os.path.join(root, file)
                lower_name = file.lower()
                final_path = os.path.join(root, lower_name)

                # Agar already lowercase hai → skip
                if file == lower_name:
                    continue

                # Step 1: temp rename
                temp_name = f"temp_{uuid.uuid4().hex}{os.path.splitext(file)[1]}"
                temp_path = os.path.join(root, temp_name)

                os.rename(old_path, temp_path)

                # Step 2: final lowercase rename
                os.rename(temp_path, final_path)

                print(f"✔ {file} → {lower_name}")


# -------------------------------
# RUN FOR AUDIO FILES
# -------------------------------
for store in stores:
    force_lowercase_rename(store, [".mp3"])


# -------------------------------
# RUN FOR THUMBNAILS
# -------------------------------
force_lowercase_rename(thumbnail_path, [".jpg", ".jpeg", ".png"])


print("\n🎉 DONE! All files forced to lowercase.")