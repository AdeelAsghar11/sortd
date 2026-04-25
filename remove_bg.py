import os
from PIL import Image

def remove_background(image_path, output_path, tolerance=30):
    print(f"Processing {image_path}...")
    img = Image.open(image_path).convert("RGBA")
    datas = img.getdata()

    # Get the background color from the top-left corner
    bg_color = datas[0]
    
    new_data = []
    for item in datas:
        # Check if the pixel is within the tolerance of the background color
        is_bg = True
        for i in range(3): # Check R, G, B
            if abs(item[i] - bg_color[i]) > tolerance:
                is_bg = False
                break
        
        if is_bg:
            new_data.append((255, 255, 255, 0)) # Fully transparent
        else:
            new_data.append(item)

    img.putdata(new_data)
    img.save(output_path, "PNG")
    print(f"Saved to {output_path}")

def process_all():
    # Logo
    logo_path = "client/public/logo.png"
    if os.path.exists(logo_path):
        remove_background(logo_path, logo_path)

    # Favicons
    favicon_dir = "client/public/favicon_io"
    if os.path.exists(favicon_dir):
        for filename in os.listdir(favicon_dir):
            if filename.endswith(".png"):
                path = os.path.join(favicon_dir, filename)
                remove_background(path, path)

if __name__ == "__main__":
    process_all()
