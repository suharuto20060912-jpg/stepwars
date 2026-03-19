import { useState, useEffect, useRef } from "react";

// ─── Supabase設定 ここを書き換えてください ────────────────────────────────
const SUPABASE_URL = "https://zkucwakksrcfumrxrhah.supabase.co";
const SUPABASE_KEY = "sb_publishable_JxQexIzZQUY51ik00e8PRg_TTJrey_f";

const sb = (path, options = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...options.headers,
    },
    ...options,
  }).then(r => r.json());

// ─── Constants ────────────────────────────────────────────────────────────────
const AVATARS = ["🏃","🚶","🧗","🚴","🤸","🏋️","⛹️","🤾","🧘","🏊"];
const BADGE_DEFS = [
  { id:"b1", icon:"🌱", label:"ファーストステップ", desc:"1,000歩",  check: m => m.steps >= 1000 },
  { id:"b2", icon:"👟", label:"ウォーカー",         desc:"5,000歩",  check: m => m.steps >= 5000 },
  { id:"b3", icon:"🎯", label:"目標達成",           desc:"目標クリア", check: m => m.steps >= m.goal },
  { id:"b4", icon:"🏅", label:"エース",             desc:"10,000歩", check: m => m.steps >= 10000 },
  { id:"b5", icon:"🔥", label:"ファイヤー",         desc:"3日連続",   check: m => (m.streak||0) >= 3 },
  { id:"b6", icon:"🏆", label:"チャンピオン",        desc:"15,000歩", check: m => m.steps >= 15000 },
  { id:"b7", icon:"💎", label:"ダイヤモンド",        desc:"20,000歩", check: m => m.steps >= 20000 },
  { id:"b8", icon:"⚡", label:"レジェンド",          desc:"30,000歩", check: m => m.steps >= 30000 },
];
const REACTION_EMOJIS = ["👏","🔥","💪","🎉","😮","❤️"];

function getBadges(m) { return BADGE_DEFS.filter(b => b.check(m)); }

// ─── QR (pixel art style) ─────────────────────────────────────────────────────
function MiniQR({ code, size = 140 }) {
  const ref = useRef();
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    let h = 0;
    for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) & 0xffff;
    const rng = s => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 16) / 65535; };
    const S = 9, cell = size / (S + 2);
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#0b0f1a";
    for (let r = 0; r < S; r++) for (let col = 0; col < S; col++) {
      const isTL = r < 3 && col < 3, isTR = r < 3 && col >= S - 3, iBL = r >= S - 3 && col < 3;
      let fill;
      if (isTL || isTR || iBL) fill = !(r === 1 && col === 1) && !(r === 1 && col >= S - 2) && !(r >= S - 2 && col === 1);
      else fill = rng(h + r * 7 + col * 13) > 0.48;
      if (fill) ctx.fillRect((col + 1) * cell, (r + 1) * cell, cell - 1, cell - 1);
    }
  }, [code, size]);
  return <canvas ref={ref} width={size} height={size} style={{ borderRadius: 8, display: "block" }} />;
}

function ProgressBar({ value, max, color = "#00e5a0", height = 8 }) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  return (
    <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 99, height, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", borderRadius: 99,
        background: `linear-gradient(90deg,${color},${color}bb)`,
        transition: "width 1s cubic-bezier(.4,0,.2,1)", boxShadow: `0 0 8px ${color}55` }} />
    </div>
  );
}

function Toast({ msg }) {
  return msg ? (
    <div style={{
      position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
      background: "#00e5a0", color: "#0b0f1a", padding: "10px 22px",
      borderRadius: 99, fontWeight: 800, fontSize: 13,
      boxShadow: "0 4px 24px rgba(0,229,160,0.45)", zIndex: 9999,
      animation: "toastIn .25s ease", whiteSpace: "nowrap",
    }}>{msg}</div>
  ) : null;
}

function Lbl({ children }) {
  return <div style={{ fontSize: 11, color: "#8899aa", fontWeight: 700, marginBottom: 5, letterSpacing: 0.5 }}>{children}</div>;
}

const iStyle = {
  width: "100%", padding: "11px 13px", borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.11)", background: "rgba(255,255,255,0.04)",
  color: "#fff", fontSize: 14, outline: "none", marginBottom: 12, display: "block", fontFamily: "inherit",
};
const primBtn = {
  padding: "12px 18px", borderRadius: 10, border: "none",
  background: "linear-gradient(135deg,#00e5a0,#00b87a)",
  color: "#0b0f1a", fontWeight: 800, fontSize: 13, cursor: "pointer",
};
const outlineBtn = {
  padding: "12px 18px", borderRadius: 10,
  border: "1px solid rgba(0,229,160,0.3)", background: "transparent",
  color: "#00e5a0", fontWeight: 700, fontSize: 13, cursor: "pointer",
};
const backBtnStyle = {
  padding: "5px 12px", borderRadius: 99, border: "1px solid rgba(255,255,255,0.1)",
  background: "transparent", color: "#8899aa", fontSize: 11, cursor: "pointer",
};

