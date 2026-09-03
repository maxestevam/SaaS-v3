from PIL import Image

image = Image.new("RGB", (1280, 600), color=(255, 88, 121))
image.save("/tmp/saas-preview-fullscreen.png", format="PNG")
