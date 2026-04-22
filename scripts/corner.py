from PIL import Image, ImageDraw
import sys
import os

def round_corners(image_path, radius):
    # Open image in RGBA (transparency support)
    img = Image.open(image_path).convert("RGBA")

    width, height = img.size

    # Create mask (same size as image)
    mask = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(mask)

    # Draw rounded rectangle (white = visible)
    draw.rounded_rectangle(
        [(0, 0), (width, height)],
        radius=radius,
        fill=255
    )

    # Apply mask to image
    img.putalpha(mask)

    # Save output (PNG for transparency, no quality loss)
    output_path = os.path.splitext(image_path)[0] + "_rounded.png"
    img.save(output_path)

    print(f"Saved: {output_path}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python script.py <image_path> [radius]")
    else:
        image_path = sys.argv[1]
        radius = int(sys.argv[2]) if len(sys.argv) > 2 else 50

        round_corners(image_path, radius)