// ─── Welcome ──────────────────────────────────────────────────────────────────
function WelcomeScreen({ onJoin, onCreate }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 24 }}>
      <div style={{ fontSize: 68, marginBottom: 8, filter: "drop-shadow(0 0 20px rgba(0,229,160,0.4))" }}>👟</div>
      <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-1.5px", color: "#fff", marginBottom: 4 }}>StepWars</div>
      <div style={{ fontSize: 12, color: "#00e5a0", letterSpacing: 4, textTransform: "uppercase", marginBottom: 48 }}>Group Challenge</div>
      <div style={{ width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: 12 }}>
        <button onClick={onJoin} style={{ padding: "16px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#00e5a0,#00b87a)", color: "#0b0f1a", fontWeight: 900, fontSize: 16, cursor: "pointer", boxShadow: "0 8px 32px rgba(0,229,160,0.35)" }}>
          グループに参加する
        </button>
        <button onClick={onCreate} style={{ padding: "16px", borderRadius: 14, border: "1px solid rgba(0,229,160,0.3)", background: "rgba(0,229,160,0.05)", color: "#00e5a0", fontWeight: 800, fontSize: 16, cursor: "pointer" }}>
          グループを作成する
        </button>
      </div>
    </div>
  );
}

// ─── Join ─────────────────────────────────────────────────────────────────────
function JoinScreen({ onBack, onJoined, showToast }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("🏃");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const tryJoin = async () => {
    setLoading(true); setError("");
    try {
      // グループ検索
      const groups = await sb(`groups?passcode=eq.${code.trim().toUpperCase()}&select=*`);
      if (!groups.length) { setError("グループが見つかりませんでした"); setLoading(false); return; }
      const group = groups[0];
      // メンバー追加
      const [member] = await sb(`members`, {
        method: "POST",
        body: JSON.stringify({ group_id: group.id, name, avatar, steps: 0, goal: 10000, streak: 0 }),
      });
      onJoined(group, { ...member, isMe: true });
    } catch (e) {
      setError("エラーが発生しました。もう一度試してください");
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: 20, maxWidth: 440, margin: "0 auto" }}>
      <button onClick={onBack} style={backBtnStyle}>← 戻る</button>
      <h2 style={{ color: "#fff", fontWeight: 900, margin: "16px 0 4px" }}>グループに参加</h2>
      <p style={{ color: "#8899aa", fontSize: 13, marginBottom: 24 }}>パスコードで参加できます</p>
      {step === 1 && <>
        <Lbl>ニックネーム</Lbl>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="あなたの名前" style={iStyle} />
        <Lbl>アバター</Lbl>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
          {AVATARS.map(a => (
            <button key={a} onClick={() => setAvatar(a)} style={{ fontSize: 24, padding: "6px 9px", borderRadius: 10, cursor: "pointer", border: avatar === a ? "2px solid #00e5a0" : "1px solid rgba(255,255,255,0.1)", background: avatar === a ? "rgba(0,229,160,0.1)" : "rgba(255,255,255,0.03)" }}>{a}</button>
          ))}
        </div>
        <button onClick={() => setStep(2)} disabled={!name.trim()} style={{ ...primBtn, width: "100%", opacity: name.trim() ? 1 : 0.4 }}>次へ →</button>
      </>}
      {step === 2 && <>
        <Lbl>パスコード</Lbl>
        <input value={code} onChange={e => { setCode(e.target.value); setError(""); }}
          placeholder="例: STEP88" maxLength={10}
          style={{ ...iStyle, textTransform: "uppercase", letterSpacing: 4, fontSize: 22, fontWeight: 900 }} />
        {error && <div style={{ color: "#ff6688", fontSize: 12, marginTop: -10, marginBottom: 12 }}>{error}</div>}
        <button onClick={tryJoin} disabled={!code.trim() || loading} style={{ ...primBtn, width: "100%", opacity: code.trim() && !loading ? 1 : 0.4 }}>
          {loading ? "参加中..." : "参加する"}
        </button>
      </>}
    </div>
  );
}

