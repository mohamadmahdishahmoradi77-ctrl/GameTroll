import express from "express";
import crypto from "node:crypto";
import { db } from "./db.js";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

app.use(express.json({ limit: "2mb" }));
app.use(express.static(new URL("./", import.meta.url).pathname));

if (!ADMIN_PASSWORD) console.warn("WARNING: ADMIN_PASSWORD is not set.");
const sessions = new Map();
const token = () => crypto.randomBytes(32).toString("hex");
function auth(req, res, next) {
  const t = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!t || !sessions.has(t)) return res.status(401).json({ error: "UNAUTHORIZED" });
  next();
}
function tableFor(type) { return { games:"games", packs:"packs", news:"news", tutorials:"tutorials" }[type]; }

app.get("/api/health", (_req,res)=>res.json({ok:true,service:"GAME TROLL API",time:new Date().toISOString()}));
app.get("/api/content/:type", async (req,res)=>{
  const table=tableFor(req.params.type); if(!table) return res.status(404).json({error:"UNKNOWN_CONTENT_TYPE"});
  const rows=await db.all(`SELECT * FROM ${table} ORDER BY created_at DESC`);
  if(table==='packs') rows.forEach(x=>{x.old=x.old_price;x.desc=x.description});
  if(table==='games') rows.forEach(x=>{x.desc=x.description});
  if(table==='tutorials') rows.forEach(x=>{x.desc=x.description});
  res.json(rows);
});
app.post("/api/admin/login",(req,res)=>{
  const {username,password}=req.body||{};
  if(username!==ADMIN_USER || password!==ADMIN_PASSWORD) return res.status(401).json({error:"INVALID_LOGIN"});
  const accessToken=token(); sessions.set(accessToken,{createdAt:Date.now()}); res.json({ok:true,token:accessToken});
});
app.post("/api/admin/logout",auth,(req,res)=>{const t=req.headers.authorization?.replace(/^Bearer\s+/i,"");sessions.delete(t);res.json({ok:true});});
app.post("/api/admin/content/:type",auth,async(req,res)=>{
  const table=tableFor(req.params.type); if(!table) return res.status(404).json({error:"UNKNOWN_CONTENT_TYPE"});
  const body=req.body||{}; if(!body.id || (!body.name && !body.title)) return res.status(400).json({error:"ID_AND_NAME_REQUIRED"});
  const normalized={...body};
  if(normalized.old!==undefined && normalized.old_price===undefined) normalized.old_price=normalized.old;
  if(normalized.desc!==undefined && normalized.description===undefined) normalized.description=normalized.desc;
  const allowed=["id","name","short","console","genre","year","size","version","tag","img","description","pack","link","count","old_price","price","title","time","icon"];
  const columns=Object.keys(normalized).filter(k=>allowed.includes(k));
  const values=columns.map(k=>normalized[k]);
  const item=await db.upsert(table,columns,values); res.json({ok:true,item});
});
app.delete("/api/admin/content/:type/:id",auth,async(req,res)=>{const table=tableFor(req.params.type);if(!table)return res.status(404).json({error:"UNKNOWN_CONTENT_TYPE"});await db.run(`DELETE FROM ${table} WHERE id=?`,[req.params.id]);res.json({ok:true});});
app.get("/api/admin/orders",auth,async(_req,res)=>res.json(await db.all("SELECT * FROM orders ORDER BY created_at DESC")));
app.post("/api/orders",async(req,res)=>{const b=req.body||{};if(!b.item_type||!b.item_id)return res.status(400).json({error:"ITEM_REQUIRED"});const id=b.id||crypto.randomUUID();await db.run(`INSERT INTO orders (id,customer_name,customer_contact,item_type,item_id,item_name,amount,status,receipt,note) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,[id,b.customer_name||"",b.customer_contact||"",b.item_type,b.item_id,b.item_name||"",Number(b.amount||0),b.receipt||"",b.note||""]);res.status(201).json({ok:true,id});});
app.patch("/api/admin/orders/:id",auth,async(req,res)=>{const status=req.body?.status;if(!["pending","owned","rejected"].includes(status))return res.status(400).json({error:"INVALID_STATUS"});await db.run("UPDATE orders SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",[status,req.params.id]);res.json({ok:true});});
app.get("/",(_req,res)=>res.sendFile(new URL("./index.html",import.meta.url).pathname));
app.listen(PORT,()=>console.log(`GAME TROLL API running on port ${PORT}`));
