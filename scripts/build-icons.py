"""Render the code-defined Tubecast route/ring icon. Requires Pillow only when regenerating."""
from pathlib import Path
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parents[1]/'assets/icons'
root.mkdir(exist_ok=True)
S=4
im=Image.new('RGB',(512*S,512*S),'#1a2029');draw=ImageDraw.Draw(im)
def line(points,colour,width):
    draw.line([(int(x*S),int(y*S)) for x,y in points],fill=colour,width=width*S,joint='curve')
    r=width*S/2
    for x,y in (points[0],points[-1]):
        x,y=x*S,y*S;draw.ellipse((int(x-r),int(y-r),int(x+r),int(y+r)),fill=colour)
def circle(x,y,r,fill,outline=None,width=1):
    draw.ellipse(((x-r)*S,(y-r)*S,(x+r)*S,(y+r)*S),fill=fill,outline=outline,width=width*S)
line([(136,320),(200,256),(376,256)],'#e1251b',18)
line([(136,256),(248,256),(312,192),(376,192)],'#1fa6a6',18)
circle(200,256,28,'#1a2029');circle(200,256,17,'#ffa12b')
circle(312,256,28,'#1a2029')
for start in range(0,360,60):
    draw.arc(((312-19)*S,(256-19)*S,(312+19)*S,(256+19)*S),start,start+36,fill='#ffa12b',width=5*S)
for size,name in [(180,'apple-touch-icon.png'),(192,'icon-192.png'),(512,'icon-512.png')]:
    im.resize((size,size),Image.Resampling.LANCZOS).save(root/name,optimize=True)