// ─── Create ───────────────────────────────────────────────────────────────────
function CreateScreen({ onBack, onCreated }) {
  const [step, setStep] = useState(1);
  const [myName, setMyName] = useState("");
  const [avatar, setAvatar] = useState("🏃");
  const [groupName, setGroupName] = useState("");
  const [emoji, setEmoji] = useState("🌅");
  const [teamGoal, setTeamGoal] = useState("50000");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(null);
  const EMOJIS = ["🌅","🏢","🌿","🔥","⚡","🏆","🌊","🎯","🚀","💪"];

  const doCreate = async () => {
    setLoading(true);
    const passcode = Math.random().toString(36).slice(2, 6).toUpperCase() + Math.floor(Math.random() * 100);
    try {
      const [group] = await sb("groups", {
        method: "POST",
        body: JSON.stringify({ name: groupName, emoji, passcode, team_goal: parseInt(teamGoal) || 50000 }),
      });
      const [member] = await sb("members", {
        method: "POST",
        body: JSON.stringify({ group_id: group.id, name: myName, avatar, steps: 0, goal: 10000, streak: 0 }),
      });
      setCreated({ group, member: { ...member, isMe: true }, passcode });
    } catch (e) { alert("エラーが発生しました"); }
    setLoading(false);
  };

  if (created) return (
    <div style={{ padding: 20, maxWidth: 440, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 52, marginBottom: 8 }}>🎉</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>グループ作成完了！</div>
        <div style={{ color: "#8899aa", fontSize: 13, marginTop: 4 }}>パスコードを友達に共有しましょう</div>
      </div>
      <div style={{ background: "rgba(0,229,160,0.07)", border: "1px solid rgba(0,229,160,0.25)", borderRadius: 20, padding: 24, textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: "#00e5a0", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>パスコード</div>
        <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: 8, color: "#fff" }}>{created.passcode}</div>
        <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}><MiniQR code={created.passcode} size={130} /></div>
      </div>
      <button onClick={() => onCreated(created.group, created.member)} style={{ ...primBtn, width: "100%" }}>グループに入る →</button>
    </div>
  );

  return (
    <div style={{ padding: 20, maxWidth: 440, margin: "0 auto" }}>
      <button onClick={onBack} style={backBtnStyle}>← 戻る</button>
      <h2 style={{ color: "#fff", fontWeight: 900, margin: "16px 0 4px" }}>グループを作成</h2>
      <p style={{ color: "#8899aa", fontSize: 13, marginBottom: 24 }}>パスコードが自動発行されます</p>
      {step === 1 && <>
        <Lbl>ニックネーム</Lbl>
        <input value={myName} onChange={e => setMyName(e.target.value)} placeholder="ニックネーム" style={iStyle} />
        <Lbl>アバター</Lbl>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
          {AVATARS.map(a => (
            <button key={a} onClick={() => setAvatar(a)} style={{ fontSize: 24, padding: "6px 9px", borderRadius: 10, cursor: "pointer", border: avatar === a ? "2px solid #00e5a0" : "1px solid rgba(255,255,255,0.1)", background: avatar === a ? "rgba(0,229,160,0.1)" : "rgba(255,255,255,0.03)" }}>{a}</button>
          ))}
        </div>
        <button onClick={() => setStep(2)} disabled={!myName.trim()} style={{ ...primBtn, width: "100%", opacity: myName.trim() ? 1 : 0.4 }}>次へ →</button>
      </>}
      {step === 2 && <>
        <Lbl>グループ名</Lbl>
        <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="グループ名" style={iStyle} />
        <Lbl>アイコン</Lbl>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {EMOJIS.map(e => (
            <button key={e} onClick={() => setEmoji(e)} style={{ fontSize: 24, padding: "6px 9px", borderRadius: 10, cursor: "pointer", border: emoji === e ? "2px solid #4488ff" : "1px solid rgba(255,255,255,0.1)", background: emoji === e ? "rgba(68,136,255,0.1)" : "rgba(255,255,255,0.03)" }}>{e}</button>
          ))}
        </div>
        <Lbl>チーム目標歩数</Lbl>
        <input value={teamGoal} onChange={e => setTeamGoal(e.target.value)} type="number" style={iStyle} />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setStep(1)} style={{ ...outlineBtn, flex: 1 }}>← 戻る</button>
          <button onClick={doCreate} disabled={!groupName.trim() || loading} style={{ ...primBtn, flex: 2, opacity: groupName.trim() && !loading ? 1 : 0.4 }}>
            {loading ? "作成中..." : "作成する 🎉"}
          </button>
        </div>
      </>}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
