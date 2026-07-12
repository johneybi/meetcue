from pathlib import Path
import sys

from PIL import Image, ImageDraw


def remove_connected_white_background(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    marker = (255, 0, 255, 255)
    work = rgba.copy()

    for point in (
        (0, 0),
        (work.width - 1, 0),
        (0, work.height - 1),
        (work.width - 1, work.height - 1),
    ):
        ImageDraw.floodfill(work, point, marker, thresh=30)

    source_pixels = rgba.load()
    work_pixels = work.load()
    for y in range(work.height):
        for x in range(work.width):
            if work_pixels[x, y] == marker:
                source_pixels[x, y] = (255, 255, 255, 0)

    return rgba


def square_crop(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    bounds = alpha.getbbox()
    if bounds is None:
        raise ValueError("The emblem has no visible pixels")

    left, top, right, bottom = bounds
    width = right - left
    height = bottom - top
    side = max(width, height)
    padding = max(2, round(side * 0.025))
    side += padding * 2
    center_x = (left + right) / 2
    center_y = (top + bottom) / 2
    crop_box = (
        round(center_x - side / 2),
        round(center_y - side / 2),
        round(center_x + side / 2),
        round(center_y + side / 2),
    )

    square = Image.new("RGBA", (crop_box[2] - crop_box[0], crop_box[3] - crop_box[1]))
    square.alpha_composite(image, (-crop_box[0], -crop_box[1]))
    return square


def main() -> None:
    source = Path(sys.argv[1])
    output_dir = Path(sys.argv[2])
    output_dir.mkdir(parents=True, exist_ok=True)

    emblem = square_crop(remove_connected_white_background(Image.open(source)))
    for size in (512, 192, 64, 32):
        resized = emblem.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(output_dir / f"meetcue-emblem-{size}.png", optimize=True)


if __name__ == "__main__":
    main()
