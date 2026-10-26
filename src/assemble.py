import base64,glob,os,json
game=open('v2-game.js').read()
assert '/*__AUDIO__*/' not in game and '/*__PAD__*/' not in game
head=open('v2-head.html').read()
extra_css='''<style>
.panel-pad{padding:14px;width:100%;max-width:440px}
.findlist{display:flex;flex-direction:column;gap:8px}
.codeinput{display:flex;gap:8px}.codeinput input{flex:1;text-transform:uppercase;letter-spacing:.3em;text-align:center}
.grid.g2{grid-template-columns:repeat(2,1fr)}.grid.g3{grid-template-columns:repeat(3,1fr)}
.logo small{display:block;font-size:.35em;letter-spacing:.3em;opacity:.8}
.pad-power{position:relative}.pad-power b{position:absolute;inset:0;display:grid;place-items:center;font-family:'Lilita One';font-weight:400;font-size:1.1rem;text-shadow:0 2px 0 #000;pointer-events:none}
.pad-emotes{display:flex;gap:6px;justify-content:space-between;flex-wrap:wrap}.pad-emotes .btn{flex:1 0 14%;padding:8px 0;font-size:1rem}
</style>'''
AD={os.path.basename(f)[:-5]:'data:image/webp;base64,'+base64.b64encode(open(f,'rb').read()).decode() for f in sorted(glob.glob('/mnt/project-files/artillery-game/assets/*.webp'))}
assets_js='<script>window.ASSET_DATA='+json.dumps(AD)+';</script>'
out=head+'\n'+assets_js+'\n'+extra_css+'\n<script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"></script>\n<script type="module">\n'+game+'\n</script>\n</body>\n</html>\n'
open('v2-index.html','w').write(out)
print(len(out))