function MainApp({ group, me, onLeave }) {
  const [members, setMembers] = useState([me]);
  const [posts, setPosts] = useState([]);
  const [tab, setTab] = useState("feed");
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const myData = members.find(m => m.isMe) || me;

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  // データ取得
  const fetchAll = async () => {
    const [mems, ps] = await Promise.all([
      sb(`members?group_id=eq.${group.id}&select=*&order=steps.desc`),
      sb(`posts?group_id=eq.${group.id}&select=*,comments(*)&order=created_at.desc`),
    ]);
    setMembers(mems.map(m => ({ ...m, isMe: m.id === me.id })));
    setPosts(ps.map(p => ({ ...p, reactions: p.reactions || {}, myReactions: {} })));
    setLoading(false);
  };

  useEffect(() => { fetchAll(); const t = setInterval(fetchAll, 10000); return () => clearInterval(t); }, []);

  const updateMySteps = async (steps) => {
    await sb(`members?id=eq.${me.id}`, { method: "PATCH", body: JSON.stringify({ steps }) });
    setMembers(prev => prev.map(m => m.isMe ? { ...m, steps } : m));
    showToast(`歩数を更新しました！`);
  };

  const updateMyGoal = async (goal) => {
    await sb(`members?id=eq.${me.id}`, { method: "PATCH", body: JSON.stringify({ goal }) });
    setMembers(prev => prev.map(m => m.isMe ? { ...m, goal } : m));
    showToast(`目標を変更しました！`);
  };

  const addPost = async (message) => {
    const [post] = await sb("posts", {
      method: "POST",
      body: JSON.stringify({ group_id: group.id, member_id: me.id, steps: myData.steps, goal: myData.goal, message, reactions: {} }),
    });
    setPosts(prev => [{ ...post, comments: [], myReactions: {} }, ...prev]);
    showToast("投稿しました！");
  };

  const addComment = async (postId, text) => {
    const [comment] = await sb("comments", {
      method: "POST",
      body: JSON.stringify({ post_id: postId, member_id: me.id, text }),
    });
    const enriched = { ...comment, authorName: myData.name, authorAvatar: myData.avatar };
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: [...(p.comments||[]), enriched] } : p));
    showToast("コメントしました！");
  };

  const toggleReaction = async (postId, emoji) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const already = p.myReactions[emoji];
      const reactions = { ...p.reactions };
      const myReactions = { ...p.myReactions };
      if (already) { reactions[emoji] = Math.max(0, (reactions[emoji]||0)-1); if (!reactions[emoji]) delete reactions[emoji]; delete myReactions[emoji]; }
      else { reactions[emoji] = (reactions[emoji]||0)+1; myReactions[emoji] = true; }
      sb(`posts?id=eq.${postId}`, { method: "PATCH", body: JSON.stringify({ reactions }) });
      return { ...p, reactions, myReactions };
    }));
  };

  const sorted = [...members].sort((a, b) => b.steps - a.steps);
  const teamTotal = members.reduce((s, m) => s + m.steps, 0);

  const TABS = [
    { id: "feed", icon: "📢", label: "フィード" },
    { id: "ranking", icon: "🏆", label: "ランキング" },
    { id: "me", icon: "👤", label: "マイデータ" },
    { id: "team", icon: "👥", label: "チーム" },
    { id: "invite", icon: "➕", label: "招待" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#080c14", fontFamily: "'Noto Sans JP',sans-serif", color: "#e8f0fe", paddingBottom: 80 }}>
      <div style={{ background: "linear-gradient(180deg,#0d1220,#080c14)", borderBottom: "1px solid rgba(0,229,160,0.12)", padding: "14px 14px 0" }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>{group.emoji}</span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}>{group.name}</div>
                <div style={{ fontSize: 10, color: "#00e5a0", letterSpacing: 1.5 }}>{members.length}人参加 · {group.passcode}</div>
              </div>
            </div>
            <button onClick={onLeave} style={{ fontSize: 10, padding: "4px 10px", borderRadius: 99, border: "1px solid #334455", background: "transparent", color: "#556677", cursor: "pointer" }}>退出</button>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#8899aa", marginBottom: 3 }}>
              <span>チーム {teamTotal.toLocaleString()}歩</span>
              <span style={{ color: "#aa88ff", fontWeight: 700 }}>{Math.round((teamTotal / group.team_goal) * 100)}% / 目標{group.team_goal?.toLocaleString()}</span>
            </div>
            <ProgressBar value={teamTotal} max={group.team_goal} color="#aa88ff" height={5} />
          </div>
          <div style={{ display: "flex", gap: 1 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, minWidth: 52, padding: "8px 2px", border: "none", borderRadius: "7px 7px 0 0", background: tab === t.id ? "#00e5a0" : "transparent", color: tab === t.id ? "#0b0f1a" : "#667788", fontWeight: tab === t.id ? 900 : 500, fontSize: 10, cursor: "pointer", whiteSpace: "nowrap" }}>{t.icon}<br />{t.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "14px 12px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#8899aa" }}>読み込み中...</div>
        ) : (<>
          {tab === "feed" && <FeedTab posts={posts} me={myData} members={members} onPost={addPost} onComment={addComment} onReact={toggleReaction} showToast={showToast} />}
          {tab === "ranking" && <RankingTab sorted={sorted} />}
          {tab === "me" && <MeTab member={myData} myRank={sorted.findIndex(m => m.isMe) + 1} total={members.length} showToast={showToast} onUpdateSteps={updateMySteps} onUpdateGoal={updateMyGoal} />}
          {tab === "team" && <TeamTab members={members} sorted={sorted} teamTotal={teamTotal} group={group} />}
          {tab === "invite" && <InviteTab group={group} showToast={showToast} />}
        </>)}
      </div>
      <Toast msg={toast} />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        input::placeholder{color:#445566}
        input::-webkit-outer-spin-button,input::-webkit-inner-spin-button{-webkit-appearance:none}
        @keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        @keyframes popIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
    </div>
  );
}

