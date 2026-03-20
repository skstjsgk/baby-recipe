import { useState, useRef, useEffect, useCallback } from "react";

const SUPABASE_URL = "https://qkdorvgmqfruqpbpkmnm.supabase.co";
const SUPABASE_KEY = "qkdorvgmqfruqpbpkmnm";

const sbGet = async (key) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/shared_data?key=eq.${encodeURIComponent(key)}&select=value`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  });
  const data = await res.json();
  return data?.[0]?.value ? JSON.parse(data[0].value) : null;
};

const sbSet = async (key, value) => {
  await fetch(`${SUPABASE_URL}/rest/v1/shared_data`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ key, value: JSON.stringify(value), updated_at: new Date().toISOString() })
  });
};

const SYSTEM_PROMPT = `당신은 유아식 전문 영양사이자 요리사입니다. 주어진 조건에 맞는 유아식 레시피 5개를 추천해주세요.

반드시 아래 형식을 정확히 지켜서 답하세요.

===RECIPE_START===
이름: (레시피 이름)
이모지: (음식 이모지 1개)
월령: (예: 9개월+)
시간: (예: 15분)
난이도: 쉬움 또는 보통 또는 어려움
카테고리: 밥 또는 국 또는 메인요리 또는 반찬 또는 간식 또는 디저트
사용재료: (쉼표로 구분)
추가재료: (없으면 없음)
영양: (주요 영양소 한 줄)
단계1: (조리 단계)
단계2: (조리 단계)
단계3: (조리 단계)
단계4: (있으면 추가, 없으면 생략)
단계5: (있으면 추가, 없으면 생략)
단계6: (있으면 추가, 없으면 생략)
단계7: (있으면 추가, 없으면 생략)
단계8: (있으면 추가, 없으면 생략)
단계9: (있으면 추가, 없으면 생략)
단계10: (있으면 추가, 없으면 생략)
팁: (유아식 조리 팁)
===RECIPE_END===

규칙:
- 유아 안전 최우선 (소금/설탕 최소화, 알레르기 주의)
- 지정된 개월수에 맞는 식감, 크기, 조리법 적용
- 한식뿐 아니라 양식도 포함하여 다양하게 추천
- 지정된 카테고리에 맞는 레시피만 추천
- 단계가 적을 경우 억지로 늘리지 말고 필요한 만큼만 작성
- 단계에 "없음" 이라고 쓰지 마세요 — 해당 단계 자체를 생략하세요
- 위 형식 외 다른 텍스트 없이 답하세요`;

const AI_SEARCH_PROMPT = `당신은 유아식 전문 영양사이자 요리사입니다. 사용자의 검색어를 바탕으로 유아식 레시피 5개를 추천해주세요.

반드시 아래 형식을 정확히 지켜서 답하세요.

===RECIPE_START===
이름: (레시피 이름)
이모지: (음식 이모지 1개)
월령: (예: 9개월+)
시간: (예: 15분)
난이도: 쉬움 또는 보통 또는 어려움
카테고리: 밥 또는 국 또는 메인요리 또는 반찬 또는 간식 또는 디저트
사용재료: (쉼표로 구분)
추가재료: (없으면 없음)
영양: (주요 영양소 한 줄)
단계1: (조리 단계)
단계2: (조리 단계)
단계3: (조리 단계)
단계4: (있으면 추가, 없으면 생략)
단계5: (있으면 추가, 없으면 생략)
단계6: (있으면 추가, 없으면 생략)
단계7: (있으면 추가, 없으면 생략)
단계8: (있으면 추가, 없으면 생략)
단계9: (있으면 추가, 없으면 생략)
단계10: (있으면 추가, 없으면 생략)
팁: (유아식 조리 팁)
===RECIPE_END===

규칙:
- 유아 안전 최우선 (소금/설탕 최소화, 알레르기 주의)
- 검색어와 관련된 레시피를 최대한 다양하게 추천
- 한식뿐 아니라 양식도 포함하여 다양하게 추천
- 단계가 적을 경우 억지로 늘리지 말고 필요한 만큼만 작성
- 단계에 "없음" 이라고 쓰지 마세요 — 해당 단계 자체를 생략하세요
- 위 형식 외 다른 텍스트 없이 답하세요`;

const MEAL_PLAN_PROMPT = `당신은 유아식 전문 영양사입니다. 주어진 음식 재고를 기반으로 식단을 짜주세요.

반드시 아래 형식을 정확히 지켜서 답하세요.

===DAY_START===
일차: (숫자)
아침: (음식 재고에서 선택, 없으면 빈칸)
아침간식: (음식 재고에서 선택, 없으면 빈칸)
점심: (음식 재고에서 선택, 없으면 빈칸)
점심간식: (음식 재고에서 선택, 없으면 빈칸)
저녁: (음식 재고에서 선택, 없으면 빈칸)
===DAY_END===

