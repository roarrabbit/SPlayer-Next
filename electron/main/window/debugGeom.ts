import { app, BrowserWindow } from "electron";
import { writeFileSync } from "fs";
import { join } from "path";
import { createWindow } from "./create";
import { systemLog } from "@main/utils/logger";

// 灵动岛几何调试控制窗
// ---------------------------------------------------------------------------
// 用户在灵动岛窗口内按 Cmd/Ctrl+Shift+G（或主进程托盘触发）打开本窗，
// 拖动滑块实时改变真实灵动岛窗口的封面/频谱/歌词几何（xy 偏移 + 宽高），
// 调到满意后点「复制参数」把数值发我落地为常量。
// 控制页写入临时文件后 loadFile 加载（复用标准 preload，window.api 可用），
// 直接调 dynamicIsland.setDebugGeom 经主进程转发到真实岛渲染端实时调整。
// ---------------------------------------------------------------------------

let debugWindow: BrowserWindow | null = null;

const buildControlHtml = (): string => `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>灵动岛几何调试</title>
<style>
  :root{--bg:#0d0e12;--panel:#16181f;--p2:#1c1f28;--bd:#2a2d38;--tx:#e8eaf0;--mt:#8b909c;--ac:#6f9cff}
  *{box-sizing:border-box}html,body{margin:0;padding:0;height:100%}
  body{background:var(--bg);color:var(--tx);font:12px/1.5 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;display:flex;flex-direction:column;overflow:hidden}
  h1{font-size:13px;margin:0;padding:12px 14px;border-bottom:1px solid var(--bd);background:linear-gradient(180deg,#15171e,#101218)}
  h1 .s{display:block;font-size:10px;color:var(--mt);font-weight:400;margin-top:2px}
  .scroll{flex:1;overflow-y:auto;padding:12px 14px 8px}
  .grp{margin-bottom:14px}
  .gt{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--mt);margin:0 0 8px}
  .c{display:grid;grid-template-columns:1fr auto;gap:3px 10px;align-items:center;margin-bottom:9px}
  .c label{font-size:12px}
  .c .v{font-size:11px;color:var(--ac);font-variant-numeric:tabular-nums;text-align:right;min-width:38px}
  .c input[type=range]{grid-column:1/-1;width:100%;height:4px;-webkit-appearance:none;appearance:none;background:var(--p2);border-radius:2px;cursor:pointer}
  .c input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:var(--ac);border:2px solid #0d0e12;cursor:grab}
  .out{border-top:1px solid var(--bd);padding:10px 14px;background:var(--panel)}
  textarea{width:100%;height:118px;background:var(--p2);color:#d6f5d6;border:1px solid var(--bd);border-radius:6px;padding:8px;font:11px/1.5 "SF Mono",Menlo,monospace;resize:none}
  button{margin-top:8px;width:100%;padding:8px;background:var(--ac);color:#0d0e12;border:0;border-radius:6px;font-weight:600;font-size:12px;cursor:pointer}
  button:hover{filter:brightness(1.1)}
</style></head>
<body>
<h1>灵动岛几何调试<span class="s">拖滑块实时改真实岛 · Cmd/Ctrl+Shift+G 开关</span><span class="s"><b id="st" style="color:#7ee787;font-weight:600">初始化…</b></span></h1>
<div class="scroll" id="scroll"></div>
<div class="out">
  <textarea id="exp" readonly></textarea>
  <button id="cp">复制参数</button>
</div>
<script>
const GROUPS=[
  {g:"顶部区",items:[
    {k:"topH",l:"顶部区高度",min:20,max:80,step:1}]},
  {g:"封面（xy 偏移 / 宽高）",items:[
    {k:"coverX",l:"封面 X",min:-40,max:40,step:1},
    {k:"coverY",l:"封面 Y",min:-40,max:40,step:1},
    {k:"coverW",l:"封面 宽",min:14,max:56,step:1},
    {k:"coverH",l:"封面 高",min:14,max:56,step:1}]},
  {g:"频谱（xy / 样式宽高柱数柱隙）",items:[
    {k:"specX",l:"频谱 X",min:-40,max:40,step:1},
    {k:"specY",l:"频谱 Y",min:-40,max:40,step:1},
    {k:"specW",l:"频谱 宽",min:18,max:120,step:1},
    {k:"specH",l:"频谱 高",min:14,max:80,step:1},
    {k:"barCount",l:"柱数",min:3,max:14,step:1},
    {k:"barGap",l:"柱间隙",min:0,max:8,step:0.5}]},
  {g:"歌词行",items:[
    {k:"lyricH",l:"歌词行高",min:20,max:40,step:1},
    {k:"lyricFontSize",l:"歌词字号",min:9,max:22,step:1},
    {k:"noLyricH",l:"无歌词高",min:20,max:60,step:1}]},
  {g:"歌词（xy / 宽度）",items:[
    {k:"lyricX",l:"歌词 X",min:-60,max:60,step:1},
    {k:"lyricY",l:"歌词 Y",min:-40,max:40,step:1},
    {k:"lyricW",l:"歌词 宽(0=自动)",min:0,max:340,step:1},
    {k:"lyricMarginLeft",l:"左 margin",min:-40,max:40,step:1},
    {k:"lyricMarginRight",l:"右 margin",min:-40,max:40,step:1}]}
];
const P={islandW:324,islandX:0,islandY:-61,topH:37,coverSize:28,specW:25,specH:20,barCount:5,barGap:2.5,coverMarginLeft:0,coverMarginTop:0,spectrumMarginRight:0,spectrumMarginTop:0,lyricH:28,noLyricH:39,lyricMarginLeft:-6,lyricMarginRight:-6,lyricFontSize:12,coverX:7,coverY:0,coverW:28,coverH:28,specX:-8,specY:0,lyricX:9,lyricY:0,lyricW:0};
const all=[];
const scroll=document.getElementById("scroll");
GROUPS.forEach(function(gp){
  const gd=document.createElement("div");gd.className="grp";
  const gt=document.createElement("div");gt.className="gt";gt.textContent=gp.g;gd.appendChild(gt);
  gp.items.forEach(function(it){
    all.push(it.k);
    const idx=all.length;
    const row=document.createElement("div");row.className="c";
    const lab=document.createElement("label");lab.textContent=it.l;
    const v=document.createElement("span");v.className="v";v.id="v"+idx;
    const inp=document.createElement("input");inp.type="range";inp.min=it.min;inp.max=it.max;inp.step=it.step;inp.id="i"+idx;
    row.appendChild(lab);row.appendChild(v);row.appendChild(inp);gd.appendChild(row);
  });
  scroll.appendChild(gd);
});
function send(){
  const st=document.getElementById("st");
  try{
    if(!window.api||!window.api.dynamicIsland||!window.api.dynamicIsland.setDebugGeom){
      st.textContent="✗ window.api 不可用（preload 未加载）";
      st.style.color="#ff7b72";
      upd();return;
    }
    window.api.dynamicIsland.setDebugGeom(P);
    st.textContent="✓ 已发送 "+P.islandW+"×"+(P.topH+P.lyricH);
    st.style.color="#7ee787";
    upd();
  }catch(e){
    st.textContent="✗ 发送异常: "+e.message;
    st.style.color="#ff7b72";
    upd();
  }
}
function upd(){
  for(let k=0;k<all.length;k++){
    const ve=document.getElementById("v"+(k+1));if(ve)ve.textContent=P[all[k]];
    const ie=document.getElementById("i"+(k+1));if(ie)ie.value=P[all[k]];
  }
  const t=document.getElementById("exp");
  t.value=
    "// 灵动岛几何参数（调试台导出，Ctrl+C 复制）\\n"+
    "topH="+P.topH+"  总高="+(P.topH+P.lyricH)+"  // 顶部区高 / 总高\\n"+
    "coverX="+P.coverX+" coverY="+P.coverY+" coverW="+P.coverW+" coverH="+P.coverH+"  // 封面 xy/wh\\n"+
    "specX="+P.specX+" specY="+P.specY+" specW="+P.specW+" specH="+P.specH+"  // 频谱 xy/wh\\n"+
    "barCount="+P.barCount+" barGap="+P.barGap+"  // 频谱柱数/柱间隙\\n"+
    "lyricX="+P.lyricX+" lyricY="+P.lyricY+" lyricW="+P.lyricW+"  // 歌词 xy/w(0=自动)\\n"+
    "lyricH="+P.lyricH+" lyricFontSize="+P.lyricFontSize+"  // 歌词行高/字号\\n"+
    "lyricMarginLeft="+P.lyricMarginLeft+" lyricMarginRight="+P.lyricMarginRight+"  // 歌词 margin\\n"+
    "noLyricH="+P.noLyricH+"  // 无歌词高";
}
for(let k=0;k<all.length;k++){
  (function(kk){
    const el=document.getElementById("i"+(kk+1));
    el.addEventListener("input",function(e){P[all[kk]]=+e.target.value;send();});
  })(k);
}
document.getElementById("cp").addEventListener("click",function(){
  const t=document.getElementById("exp");t.select();document.execCommand("copy");
  const b=document.getElementById("cp");b.textContent="已复制 ✓";setTimeout(function(){b.textContent="复制参数";},1200);
});
upd();send();
</script>
</body></html>`;

/** 打开/关闭几何调试控制窗 */
export const toggleDebugGeomWindow = (): void => {
  if (debugWindow && !debugWindow.isDestroyed()) {
    debugWindow.close();
    return;
  }
  debugWindow = createWindow({
    width: 320,
    height: 740,
    title: "灵动岛几何调试",
    frame: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: false,
    show: true,
    backgroundColor: "#0d0e12",
    webPreferences: {
      disableDialogs: true,
    },
  });
  // 关键：不能用 data: URL（preload 不会注入 data 页，window.api 缺失 → send() 发不出 IPC）。
  // 改为把控制页写入临时文件后用 loadFile 加载，与灵动岛一致，preload 必定注入。
  const tmpFile = join(app.getPath("temp"), "splayer-debug-geom.html");
  writeFileSync(tmpFile, buildControlHtml(), "utf-8");
  systemLog.info(`[dynamic-island] 控制页已写入: ${tmpFile}`);
  debugWindow.loadFile(tmpFile);
  debugWindow.on("closed", () => {
    debugWindow = null;
  });
};