// ─── Feed ─────────────────────────────────────────────────────────────────────
function FeedTab({ posts, me, members, onPost, onComment, onReact, showToast }) {
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState("");
  const [openComments, setOpenComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});

  const doPost = async () => {
    if (!msg.trim() && me.steps === 0) return;
    await onPost(msg.trim());
    setMsg(""); setShowForm(false);
  };

  const getMemberInfo = (memberId) => members.find(m => m.id === memberId) || {};

  return (
    <div>
      {!showForm ? (
        <button onClick={() => setShowForm(true)} style={{ width: "100%", padding: "14px 16px", borderRadius: 16, marginBottom: 14, border: "1px dashed rgba(0,229,160,0.3)", background: "rgba(0,229,160,0.04)", color: "#8899aa", fontSize: 14, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 24 }}>{me?.avatar}</span>
          <span>今日の歩数を投稿する...</span>
          <span style={{ marginLeft: "auto", fontSize: 20 }}>✏️</span>
        </button>
      ) : (
        <div style={{ background: "rgba(0,229,160,0.06)", border: "1px solid rgba(0,229,160,0.25)", borderRadius: 16, padding: 16, marginBottom: 14, animation: "slideDown .2s ease" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 28 }}>{me?.avatar}</span>
            <div>
              <div style={{ fontWeight: 800, color: "#00e5a0" }}>{me?.name}</div>
              <div style={{ fontSize: 11, color: "#8899aa" }}>{me?.steps.toLocaleString()}歩 · 達成率{Math.round((me.steps/me.goal)*100)}%</div>
            </div>
          </div>
          <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 12, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "#8899aa", marginBottom: 3 }}>本日の歩数</div>
              <ProgressBar value={me?.steps || 0} max={me?.goal || 10000} color="#00e5a0" height={6} />
            </div>
            <div style={{ fontWeight: 900, fontSize: 20, color: "#00e5a0" }}>{me?.steps.toLocaleString()}<span style={{ fontSize: 11, color: "#556677", marginLeft: 2 }}>歩</span></div>
          </div>
          <textarea value={msg} onChange={e => setMsg(e.target.value)} placeholder="ひとことメッセージ（任意）" rows={2}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: 14, resize: "none", outline: "none", fontFamily: "inherit", marginBottom: 10 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setShowForm(false); setMsg(""); }} style={{ ...outlineBtn, flex: 1, padding: "11px" }}>キャンセル</button>
            <button onClick={doPost} style={{ ...primBtn, flex: 2, padding: "11px" }}>投稿する 📢</button>
          </div>
        </div>
      )}

      {posts.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "#556677" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📢</div>
          <div>まだ投稿がありません。最初の投稿をしてみましょう！</div>
        </div>
      )}

      {posts.map(post => {
        const author = getMemberInfo(post.member_id);
        const pct = Math.min(100, Math.round((post.steps / post.goal) * 100));
        const totalReactions = Object.values(post.reactions || {}).reduce((s, v) => s + v, 0);
        const commentsOpen = !!openComments[post.id];

        return (
          <div key={post.id} style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, padding: 16, marginBottom: 12, animation: "popIn .3s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 30 }}>{author.avatar || post.member_avatar || "🏃"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, color: "#ddeeff", fontSize: 15 }}>{author.name || "メンバー"}</div>
                <div style={{ fontSize: 11, color: "#556677" }}>{new Date(post.created_at).toLocaleString("ja-JP", { month:"numeric", day:"numeric", hour:"2-digit", minute:"2-digit" })}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: pct >= 100 ? "#ffcc00" : "#00e5a0" }}>{post.steps.toLocaleString()}</div>
                <div style={{ fontSize: 10, color: "#556677" }}>/ {post.goal.toLocaleString()}歩</div>
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <ProgressBar value={post.steps} max={post.goal} color={pct >= 100 ? "#ffcc00" : "#00e5a0"} height={7} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#445566", marginTop: 3 }}>
                <span>達成率 {pct}%</span>
                {pct >= 100 && <span style={{ color: "#ffcc00", fontWeight: 700 }}>🎉 目標達成！</span>}
              </div>
            </div>
            {post.message && (
              <div style={{ fontSize: 14, color: "#ccddef", lineHeight: 1.6, marginBottom: 12, padding: "10px 12px", background: "rgba(255,255,255,0.04)", borderRadius: 10 }}>{post.message}</div>
            )}
            {totalReactions > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                {Object.entries(post.reactions || {}).filter(([, v]) => v > 0).map(([emoji, count]) => (
                  <span key={emoji} onClick={() => onReact(post.id, emoji)} style={{ fontSize: 12, padding: "3px 8px", borderRadius: 99, background: post.myReactions?.[emoji] ? "rgba(0,229,160,0.15)" : "rgba(255,255,255,0.05)", border: post.myReactions?.[emoji] ? "1px solid rgba(0,229,160,0.3)" : "1px solid rgba(255,255,255,0.08)", color: post.myReactions?.[emoji] ? "#00e5a0" : "#aabbcc", cursor: "pointer" }}>{emoji} {count}</span>
                ))}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 0, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10, marginTop: 2 }}>
              <div style={{ display: "flex", gap: 4, flex: 1, flexWrap: "wrap" }}>
                {REACTION_EMOJIS.map(emoji => (
                  <button key={emoji} onClick={() => onReact(post.id, emoji)} style={{ fontSize: 16, padding: "5px 7px", borderRadius: 8, border: "none", cursor: "pointer", background: post.myReactions?.[emoji] ? "rgba(0,229,160,0.18)" : "rgba(255,255,255,0.04)", transition: "transform 0.1s" }}>{emoji}</button>
                ))}
              </div>
              <button onClick={() => setOpenComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#8899aa", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontWeight: 600, whiteSpace: "nowrap" }}>
                💬 {(post.comments || []).length}
              </button>
            </div>
            {commentsOpen && (
              <div style={{ marginTop: 12, animation: "slideDown .2s ease" }}>
                {(post.comments || []).map(c => (
                  <div key={c.id} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 18 }}>{c.authorAvatar || getMemberInfo(c.member_id)?.avatar || "🏃"}</span>
                    <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "8px 12px", flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#aabbcc", marginBottom: 2 }}>
                        {c.authorName || getMemberInfo(c.member_id)?.name || "メンバー"}
                        <span style={{ color: "#445566", fontWeight: 400, marginLeft: 6 }}>
                          {new Date(c.created_at).toLocaleString("ja-JP", { month:"numeric", day:"numeric", hour:"2-digit", minute:"2-digit" })}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: "#ccddef" }}>{c.text}</div>
                    </div>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <span style={{ fontSize: 22 }}>{me?.avatar}</span>
                  <div style={{ flex: 1, display: "flex", gap: 6 }}>
                    <input value={commentInputs[post.id] || ""} onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                      placeholder="コメントを入力..."
                      onKeyDown={e => { if (e.key === "Enter") { onComment(post.id, commentInputs[post.id] || ""); setCommentInputs(prev => ({ ...prev, [post.id]: "" })); } }}
                      style={{ ...iStyle, flex: 1, marginBottom: 0, padding: "9px 12px", fontSize: 13 }} />
                    <button onClick={() => { onComment(post.id, commentInputs[post.id] || ""); setCommentInputs(prev => ({ ...prev, [post.id]: "" })); }}
                      disabled={!(commentInputs[post.id] || "").trim()}
                      style={{ ...primBtn, padding: "9px 14px", fontSize: 13, opacity: (commentInputs[post.id] || "").trim() ? 1 : 0.4 }}>送信</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Ranking ──────────────────────────────────────────────────────────────────
function RankingTab({ sorted }) {
  return (
    <div>
      <div style={{ color: "#556677", fontSize: 12, marginBottom: 12 }}>本日のランキング</div>
      {sorted.map((member, i) => {
        const rank = i + 1;
        const rankIcon = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank;
        const badges = getBadges(member);
        return (
          <div key={member.id} style={{ background: member.isMe ? "linear-gradient(135deg,rgba(0,229,160,0.1),rgba(0,180,120,0.05))" : "rgba(255,255,255,0.025)", border: member.isMe ? "1px solid rgba(0,229,160,0.3)" : "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: "12px 14px", marginBottom: 8, transform: member.isMe ? "scale(1.01)" : "scale(1)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 30, textAlign: "center", fontSize: rank <= 3 ? 20 : 13, fontWeight: 800, color: "#556677" }}>{rankIcon}</div>
              <div style={{ fontSize: 26 }}>{member.avatar}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: member.isMe ? "#00e5a0" : "#ddeeff" }}>{member.name}</span>
                  {member.isMe && <span style={{ fontSize: 9, background: "#00e5a022", color: "#00e5a0", padding: "1px 5px", borderRadius: 99, fontWeight: 700 }}>YOU</span>}
                  {badges.slice(-2).map(b => <span key={b.id} style={{ fontSize: 13 }}>{b.icon}</span>)}
                </div>
                <ProgressBar value={member.steps} max={member.goal} color={member.isMe ? "#00e5a0" : "#4477ff"} height={6} />
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 17, fontWeight: 900, color: member.isMe ? "#00e5a0" : "#fff" }}>{member.steps.toLocaleString()}</div>
                <div style={{ fontSize: 10, color: "#445566" }}>/ {member.goal.toLocaleString()}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Me ───────────────────────────────────────────────────────────────────────
function MeTab({ member, myRank, total, showToast, onUpdateSteps, onUpdateGoal }) {
  const [addVal, setAddVal] = useState("");
  const [goalVal, setGoalVal] = useState("");
  const badges = getBadges(member);
  const pct = Math.min(100, (member.steps / member.goal) * 100);

  const doAdd = async () => { const n = parseInt(addVal); if (!n || n <= 0) { showToast("正しい数値を入力してください"); return; } await onUpdateSteps(member.steps + n); setAddVal(""); };
  const doGoal = async () => { const n = parseInt(goalVal); if (!n || n <= 0) { showToast("正しい数値を入力してください"); return; } await onUpdateGoal(n); setGoalVal(""); };

  return (
    <div>
      <div style={{ background: "linear-gradient(135deg,rgba(0,229,160,0.1),rgba(0,100,70,0.06))", border: "1px solid rgba(0,229,160,0.25)", borderRadius: 20, padding: 18, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <span style={{ fontSize: 42 }}>{member.avatar}</span>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#00e5a0" }}>{member.name}</div>
            <div style={{ color: "#8899aa", fontSize: 11 }}>ランク {myRank}位 / {total}人中</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          {[
            { label: "本日の歩数", v: member.steps.toLocaleString(), u: "歩", c: "#00e5a0" },
            { label: "目標歩数", v: member.goal.toLocaleString(), u: "歩", c: "#4488ff" },
            { label: "達成率", v: `${Math.round(pct)}`, u: "%", c: pct >= 100 ? "#ffcc00" : "#ff8844" },
            { label: "残り", v: Math.max(0, member.goal - member.steps).toLocaleString(), u: "歩", c: "#aa88ff" },
          ].map(s => (
            <div key={s.label} style={{ background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 10, color: "#8899aa", marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: s.c }}>{s.v}<span style={{ fontSize: 11, marginLeft: 1 }}>{s.u}</span></div>
            </div>
          ))}
        </div>
        <ProgressBar value={member.steps} max={member.goal} color="#00e5a0" height={10} />
        {member.steps >= member.goal && <div style={{ marginTop: 8, textAlign: "center", fontSize: 13, color: "#ffcc00", fontWeight: 800 }}>🎉 目標達成！</div>}
      </div>
      <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 14, marginBottom: 10 }}>
        <div style={{ fontWeight: 700, color: "#aabbcc", fontSize: 12, marginBottom: 8 }}>📱 歩数を追加</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={addVal} onChange={e => setAddVal(e.target.value)} type="number" placeholder="追加する歩数" onKeyDown={e => e.key === "Enter" && doAdd()} style={{ ...iStyle, flex: 1, marginBottom: 0 }} />
          <button onClick={doAdd} style={{ ...primBtn, padding: "11px 16px" }}>追加</button>
        </div>
      </div>
      <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 14, marginBottom: 10 }}>
        <div style={{ fontWeight: 700, color: "#aabbcc", fontSize: 12, marginBottom: 8 }}>🎯 目標を変更</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={goalVal} onChange={e => setGoalVal(e.target.value)} type="number" placeholder={`現在: ${member.goal.toLocaleString()}歩`} style={{ ...iStyle, flex: 1, marginBottom: 0 }} />
          <button onClick={doGoal} style={{ padding: "11px 16px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#4488ff,#2255dd)", color: "#fff", fontWeight: 800, cursor: "pointer" }}>変更</button>
        </div>
      </div>
      <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 14 }}>
        <div style={{ fontWeight: 700, color: "#aabbcc", fontSize: 12, marginBottom: 10 }}>🏅 バッジ</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
          {BADGE_DEFS.map(b => {
            const earned = badges.some(mb => mb.id === b.id);
            return (
              <div key={b.id} style={{ padding: "9px 11px", borderRadius: 11, display: "flex", gap: 8, alignItems: "center", background: earned ? "rgba(255,204,0,0.08)" : "rgba(255,255,255,0.02)", border: earned ? "1px solid rgba(255,204,0,0.25)" : "1px solid rgba(255,255,255,0.05)", opacity: earned ? 1 : 0.4 }}>
                <span style={{ fontSize: 20 }}>{b.icon}</span>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: earned ? "#ffcc00" : "#556677" }}>{b.label}</div>
                  <div style={{ fontSize: 10, color: "#445566" }}>{b.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Team ─────────────────────────────────────────────────────────────────────
function TeamTab({ members, sorted, teamTotal, group }) {
  return (
    <div>
      <div style={{ background: "linear-gradient(135deg,rgba(170,136,255,0.1),rgba(100,80,200,0.06))", border: "1px solid rgba(170,136,255,0.25)", borderRadius: 20, padding: 18, marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "#aa88ff", fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 5 }}>チーム合計</div>
        <div style={{ fontSize: 38, fontWeight: 900, color: "#fff", letterSpacing: "-1px" }}>{teamTotal.toLocaleString()}<span style={{ fontSize: 14, color: "#8899aa", marginLeft: 4 }}>歩</span></div>
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#8899aa", marginBottom: 4 }}>
            <span>目標: {group.team_goal?.toLocaleString()}歩</span>
            <span style={{ color: "#aa88ff", fontWeight: 700 }}>{Math.round((teamTotal / group.team_goal) * 100)}%</span>
          </div>
          <ProgressBar value={teamTotal} max={group.team_goal} color="#aa88ff" height={10} />
        </div>
        {teamTotal >= group.team_goal && <div style={{ marginTop: 10, textAlign: "center", fontWeight: 900, color: "#ffcc00", fontSize: 15 }}>🎊 チーム目標達成！！</div>}
      </div>
      {sorted.map(m => {
        const contrib = teamTotal > 0 ? (m.steps / teamTotal) * 100 : 0;
        return (
          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.025)", borderRadius: 12, padding: "10px 12px", marginBottom: 7 }}>
            <span style={{ fontSize: 22 }}>{m.avatar}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: m.isMe ? "#00e5a0" : "#ddeeff" }}>{m.name}</span>
                <span style={{ fontSize: 11, color: "#aa88ff", fontWeight: 700 }}>{contrib.toFixed(1)}%</span>
              </div>
              <ProgressBar value={m.steps} max={teamTotal} color="#aa88ff" height={5} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#aabbcc", minWidth: 52, textAlign: "right" }}>{m.steps.toLocaleString()}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Invite ───────────────────────────────────────────────────────────────────
function InviteTab({ group, showToast }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(group.passcode).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); showToast("コピーしました！"); };
  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <div style={{ fontSize: 11, color: "#8899aa", marginBottom: 4, letterSpacing: 2, textTransform: "uppercase" }}>グループコード</div>
        <div style={{ fontSize: 42, fontWeight: 900, letterSpacing: 7, color: "#fff" }}>{group.passcode}</div>
      </div>
      <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, padding: 22, textAlign: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}><MiniQR code={group.passcode} size={170} /></div>
        <div style={{ fontSize: 11, color: "#556677" }}>スキャンして参加</div>
      </div>
      <button onClick={copy} style={{ ...primBtn, width: "100%", marginBottom: 10, background: copied ? "rgba(0,229,160,0.15)" : "linear-gradient(135deg,#00e5a0,#00b87a)", color: copied ? "#00e5a0" : "#0b0f1a", border: copied ? "1px solid rgba(0,229,160,0.4)" : "none" }}>
        {copied ? "✅ コピーしました！" : "📋 パスコードをコピー"}
      </button>
      <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 13, padding: 14 }}>
        <div style={{ fontSize: 11, color: "#8899aa", marginBottom: 7 }}>参加方法</div>
        <div style={{ fontSize: 12, color: "#aabbcc", lineHeight: 2 }}>
          1. StepWars を開く<br />
          2. 「グループに参加する」をタップ<br />
          3. パスコード <span style={{ color: "#00e5a0", fontWeight: 800, letterSpacing: 2 }}>{group.passcode}</span> を入力<br />
          4. 参加完了！
        </div>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("welcome");
  const [group, setGroup] = useState(null);
  const [me, setMe] = useState(null);
  const [toast, setToast] = useState(null);
  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  return (
    <div style={{ background: "#080c14", minHeight: "100vh", fontFamily: "'Noto Sans JP',sans-serif" }}>
      {screen === "welcome" && <WelcomeScreen onJoin={() => setScreen("join")} onCreate={() => setScreen("create")} />}
      {screen === "join" && <JoinScreen onBack={() => setScreen("welcome")} onJoined={(g, m) => { setGroup(g); setMe(m); setScreen("app"); }} showToast={showToast} />}
      {screen === "create" && <CreateScreen onBack={() => setScreen("welcome")} onCreated={(g, m) => { setGroup(g); setMe(m); setScreen("app"); }} />}
      {screen === "app" && group && me && <MainApp group={group} me={me} onLeave={() => { setGroup(null); setMe(null); setScreen("welcome"); }} />}
      <Toast msg={toast} />
    </div>
  );
}