규칙:
- 반드시 제공된 음식 재고 목록에 있는 음식만 사용하세요
- 영양 균형을 고려해서 짜주세요 (탄수화물, 단백질, 채소 골고루)
- 같은 음식이 하루에 두 번 이상 나오지 않게 해주세요
- 재고가 부족하면 해당 칸은 비워두세요
- 위 형식 외 다른 텍스트 없이 답하세요`;

const FOOD_CATS = ["밥", "국", "메인요리", "반찬", "간식", "디저트"];
const CAT_EMOJI = { "밥": "🍚", "국": "🍲", "메인요리": "🍳", "반찬": "🥗", "간식": "🧆", "디저트": "🍮" };
const CAT_COLOR = { "밥": { bg: "#e8f5e9", border: "#a5d6a7", text: "#2e7d32" }, "국": { bg: "#e3f2fd", border: "#90caf9", text: "#1565c0" }, "메인요리": { bg: "#fff3e0", border: "#ffcc80", text: "#e65100" }, "반찬": { bg: "#f3e5f5", border: "#ce93d8", text: "#6a1b9a" }, "간식": { bg: "#fce4ec", border: "#f48fb1", text: "#880e4f" }, "디저트": { bg: "#fff8e1", border: "#ffe082", text: "#f57f17" } };

const DEFAULT_FRIDGE = ["달걀", "두부", "당근", "애호박", "브로콜리", "우유"];
const DEFAULT_PANTRY = ["밥", "파스타", "감자", "고구마", "양파", "올리브오일"];
const DEFAULT_FOCUS  = ["닭고기", "소고기"];
const SK = { FRIDGE: "b_fridgeIngredients", PANTRY: "b_pantryIngredients", FOCUS: "b_focusIngredients", STOCK: "b_foodStock", PLANS: "b_mealPlans", SAVED_RECIPES: "b_savedRecipes" };

function SearchBar({ value, onChange, placeholder }) {
  return (
    <div style={{ position: "relative", marginBottom: 12 }}>
      <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16, pointerEvents: "none" }}>🔍</span>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", border: "1.5px solid #ffe0b2", borderRadius: 12, padding: "10px 12px 10px 36px", fontSize: 14, color: "#5d4037", outline: "none", fontFamily: "inherit", background: "#fffdf9" }} />
      {value && <button onClick={() => onChange("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#bcaaa4", fontSize: 16, lineHeight: 1 }}>×</button>}
    </div>
  );
}

function FilterChips({ label, options, selected, onToggle, colorMap }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 12, color: "#a1887f", fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {options.map(opt => {
          const active = selected.includes(opt);
          const c = colorMap?.[opt];
          return (
            <button key={opt} onClick={() => onToggle(opt)}
              style={{ padding: "5px 12px", borderRadius: 20, border: "1.5px solid", borderColor: active ? (c?.text || "#ff8f00") : "#e0e0e0", background: active ? (c?.bg || "#fff3e0") : "white", color: active ? (c?.text || "#e65100") : "#9e9e9e", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function BabyRecipeApp() {
  const [tab, setTab] = useState("recipe");
  const [recipes, setRecipes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [babyAge, setBabyAge] = useState(20);
  const [category, setCategory] = useState("전체");
  const [fridgeItems, setFridgeItems] = useState(DEFAULT_FRIDGE);
  const [pantryItems, setPantryItems] = useState(DEFAULT_PANTRY);
  const [focusItems, setFocusItems] = useState(DEFAULT_FOCUS);
  const [activeSection, setActiveSection] = useState("fridge");
  const [editMode, setEditMode] = useState(false);
  const [newIngInput, setNewIngInput] = useState("");
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [recipeView, setRecipeView] = useState("search");
  const [justSaved, setJustSaved] = useState({});
  const [addedToStock, setAddedToStock] = useState({});
  const [syncStatus, setSyncStatus] = useState("idle"); // idle | syncing | synced | error
  const isComposing = useRef(false);

  const [aiSearchQuery, setAiSearchQuery] = useState("");
  const [aiSearchAge, setAiSearchAge] = useState(20);
  const [aiSearchResults, setAiSearchResults] = useState(null);
  const [aiSearchLoading, setAiSearchLoading] = useState(false);
  const [aiSearchError, setAiSearchError] = useState(null);
  const [aiSelectedRecipe, setAiSelectedRecipe] = useState(null);
  const [aiJustSaved, setAiJustSaved] = useState({});
  const [aiAddedToStock, setAiAddedToStock] = useState({});
  const aiIsComposing = useRef(false);

  const [savedSearch, setSavedSearch] = useState("");
  const [savedFilterCat, setSavedFilterCat] = useState([]);
  const [savedFilterDiff, setSavedFilterDiff] = useState([]);

  const [foodStock, setFoodStock] = useState({ 밥: [], 국: [], 메인요리: [], 반찬: [], 간식: [], 디저트: [] });
  const [stockCat, setStockCat] = useState("밥");
  const [stockInput, setStockInput] = useState("");
  const stockIsComposing = useRef(false);

  const [planDays, setPlanDays] = useState(3);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState(null);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [savedPlans, setSavedPlans] = useState([]);
  const [viewingPlan, setViewingPlan] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [editCellVal, setEditCellVal] = useState("");

  useEffect(() => {
    (async () => {
      setSyncStatus("syncing");
      try {
        const load = async (k, def) => { try { const v = await sbGet(k); return v ?? def; } catch { return def; } };
        setFridgeItems(await load(SK.FRIDGE, DEFAULT_FRIDGE));
        setPantryItems(await load(SK.PANTRY, DEFAULT_PANTRY));
        setFocusItems(await load(SK.FOCUS, DEFAULT_FOCUS));
        setFoodStock(await load(SK.STOCK, { 밥: [], 국: [], 메인요리: [], 반찬: [], 간식: [], 디저트: [] }));
        setSavedPlans(await load(SK.PLANS, []));
        setSavedRecipes(await load(SK.SAVED_RECIPES, []));
        setSyncStatus("synced");
      } catch { setSyncStatus("error"); }
    })();
  }, []);

  const save = useCallback(async (k, v) => {
    setSyncStatus("syncing");
    try { await sbSet(k, v); setSyncStatus("synced"); }
    catch { setSyncStatus("error"); }
  }, []);

  const currentItems = activeSection === "fridge" ? fridgeItems : activeSection === "pantry" ? pantryItems : focusItems;
  const setCurrentItems = useCallback((list) => {
    if (activeSection === "fridge")      { setFridgeItems(list); save(SK.FRIDGE, list); }
    else if (activeSection === "pantry") { setPantryItems(list); save(SK.PANTRY, list); }
    else                                 { setFocusItems(list);  save(SK.FOCUS,  list); }
  }, [activeSection, save]);

  const commitAddIng = useCallback((val) => {
    const t = val.trim(); if (!t || currentItems.includes(t)) return;
    setCurrentItems([...currentItems, t]); setNewIngInput("");
  }, [currentItems, setCurrentItems]);

  const addFocusItem = (item) => {
    if (focusItems.includes(item)) return;
    const u = [...focusItems, item]; setFocusItems(u); save(SK.FOCUS, u);
  };

  const doSaveRecipe = (recipe, setJustSavedFn, idx) => {
    if (savedRecipes.some(s => s.name === recipe.name)) return;
    const updated = [{ ...recipe, savedAt: new Date().toLocaleDateString("ko-KR") }, ...savedRecipes];
    setSavedRecipes(updated); save(SK.SAVED_RECIPES, updated);
    setJustSavedFn(prev => ({ ...prev, [idx]: true }));
    setTimeout(() => setJustSavedFn(prev => { const n = { ...prev }; delete n[idx]; return n; }), 2000);
  };

  const doAddToStock = (recipe, setAddedFn, idx) => {
    const cat = recipe.category || "메인요리";
    if (!FOOD_CATS.includes(cat) || foodStock[cat]?.includes(recipe.name)) return;
    const updated = { ...foodStock, [cat]: [...(foodStock[cat] || []), recipe.name] };
    setFoodStock(updated); save(SK.STOCK, updated);
    setAddedFn(prev => ({ ...prev, [idx]: true }));
    setTimeout(() => setAddedFn(prev => { const n = { ...prev }; delete n[idx]; return n; }), 2000);
  };

  const deleteSavedRecipe = (name) => {
    const updated = savedRecipes.filter(r => r.name !== name);
    setSavedRecipes(updated); save(SK.SAVED_RECIPES, updated);
  };

  const commitAddStock = useCallback((val) => {
    const t = val.trim(); if (!t || foodStock[stockCat]?.includes(t)) return;
    const u = { ...foodStock, [stockCat]: [...(foodStock[stockCat] || []), t] };
    setFoodStock(u); save(SK.STOCK, u); setStockInput("");
  }, [foodStock, stockCat, save]);

  const removeStock = (cat, item) => {
    const u = { ...foodStock, [cat]: foodStock[cat].filter(i => i !== item) };
    setFoodStock(u); save(SK.STOCK, u);
  };

  const totalStock = Object.values(foodStock).flat().length;

  const parseRecipes = (text, fallbackItems = []) => {
    return text.split("===RECIPE_START===").slice(1).map(block => {
      const get = (key) => { const m = block.match(new RegExp(key + ":\\s*(.+)")); return m ? m[1].trim() : ""; };
      const steps = [];
      for (let i = 1; i <= 10; i++) { const s = get("단계" + i); if (s && s !== "없음") steps.push(s); }
      const rawUsed = get("사용재료"), rawExtra = get("추가재료"), cat = get("카테고리");
      return {
        name: get("이름"), emoji: get("이모지") || "🍽", age: get("월령"), time: get("시간"),
        difficulty: get("난이도"), category: FOOD_CATS.includes(cat) ? cat : "메인요리",
        usedIngredients: rawUsed ? rawUsed.split(/,|，/).map(s => s.trim()).filter(Boolean) : fallbackItems,
        additionalIngredients: (rawExtra && rawExtra !== "없음") ? rawExtra.split(/,|，/).map(s => s.trim()).filter(Boolean) : [],
        nutrition: get("영양"), steps, tip: get("팁")
      };
    }).filter(r => r.name);
  };

  const parsePlan = (text) => {
    return text.split("===DAY_START===").slice(1).map(block => {
      const get = (key) => { const m = block.match(new RegExp(key + ":\\s*(.+)")); return m ? m[1].trim() : ""; };
      return { day: get("일차"), 아침: get("아침"), 아침간식: get("아침간식"), 점심: get("점심"), 점심간식: get("점심간식"), 저녁: get("저녁") };
    }).filter(d => d.day);
  };

  const callClaude = async (system, userPrompt) => {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 4000, system, messages: [{ role: "user", content: userPrompt }] })
    });
    const data = await res.json();
    return data.content?.map(b => b.text || "").join("") || "";
  };

  const fetchRecipes = async () => {
    if (!fridgeItems.length && !pantryItems.length && !focusItems.length) return;
    setLoading(true); setError(null); setRecipes(null); setSelectedRecipe(null); setJustSaved({}); setAddedToStock({});
    try {
      const catText = category === "전체" ? "모든 종류" : category;
      const prompt = "조건:\n- 아이 개월수: " + babyAge + "개월\n- 카테고리: " + catText +
        (fridgeItems.length ? "\n- 냉장고: " + fridgeItems.join(", ") : "") +
        (pantryItems.length ? "\n- 팬트리: " + pantryItems.join(", ") : "") +
        (focusItems.length  ? "\n- 특히 이 재료로 만들고 싶어요: " + focusItems.join(", ") : "") +
        "\n\n위 조건에 맞는 유아식 레시피를 추천해주세요.";
      const text = await callClaude(SYSTEM_PROMPT, prompt);
      const parsed = parseRecipes(text, [...fridgeItems, ...pantryItems, ...focusItems]);
      if (!parsed.length) throw new Error("레시피를 찾지 못했어요. 다시 시도해주세요.");
      setRecipes(parsed); setSelectedRecipe(0);
    } catch (err) { setError("오류: " + (err?.message || String(err))); }
    finally { setLoading(false); }
  };

  const fetchAiSearch = async () => {
    if (!aiSearchQuery.trim()) return;
    setAiSearchLoading(true); setAiSearchError(null); setAiSearchResults(null); setAiSelectedRecipe(null); setAiJustSaved({}); setAiAddedToStock({});
    try {
      const prompt = `아이 개월수: ${aiSearchAge}개월\n검색어: ${aiSearchQuery}\n\n위 검색어와 관련된 유아식 레시피 5개를 추천해주세요.`;
      const text = await callClaude(AI_SEARCH_PROMPT, prompt);
      const parsed = parseRecipes(text);
      if (!parsed.length) throw new Error("검색 결과를 찾지 못했어요. 다시 시도해주세요.");
      setAiSearchResults(parsed); setAiSelectedRecipe(0);
    } catch (err) { setAiSearchError("오류: " + (err?.message || String(err))); }
    finally { setAiSearchLoading(false); }
  };

  const fetchPlan = async () => {
    if (totalStock === 0) { setPlanError("음식 재고가 없어요!"); return; }
    setPlanLoading(true); setPlanError(null); setCurrentPlan(null); setViewingPlan(null);
    try {
      const stockLines = FOOD_CATS.map(c => foodStock[c]?.length ? `- ${c}: ${foodStock[c].join(", ")}` : null).filter(Boolean).join("\n");
      const prompt = `현재 음식 재고:\n${stockLines}\n\n아이 개월수: ${babyAge}개월\n요청 일수: ${planDays}일\n\n위 재고를 활용해서 ${planDays}일치 식단을 짜주세요.`;
      const text = await callClaude(MEAL_PLAN_PROMPT, prompt);
      const parsed = parsePlan(text);
      if (!parsed.length) throw new Error("식단을 생성하지 못했어요.");
      setCurrentPlan(parsed);
    } catch (err) { setPlanError("오류: " + (err?.message || String(err))); }
    finally { setPlanLoading(false); }
  };

  const savePlan = () => {
    if (!currentPlan) return;
    const p = { id: Date.now(), date: new Date().toLocaleDateString("ko-KR"), days: planDays, plan: currentPlan };
    const updated = [p, ...savedPlans]; setSavedPlans(updated); save(SK.PLANS, updated);
    alert("식단이 저장되었어요! 💾");
  };

  const deleteSavedPlan = (id) => {
    const updated = savedPlans.filter(p => p.id !== id); setSavedPlans(updated); save(SK.PLANS, updated);
    if (viewingPlan?.id === id) setViewingPlan(null);
  };

  const startEditCell = (di, slot, val) => { setEditingCell({ dayIdx: di, slot }); setEditCellVal(val); };
  const commitEditCell = () => {
    if (!editingCell || !currentPlan) return;
    setCurrentPlan(currentPlan.map((d, i) => i === editingCell.dayIdx ? { ...d, [editingCell.slot]: editCellVal } : d));
    setEditingCell(null);
  };

  const filteredSaved = savedRecipes.filter(r => {
    const q = savedSearch.toLowerCase();
    const matchText = !q || r.name.toLowerCase().includes(q) ||
      r.usedIngredients?.some(i => i.toLowerCase().includes(q)) ||
      r.additionalIngredients?.some(i => i.toLowerCase().includes(q));
    const matchCat = !savedFilterCat.length || savedFilterCat.includes(r.category);
    const matchDiff = !savedFilterDiff.length || savedFilterDiff.includes(r.difficulty);
    return matchText && matchCat && matchDiff;
  });

  const difficultyColor = (d) => d === "쉬움" ? "#4ade80" : d === "보통" ? "#fbbf24" : "#f87171";
  const SECTIONS = [
    { key: "fridge", label: "냉장고", emoji: "🧊", color: "#0288d1", light: "#e1f5fe", tag: "#81d4fa" },
    { key: "pantry", label: "팬트리", emoji: "🗄", color: "#388e3c", light: "#e8f5e9", tag: "#a5d6a7" },
    { key: "focus",  label: "오늘 쓸 재료", emoji: "⭐", color: "#ff8f00", light: "#fff3e0", tag: "#ffcc80" },
  ];
  const activeInfo = SECTIONS.find(s => s.key === activeSection);

  const SyncBadge = () => (
    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: syncStatus === "synced" ? "#e8f5e9" : syncStatus === "syncing" ? "#fff3e0" : "#fce4ec", color: syncStatus === "synced" ? "#2e7d32" : syncStatus === "syncing" ? "#e65100" : "#c62828", fontWeight: 600 }}>
      {syncStatus === "synced" ? "☁️ 동기화됨" : syncStatus === "syncing" ? "🔄 저장 중..." : "⚠️ 오류"}
    </span>
  );

  const RecipeCard = ({ r, idx, isSavedView = false, justSavedMap, addedToStockMap, onSave, onAddToStock }) => {
    const alreadySaved = isSavedView || savedRecipes.some(s => s.name === r.name);
    const alreadyInStock = foodStock[r.category]?.includes(r.name);
    return (
      <div style={{ background: "white", borderRadius: 20, padding: 24, boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6, gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontSize: 28 }}>{r.emoji}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {!isSavedView && (
              <button onClick={() => onSave(r, idx)} style={{ background: justSavedMap?.[idx] ? "#e8f5e9" : alreadySaved ? "#f5f5f5" : "#fff3e0", color: justSavedMap?.[idx] ? "#2e7d32" : alreadySaved ? "#bdbdbd" : "#e65100", border: "1.5px solid", borderColor: justSavedMap?.[idx] ? "#a5d6a7" : alreadySaved ? "#e0e0e0" : "#ffcc80", borderRadius: 10, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: alreadySaved ? "default" : "pointer", fontFamily: "inherit" }}>
                {justSavedMap?.[idx] ? "✓ 저장됨" : alreadySaved ? "이미 저장됨" : "🔖 저장"}
              </button>
            )}
            <button onClick={() => onAddToStock(r, idx)} style={{ background: addedToStockMap?.[idx] ? "#e8f5e9" : alreadyInStock ? "#f5f5f5" : CAT_COLOR[r.category]?.bg || "#fff3e0", color: addedToStockMap?.[idx] ? "#2e7d32" : alreadyInStock ? "#bdbdbd" : CAT_COLOR[r.category]?.text || "#e65100", border: "1.5px solid", borderColor: addedToStockMap?.[idx] ? "#a5d6a7" : alreadyInStock ? "#e0e0e0" : CAT_COLOR[r.category]?.border || "#ffcc80", borderRadius: 10, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: alreadyInStock ? "default" : "pointer", fontFamily: "inherit" }}>
              {addedToStockMap?.[idx] ? "✓ 재고에 추가됨" : alreadyInStock ? "재고에 있음" : `${CAT_EMOJI[r.category] || "🍽"} 재고에 추가`}
            </button>
          </div>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#4e342e", marginBottom: 12 }}>{r.name}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {[{ icon: "👶", label: r.age }, { icon: "⏱", label: r.time }, { icon: "📊", label: r.difficulty, color: difficultyColor(r.difficulty) }, { icon: CAT_EMOJI[r.category] || "🍽", label: r.category }].filter(x => x.label).map(({ icon, label, color }) => (
            <span key={label} style={{ background: "#fff3e0", border: "1.5px solid #ffe0b2", borderRadius: 12, padding: "4px 12px", fontSize: 13, color: color || "#8d6e63", fontWeight: 500 }}>{icon} {label}</span>
          ))}
        </div>
        <div style={{ background: "#f1f8e9", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "#558b2f", marginBottom: 20, display: "flex", gap: 8 }}>
          <span>🌿</span> {r.nutrition}
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#5d4037", marginBottom: 10 }}>🛒 재료</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {r.usedIngredients.map(ing => <span key={ing} style={{ background: "#fff3e0", border: "1.5px solid #ffcc80", borderRadius: 20, padding: "4px 12px", fontSize: 13, color: "#e65100", fontWeight: 500 }}>✓ {ing}</span>)}
            {r.additionalIngredients?.map(ing => <span key={ing} style={{ background: "#f5f5f5", border: "1.5px solid #e0e0e0", borderRadius: 20, padding: "4px 12px", fontSize: 13, color: "#757575" }}>+ {ing}</span>)}
          </div>
          {r.additionalIngredients?.length > 0 && <div style={{ fontSize: 11, color: "#bcaaa4", marginTop: 6 }}>✓ 집에 있는 재료 &nbsp;|&nbsp; + 추가 필요 재료</div>}
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#5d4037", marginBottom: 10 }}>👩‍🍳 만드는 방법</div>
          {r.steps.map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 0", borderBottom: i < r.steps.length - 1 ? "1px dashed #ffe0b2" : "none" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#ff8f00", color: "white", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
              <div style={{ fontSize: 14, color: "#5d4037", lineHeight: 1.6, paddingTop: 3 }}>{step}</div>
            </div>
          ))}
        </div>
        <div style={{ background: "#fff8e1", border: "1.5px solid #ffe082", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#f57f17", lineHeight: 1.6 }}>
          💡 <strong>Tip.</strong> {r.tip}
        </div>
        {isSavedView && r.savedAt && <div style={{ fontSize: 11, color: "#d7ccc8", marginTop: 12, textAlign: "right" }}>저장일: {r.savedAt}</div>}
      </div>
    );
  };

  const LoadingCard = ({ msg, sub }) => (
    <div style={{ background: "white", borderRadius: 20, padding: 32, boxShadow: "0 2px 16px rgba(0,0,0,0.06)", textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16, display: "inline-block", animation: "spin 1.5s linear infinite" }}>👨‍🍳</div>
      <div style={{ fontWeight: 700, color: "#5d4037", fontSize: 15, marginBottom: 8 }}>{msg}</div>
      <div style={{ color: "#a1887f", fontSize: 13, marginBottom: 20 }}>{sub}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[1,2,3,4,5].map(i => <div key={i} className="shimmer" style={{ height: 14, width: i % 2 === 0 ? "75%" : "100%", margin: "0 auto" }} />)}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#fef9f0", fontFamily: "'Noto Sans KR', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&family=Gaegu:wght@700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes popIn  { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes spin   { 0% { transform: rotate(-15deg); } 50% { transform: rotate(15deg); } 100% { transform: rotate(-15deg); } }
        .fade-in { animation: fadeIn 0.4s ease; }
        .shimmer { background: linear-gradient(90deg,#fff3e0 25%,#ffe0b2 50%,#fff3e0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 12px; }
        .recipe-tab { padding: 10px 14px; border-radius: 20px; border: 2px solid #ffcc80; background: white; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; color: #8d6e63; font-family: inherit; }
        .recipe-tab.active { background: #ff8f00; border-color: #ff8f00; color: white; }
        .recipe-tab:hover:not(.active) { background: #fff3e0; }
        .btn-main { background: #ff8f00; color: white; border: none; border-radius: 16px; padding: 16px 32px; font-size: 16px; font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.2s; box-shadow: 0 4px 12px rgba(255,143,0,0.3); }
        .btn-main:hover:not(:disabled) { background: #e65100; transform: translateY(-1px); }
        .btn-main:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .suggest-chip { padding: 5px 12px; border-radius: 20px; border: 1.5px dashed #ffcc80; background: white; font-size: 13px; color: #8d6e63; cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .suggest-chip:hover { background: #fff3e0; border-style: solid; }
        .main-tab { flex: 1; padding: 12px 6px; border: none; border-bottom: 3px solid transparent; background: white; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; color: #bcaaa4; transition: all 0.2s; display: flex; flex-direction: column; align-items: center; gap: 3px; }
        .main-tab.active { color: #ff8f00; border-bottom-color: #ff8f00; }
        .main-tab:hover:not(.active) { color: #a1887f; background: #fffbf5; }
        .food-chip { display: inline-flex; align-items: center; border-radius: 20px; padding: 4px 10px 4px 12px; font-size: 13px; font-weight: 500; gap: 4px; animation: popIn 0.2s ease; }
        .plan-cell { border-radius: 10px; padding: 8px 10px; font-size: 12px; min-height: 36px; cursor: pointer; transition: all 0.15s; border: 1.5px solid transparent; }
        .plan-cell:hover { opacity: 0.8; }
        .plan-cell.empty { background: #f5f5f5; border: 1.5px dashed #e0e0e0; color: #bdbdbd; font-style: italic; }
        .plan-cell.filled { background: #fff3e0; border-color: #ffcc80; color: #5d4037; }
        .sub-toggle { padding: 8px 14px; border-radius: 20px; border: 1.5px solid #ffe0b2; background: white; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; color: #a1887f; transition: all 0.15s; white-space: nowrap; }
        .sub-toggle.active { background: #ff8f00; border-color: #ff8f00; color: white; }
      `}</style>

      <div style={{ background: "white", borderBottom: "2px solid #fff3e0", padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 32 }}>😋</span>
        <div>
          <div style={{ fontFamily: "'Gaegu', cursive", fontSize: 22, color: "#ff8f00", lineHeight: 1 }}>냠냠 레시피</div>
          <div style={{ fontSize: 12, color: "#bcaaa4", marginTop: 2 }}>집에 있는 재료로 만드는 유아식</div>
        </div>
        <div style={{ marginLeft: "auto" }}><SyncBadge /></div>
      </div>

      <div style={{ display: "flex", background: "white", borderBottom: "1px solid #f0f0f0" }}>
        {[{ key: "recipe", label: "레시피", emoji: "👨‍🍳" }, { key: "stock", label: "음식 재고", emoji: "🗂" }, { key: "plan", label: "식단 짜기", emoji: "📅" }].map(({ key, label, emoji }) => (
          <button key={key} className={`main-tab ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
            <span style={{ fontSize: 18 }}>{emoji}</span>{label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 16px" }}>

        {tab === "recipe" && (<>
          <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
            {[{ key: "search", label: "🥕 재료로 추천" }, { key: "aisearch", label: "🔍 AI 검색" }, { key: "saved", label: `🔖 저장됨 ${savedRecipes.length > 0 ? `(${savedRecipes.length})` : ""}` }].map(({ key, label }) => (
              <button key={key} className={`sub-toggle ${recipeView === key ? "active" : ""}`} onClick={() => setRecipeView(key)}>{label}</button>
            ))}
          </div>

          {recipeView === "search" && (<>
            <div style={{ background: "white", borderRadius: 20, padding: 24, boxShadow: "0 2px 16px rgba(0,0,0,0.06)", marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                {SECTIONS.map(({ key, label, emoji, color, light }) => (
                  <button key={key} onClick={() => { setActiveSection(key); setEditMode(false); setNewIngInput(""); }}
                    style={{ flex: 1, padding: "10px 6px", borderRadius: 14, border: "2px solid", borderColor: activeSection === key ? color : "#f0f0f0", background: activeSection === key ? light : "white", color: activeSection === key ? color : "#bcaaa4", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <span style={{ fontSize: 20 }}>{emoji}</span>{label}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 12, color: "#a1887f", marginBottom: 12 }}>
                {activeSection === "fridge" && "냉장고에 있는 재료 — AI가 레시피에 자동으로 활용해요"}
                {activeSection === "pantry" && "팬트리에 있는 재료 — AI가 레시피에 자동으로 활용해요"}
                {activeSection === "focus"  && "특히 이 재료로 만들고 싶어요 — AI가 우선적으로 활용해요"}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, minHeight: 36 }}>
                {currentItems.map(i => (
                  <div key={i} style={{ display: "inline-flex", alignItems: "center", animation: "popIn 0.2s ease" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", background: activeInfo.light, border: "1.5px solid " + activeInfo.tag, borderRadius: editMode ? "20px 0 0 20px" : 20, borderRight: editMode ? "none" : undefined, padding: "4px 12px", fontSize: 13, color: activeInfo.color, fontWeight: 500 }}>{i}</span>
                    {editMode && <button onClick={() => setCurrentItems(currentItems.filter(x => x !== i))} style={{ background: "#ffe0b2", border: "1.5px solid #ffe0b2", borderLeft: "none", borderRadius: "0 20px 20px 0", padding: "6px 9px", cursor: "pointer", color: "#e65100", fontSize: 13, fontWeight: 700, lineHeight: 1 }}>×</button>}
                  </div>
                ))}
                {editMode && (
                  <div style={{ display: "inline-flex", alignItems: "center" }}>
                    <input value={newIngInput} onChange={e => setNewIngInput(e.target.value)}
                      onCompositionStart={() => { isComposing.current = true; }} onCompositionEnd={() => { isComposing.current = false; }}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (!isComposing.current) commitAddIng(newIngInput); } }}
                      placeholder="재료 직접 추가..." style={{ border: "1.5px dashed #ff8f00", borderRight: "none", borderRadius: "20px 0 0 20px", padding: "5px 12px", fontSize: 13, color: "#5d4037", outline: "none", fontFamily: "inherit", background: "#fffdf9", width: 120 }} />
                    <button onClick={() => commitAddIng(newIngInput)} style={{ background: "#ff8f00", border: "1.5px solid #ff8f00", borderLeft: "none", borderRadius: "0 20px 20px 0", padding: "6px 12px", cursor: "pointer", color: "white", fontSize: 14, fontWeight: 700 }}>+</button>
                  </div>
                )}
              </div>
              {activeSection === "focus" && (() => {
                const suggestions = [...fridgeItems, ...pantryItems].filter(i => !focusItems.includes(i));
                if (!suggestions.length) return null;
                return (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px dashed #ffe0b2" }}>
                    <div style={{ fontSize: 12, color: "#a1887f", marginBottom: 8, fontWeight: 600 }}>🧊🗄 냉장고 · 팬트리에서 고르기</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {suggestions.map(i => <button key={i} className="suggest-chip" onClick={() => addFocusItem(i)}>+ {i}</button>)}
                    </div>
                  </div>
                );
              })()}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
                <div style={{ fontSize: 11, color: "#d7ccc8" }}>{editMode ? "💾 자동 저장됩니다" : `총 ${fridgeItems.length + pantryItems.length + focusItems.length}가지 재료`}</div>
                <button onClick={() => { setEditMode(!editMode); setNewIngInput(""); }} style={{ fontSize: 12, color: editMode ? "#e65100" : "#ff8f00", background: editMode ? "#fff3e0" : "transparent", border: editMode ? "1.5px solid #ffcc80" : "none", borderRadius: 10, padding: editMode ? "3px 10px" : "3px 6px", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
                  {editMode ? "✓ 완료" : "✏️ 편집"}
                </button>
              </div>
            </div>
            <div style={{ background: "white", borderRadius: 20, padding: 24, boxShadow: "0 2px 16px rgba(0,0,0,0.06)", marginBottom: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#a1887f", marginBottom: 10 }}>👶 아이 개월수</div>
                  <div style={{ position: "relative", paddingTop: 28 }}>
                    <div style={{ position: "absolute", top: 0, left: `calc(${(babyAge - 6) / 30 * 100}% - 22px)`, background: "#ff8f00", color: "white", borderRadius: 10, padding: "3px 8px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", pointerEvents: "none" }}>
                      {babyAge}개월
                      <div style={{ position: "absolute", bottom: -5, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #ff8f00" }} />
                    </div>
                    <input type="range" min={6} max={36} step={1} value={babyAge} onChange={e => setBabyAge(Number(e.target.value))} style={{ width: "100%", accentColor: "#ff8f00", cursor: "pointer", display: "block" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#d7ccc8", marginTop: 4 }}>
                    <span>6개월</span><span>15개월</span><span>24개월</span><span>36개월</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#a1887f", marginBottom: 8 }}>🍽 카테고리</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {[{ label: "전체", emoji: "✨" }, ...FOOD_CATS.map(c => ({ label: c, emoji: CAT_EMOJI[c] }))].map(({ label, emoji }) => (
                      <button key={label} onClick={() => setCategory(label)} style={{ padding: "7px 14px", borderRadius: 20, border: "1.5px solid", borderColor: category === label ? "#ff8f00" : "#ffe0b2", background: category === label ? "#ff8f00" : "white", color: category === label ? "white" : "#8d6e63", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
                        {emoji} {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button className="btn-main" style={{ width: "100%", marginTop: 20 }} onClick={fetchRecipes} disabled={(!fridgeItems.length && !pantryItems.length && !focusItems.length) || loading}>
                {loading ? "레시피 찾는 중... 🔍" : "✨ 레시피 추천받기"}
              </button>
            </div>
            {loading && <LoadingCard msg="레시피 만드는 중..." sub={`${babyAge}개월 아이에게 딱 맞는 레시피를 찾고 있어요`} />}
            {error && <div style={{ background: "#fff3f3", border: "1.5px solid #ffcdd2", borderRadius: 16, padding: 16, color: "#c62828", fontSize: 14, textAlign: "center" }}>⚠️ {error}</div>}
            {recipes && selectedRecipe !== null && (
              <div className="fade-in">
                <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                  {recipes.map((r, i) => <button key={i} className={`recipe-tab ${selectedRecipe === i ? "active" : ""}`} onClick={() => setSelectedRecipe(i)}>{r.emoji} {r.name}</button>)}
                </div>
                <RecipeCard r={recipes[selectedRecipe]} idx={selectedRecipe} justSavedMap={justSaved} addedToStockMap={addedToStock}
                  onSave={(r, i) => doSaveRecipe(r, setJustSaved, i)} onAddToStock={(r, i) => doAddToStock(r, setAddedToStock, i)} />
                <button style={{ width: "100%", marginTop: 12, background: "white", border: "2px solid #ffcc80", borderRadius: 16, padding: 14, fontSize: 14, color: "#8d6e63", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }} onClick={fetchRecipes}>🔄 다른 레시피 추천받기</button>
              </div>
            )}
          </>)}

          {recipeView === "aisearch" && (
            <div className="fade-in">
              <div style={{ background: "white", borderRadius: 20, padding: 24, boxShadow: "0 2px 16px rgba(0,0,0,0.06)", marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#a1887f", marginBottom: 10 }}>🔍 레시피 검색</div>
                <div style={{ fontSize: 12, color: "#bcaaa4", marginBottom: 14 }}>재료 이름, 레시피 이름, 카테고리 등 자유롭게 검색해보세요</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  <input value={aiSearchQuery} onChange={e => setAiSearchQuery(e.target.value)}
                    onCompositionStart={() => { aiIsComposing.current = true; }} onCompositionEnd={() => { aiIsComposing.current = false; }}
                    onKeyDown={e => { if (e.key === "Enter" && !aiIsComposing.current) fetchAiSearch(); }}
                    placeholder="예: 소고기, 달걀볶음밥, 간식, 쉬운 국..."
                    style={{ flex: 1, border: "1.5px solid #ffe0b2", borderRadius: 12, padding: "10px 14px", fontSize: 14, color: "#5d4037", outline: "none", fontFamily: "inherit", background: "#fffdf9" }} />
                  {aiSearchQuery && <button onClick={() => setAiSearchQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#bcaaa4", fontSize: 20, padding: "0 4px" }}>×</button>}
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#a1887f", marginBottom: 10 }}>👶 아이 개월수</div>
                  <div style={{ position: "relative", paddingTop: 28 }}>
                    <div style={{ position: "absolute", top: 0, left: `calc(${(aiSearchAge - 6) / 30 * 100}% - 22px)`, background: "#ff8f00", color: "white", borderRadius: 10, padding: "3px 8px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", pointerEvents: "none" }}>
                      {aiSearchAge}개월
                      <div style={{ position: "absolute", bottom: -5, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #ff8f00" }} />
                    </div>
                    <input type="range" min={6} max={36} step={1} value={aiSearchAge} onChange={e => setAiSearchAge(Number(e.target.value))} style={{ width: "100%", accentColor: "#ff8f00", cursor: "pointer", display: "block" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#d7ccc8", marginTop: 4 }}>
                    <span>6개월</span><span>15개월</span><span>24개월</span><span>36개월</span>
                  </div>
                </div>
                <button className="btn-main" style={{ width: "100%" }} onClick={fetchAiSearch} disabled={!aiSearchQuery.trim() || aiSearchLoading}>
                  {aiSearchLoading ? "검색 중... 🔍" : "🔍 검색하기"}
                </button>
              </div>
              {aiSearchLoading && <LoadingCard msg="레시피 검색 중..." sub={`"${aiSearchQuery}" 관련 레시피를 찾고 있어요`} />}
              {aiSearchError && <div style={{ background: "#fff3f3", border: "1.5px solid #ffcdd2", borderRadius: 16, padding: 16, color: "#c62828", fontSize: 14, textAlign: "center" }}>⚠️ {aiSearchError}</div>}
              {aiSearchResults && aiSelectedRecipe !== null && (
                <div className="fade-in">
                  <div style={{ fontSize: 13, color: "#a1887f", marginBottom: 10 }}>🔍 <strong>"{aiSearchQuery}"</strong> 검색 결과 {aiSearchResults.length}개</div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                    {aiSearchResults.map((r, i) => <button key={i} className={`recipe-tab ${aiSelectedRecipe === i ? "active" : ""}`} onClick={() => setAiSelectedRecipe(i)}>{r.emoji} {r.name}</button>)}
                  </div>
                  <RecipeCard r={aiSearchResults[aiSelectedRecipe]} idx={aiSelectedRecipe} justSavedMap={aiJustSaved} addedToStockMap={aiAddedToStock}
                    onSave={(r, i) => doSaveRecipe(r, setAiJustSaved, i)} onAddToStock={(r, i) => doAddToStock(r, setAiAddedToStock, i)} />
                  <button style={{ width: "100%", marginTop: 12, background: "white", border: "2px solid #ffcc80", borderRadius: 16, padding: 14, fontSize: 14, color: "#8d6e63", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }} onClick={fetchAiSearch}>🔄 다시 검색하기</button>
                </div>
              )}
            </div>
          )}

          {recipeView === "saved" && (
            <div className="fade-in">
              {savedRecipes.length === 0
                ? <div style={{ background: "white", borderRadius: 20, padding: 40, textAlign: "center", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🔖</div>
                    <div style={{ color: "#a1887f", fontSize: 14 }}>아직 저장된 레시피가 없어요</div>
                    <div style={{ color: "#bcaaa4", fontSize: 12, marginTop: 6 }}>레시피 검색 후 저장 버튼을 눌러보세요!</div>
                  </div>
                : (<>
                  <div style={{ background: "white", borderRadius: 20, padding: 20, boxShadow: "0 2px 16px rgba(0,0,0,0.06)", marginBottom: 16 }}>
                    <SearchBar value={savedSearch} onChange={setSavedSearch} placeholder="레시피 이름, 재료로 검색..." />
                    <FilterChips label="카테고리" options={FOOD_CATS} selected={savedFilterCat}
                      onToggle={c => setSavedFilterCat(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])}
                      colorMap={Object.fromEntries(FOOD_CATS.map(c => [c, CAT_COLOR[c]]))} />
                    <FilterChips label="난이도" options={["쉬움", "보통", "어려움"]} selected={savedFilterDiff}
                      onToggle={d => setSavedFilterDiff(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])}
                      colorMap={{ "쉬움": { bg: "#e8f5e9", text: "#2e7d32" }, "보통": { bg: "#fff8e1", text: "#f57f17" }, "어려움": { bg: "#fce4ec", text: "#880e4f" } }} />
                    <div style={{ fontSize: 12, color: "#bcaaa4", marginTop: 8 }}>
                      {filteredSaved.length === savedRecipes.length ? `총 ${savedRecipes.length}개` : `${filteredSaved.length} / ${savedRecipes.length}개`}
                    </div>
                  </div>
                  {filteredSaved.length === 0
                    ? <div style={{ background: "white", borderRadius: 16, padding: 32, textAlign: "center", color: "#bcaaa4", fontSize: 14 }}>검색 결과가 없어요</div>
                    : filteredSaved.map((r, i) => (
                      <div key={r.name} style={{ marginBottom: 16 }} className="fade-in">
                        <RecipeCard r={r} idx={i} isSavedView justSavedMap={{}} addedToStockMap={addedToStock}
                          onSave={() => {}} onAddToStock={(r, i) => doAddToStock(r, setAddedToStock, i)} />
                        <button onClick={() => deleteSavedRecipe(r.name)} style={{ width: "100%", marginTop: 8, background: "white", border: "1.5px solid #ffcdd2", borderRadius: 12, padding: 10, fontSize: 13, color: "#e53935", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>
                          🗑 저장 삭제
                        </button>
                      </div>
                    ))
                  }
                </>)
              }
            </div>
          )}
        </>)}

        {tab === "stock" && (
          <div className="fade-in">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
              {FOOD_CATS.map(c => (
                <button key={c} onClick={() => setStockCat(c)} style={{ padding: "8px 14px", borderRadius: 20, border: "1.5px solid", borderColor: stockCat === c ? CAT_COLOR[c].text : "#e0e0e0", background: stockCat === c ? CAT_COLOR[c].bg : "white", color: stockCat === c ? CAT_COLOR[c].text : "#9e9e9e", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
                  {CAT_EMOJI[c]} {c} {foodStock[c]?.length > 0 && <span style={{ marginLeft: 3, background: stockCat === c ? CAT_COLOR[c].text : "#e0e0e0", color: stockCat === c ? "white" : "#757575", borderRadius: 10, padding: "1px 6px", fontSize: 11 }}>{foodStock[c].length}</span>}
                </button>
              ))}
            </div>
            <div style={{ background: "white", borderRadius: 20, padding: 24, boxShadow: "0 2px 16px rgba(0,0,0,0.06)", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 22 }}>{CAT_EMOJI[stockCat]}</span>
                <div style={{ fontSize: 16, fontWeight: 700, color: CAT_COLOR[stockCat].text }}>{stockCat}</div>
                <div style={{ marginLeft: "auto", fontSize: 12, color: "#bcaaa4" }}>{foodStock[stockCat]?.length || 0}개</div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, minHeight: 44, marginBottom: 16 }}>
                {(foodStock[stockCat] || []).length === 0
                  ? <div style={{ color: "#d7ccc8", fontSize: 13, fontStyle: "italic", paddingTop: 8 }}>아직 등록된 {stockCat}이 없어요</div>
                  : (foodStock[stockCat] || []).map(item => (
                    <div key={item} className="food-chip" style={{ background: CAT_COLOR[stockCat].bg, border: "1.5px solid " + CAT_COLOR[stockCat].border, color: CAT_COLOR[stockCat].text }}>
                      <span>{item}</span>
                      <button onClick={() => removeStock(stockCat, item)} style={{ background: "none", border: "none", cursor: "pointer", color: CAT_COLOR[stockCat].text, fontSize: 14, fontWeight: 700, lineHeight: 1, opacity: 0.6, padding: "0 2px" }}>×</button>
                    </div>
                  ))
                }
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={stockInput} onChange={e => setStockInput(e.target.value)}
                  onCompositionStart={() => { stockIsComposing.current = true; }} onCompositionEnd={() => { stockIsComposing.current = false; }}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (!stockIsComposing.current) commitAddStock(stockInput); } }}
                  placeholder={`${stockCat} 이름 입력...`}
                  style={{ flex: 1, border: "1.5px solid " + CAT_COLOR[stockCat].border, borderRadius: 12, padding: "10px 14px", fontSize: 14, color: "#5d4037", outline: "none", fontFamily: "inherit", background: CAT_COLOR[stockCat].bg }} />
                <button onClick={() => commitAddStock(stockInput)} style={{ background: CAT_COLOR[stockCat].text, color: "white", border: "none", borderRadius: 12, padding: "10px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>추가</button>
              </div>
            </div>
            <div style={{ background: "white", borderRadius: 20, padding: 20, boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#a1887f", marginBottom: 12 }}>📊 전체 재고 현황</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {FOOD_CATS.map(c => (
                  <div key={c} onClick={() => setStockCat(c)} style={{ background: CAT_COLOR[c].bg, border: "1.5px solid " + CAT_COLOR[c].border, borderRadius: 12, padding: "8px 14px", cursor: "pointer" }}>
                    <div style={{ fontSize: 11, color: CAT_COLOR[c].text, fontWeight: 600 }}>{CAT_EMOJI[c]} {c}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: CAT_COLOR[c].text, marginTop: 2 }}>{foodStock[c]?.length || 0}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: "#bcaaa4", textAlign: "right" }}>총 {totalStock}가지 음식</div>
            </div>
            {totalStock > 0 && (
              <div style={{ background: "white", borderRadius: 20, padding: 20, boxShadow: "0 2px 16px rgba(0,0,0,0.06)", marginTop: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#a1887f", marginBottom: 14 }}>📋 전체 음식 목록</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {FOOD_CATS.filter(c => foodStock[c]?.length > 0).map(c => (
                    <div key={c}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: CAT_COLOR[c].text, marginBottom: 6 }}>
                        {CAT_EMOJI[c]} {c} <span style={{ fontWeight: 400, color: "#bcaaa4" }}>({foodStock[c].length})</span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {foodStock[c].map(item => (
                          <div key={item} className="food-chip" style={{ background: CAT_COLOR[c].bg, border: "1.5px solid " + CAT_COLOR[c].border, color: CAT_COLOR[c].text }}>
                            <span>{item}</span>
                            <button onClick={() => removeStock(c, item)} style={{ background: "none", border: "none", cursor: "pointer", color: CAT_COLOR[c].text, fontSize: 14, fontWeight: 700, lineHeight: 1, opacity: 0.6, padding: "0 2px" }}>×</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "plan" && (
          <div className="fade-in">
            <div style={{ background: "white", borderRadius: 20, padding: 24, boxShadow: "0 2px 16px rgba(0,0,0,0.06)", marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#a1887f", marginBottom: 12 }}>📅 식단 기간</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                {[1,2,3,4,5,6,7].map(d => (
                  <button key={d} onClick={() => setPlanDays(d)} style={{ width: 44, height: 44, borderRadius: 12, border: "1.5px solid", borderColor: planDays === d ? "#ff8f00" : "#ffe0b2", background: planDays === d ? "#ff8f00" : "white", color: planDays === d ? "white" : "#8d6e63", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>{d}일</button>
                ))}
              </div>
              {totalStock === 0
                ? <div style={{ background: "#fff3e0", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#e65100", marginBottom: 16 }}>⚠️ 음식 재고가 없어요. 먼저 <strong>음식 재고</strong> 탭에서 음식을 추가해주세요!</div>
                : <div style={{ background: "#f1f8e9", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "#558b2f", marginBottom: 16 }}>✅ 재고 {totalStock}가지 음식 기반으로 식단을 짜드릴게요</div>
              }
              <button className="btn-main" style={{ width: "100%" }} onClick={fetchPlan} disabled={totalStock === 0 || planLoading}>
                {planLoading ? "식단 짜는 중... 🍱" : `✨ ${planDays}일 식단 추천받기`}
              </button>
            </div>
            {planLoading && (
              <div style={{ background: "white", borderRadius: 20, padding: 32, boxShadow: "0 2px 16px rgba(0,0,0,0.06)", textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 16, display: "inline-block", animation: "spin 1.5s linear infinite" }}>🍱</div>
                <div style={{ fontWeight: 700, color: "#5d4037", fontSize: 15, marginBottom: 8 }}>식단 짜는 중...</div>
                <div style={{ color: "#a1887f", fontSize: 13, marginBottom: 20 }}>영양 균형을 맞춰 {planDays}일 식단을 구성하고 있어요</div>
              </div>
            )}
            {planError && <div style={{ background: "#fff3f3", border: "1.5px solid #ffcdd2", borderRadius: 16, padding: 16, color: "#c62828", fontSize: 14, textAlign: "center", marginBottom: 16 }}>⚠️ {planError}</div>}
            {currentPlan && !viewingPlan && (
              <div className="fade-in">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#5d4037" }}>🍽 추천 식단 <span style={{ fontSize: 12, color: "#bcaaa4", fontWeight: 400 }}>— 각 칸 클릭해서 수정</span></div>
                  <button onClick={savePlan} style={{ background: "#ff8f00", color: "white", border: "none", borderRadius: 10, padding: "7px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>💾 저장</button>
                </div>
                <PlanTable plan={currentPlan} editingCell={editingCell} editCellVal={editCellVal} setEditCellVal={setEditCellVal} onCellClick={startEditCell} onCellCommit={commitEditCell} setEditingCell={setEditingCell} />
                <button style={{ width: "100%", marginTop: 12, background: "white", border: "2px solid #ffcc80", borderRadius: 16, padding: 14, fontSize: 14, color: "#8d6e63", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }} onClick={fetchPlan}>🔄 다시 추천받기</button>
              </div>
            )}
            {savedPlans.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#5d4037", marginBottom: 12 }}>📂 저장된 식단</div>
                {savedPlans.map(p => (
                  <div key={p.id} style={{ background: "white", borderRadius: 16, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#4e342e" }}>📅 {p.days}일 식단</div>
                        <div style={{ fontSize: 12, color: "#bcaaa4", marginTop: 2 }}>{p.date} 저장</div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => setViewingPlan(viewingPlan?.id === p.id ? null : p)} style={{ background: viewingPlan?.id === p.id ? "#ff8f00" : "#fff3e0", color: viewingPlan?.id === p.id ? "white" : "#e65100", border: "1.5px solid #ffcc80", borderRadius: 10, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                          {viewingPlan?.id === p.id ? "닫기" : "보기"}
                        </button>
                        <button onClick={() => deleteSavedPlan(p.id)} style={{ background: "#fff3f3", color: "#e53935", border: "1.5px solid #ffcdd2", borderRadius: 10, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>삭제</button>
                      </div>
                    </div>
                    {viewingPlan?.id === p.id && <div style={{ marginTop: 16 }}><PlanTable plan={p.plan} editingCell={null} editCellVal="" setEditCellVal={() => {}} onCellClick={() => {}} onCellCommit={() => {}} setEditingCell={() => {}} readOnly /></div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 24, fontSize: 11, color: "#d7ccc8" }}>
          Powered by Claude AI · 아이의 건강한 한 끼를 위해 🌱
        </div>
      </div>
    </div>
  );
}

function PlanTable({ plan, editingCell, editCellVal, setEditCellVal, onCellClick, onCellCommit, setEditingCell, readOnly }) {
  const SLOTS = ["아침", "아침간식", "점심", "점심간식", "저녁"];
  const EMOJI = { "아침": "🌅", "아침간식": "🍎", "점심": "☀️", "점심간식": "🧃", "저녁": "🌙" };
  const isEditing = (di, slot) => editingCell?.dayIdx === di && editingCell?.slot === slot;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {plan.map((d, di) => (
        <div key={di} style={{ background: "white", borderRadius: 16, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#ff8f00", marginBottom: 10 }}>Day {d.day}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {SLOTS.map(slot => (
              <div key={slot} style={{ gridColumn: slot === "저녁" ? "1 / -1" : undefined }}>
                <div style={{ fontSize: 11, color: "#bcaaa4", marginBottom: 4, fontWeight: 600 }}>{EMOJI[slot]} {slot}</div>
                {isEditing(di, slot) ? (
                  <div style={{ display: "flex", gap: 4 }}>
                    <input autoFocus value={editCellVal} onChange={e => setEditCellVal(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") onCellCommit(); if (e.key === "Escape") setEditingCell(null); }}
                      style={{ flex: 1, border: "1.5px solid #ff8f00", borderRadius: 8, padding: "6px 8px", fontSize: 12, outline: "none", fontFamily: "inherit" }} />
                    <button onClick={onCellCommit} style={{ background: "#ff8f00", color: "white", border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}>✓</button>
                  </div>
                ) : (
                  <div className={`plan-cell ${d[slot] ? "filled" : "empty"}`} onClick={() => !readOnly && onCellClick(di, slot, d[slot] || "")}>
                    {d[slot] || (readOnly ? "—" : "탭해서 수정")}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
