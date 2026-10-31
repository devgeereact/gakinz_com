"""Contact sheet of screenshots: sheet.py <dir> <width-suffix> <cols> <tile_w> <tile_h> <out.png>
Tiles are in file-name order (no labels: this ffmpeg build has no drawtext).
"""
import sys,subprocess,glob,os
# sheet.py <dir> <width-suffix> <cols> <tile_w> <tile_h> <out>
d,suf,cols,tw,th,out=sys.argv[1],sys.argv[2],int(sys.argv[3]),int(sys.argv[4]),int(sys.argv[5]),sys.argv[6]
files=sorted(glob.glob(os.path.join(d,f'*-{suf}.png')))
files=[f for f in files if not f.endswith(f'-{suf}0.png')]
n=len(files); rows=(n+cols-1)//cols
args=['ffmpeg','-y','-loglevel','error']
for f in files: args+=['-i',f]
fl=[]
for i in range(n): fl.append(f'[{i}:v]scale={tw}:{th}:force_original_aspect_ratio=decrease,pad={tw}:{th}:0:0:white[v{i}]')
pad=cols*rows-n
for j in range(pad): fl.append(f'color=white:s={tw}x{th}[p{j}]')
ins=''.join(f'[v{i}]' for i in range(n))+''.join(f'[p{j}]' for j in range(pad))
lay='|'.join(f'{(k%cols)*tw}_{(k//cols)*th}' for k in range(cols*rows))
fl.append(f'{ins}xstack=inputs={cols*rows}:layout={lay}[o]')
subprocess.run(args+['-filter_complex',';'.join(fl),'-map','[o]','-frames:v','1',out],check=True)
print(out,n)
