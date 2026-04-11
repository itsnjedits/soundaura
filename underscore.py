import os

# Folder path input lo
folder_path = input("Enter folder path: ")

# Check karo folder exist karta hai ya nahi
if not os.path.exists(folder_path):
    print("❌ Folder does not exist!")
    exit()

# Folder ke andar ki files loop karo
for filename in os.listdir(folder_path):
    old_path = os.path.join(folder_path, filename)

    # Sirf files pe apply karna hai (folders skip)
    if os.path.isfile(old_path):
        # Space ko underscore se replace karo
        new_filename = filename.replace(" ", "_")
        new_path = os.path.join(folder_path, new_filename)

        # Rename karo
        os.rename(old_path, new_path)
        print(f"Renamed: {filename} → {new_filename}")

print("✅ Done!")