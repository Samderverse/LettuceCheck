/* Lettuce Check: ingredient rules
 * Reads an ingredients list the way a person would (UK labelling) and decides
 * vegan / vegetarian / gluten-free, with a plain-English reason for every flag.
 * Works on its own text matching, then folds in Open Food Facts data when present.
 */
(function (root) {
  'use strict';

  // ---------- Phrases that look scary but aren't (removed before matching) ----------
  const SAFE = [
    /\b(?:coconut|oat|oats|soya|soy|rice|almond|cashew|hazelnut|pea|hemp|plant|vegetable|nut)\s*(?:milk|drink|cream|butter|yog(?:h)?urt|cheese)s?\b/g,
    /\bcreamed\s+coconut\b/g,
    /\b(?:cocoa|cacao|shea|mango|kokum|illipe|sal|nut|peanut|almond|cashew|seed|apple)\s+butters?\b/g,
    /\bbutter\s*beans?\b/g, /\bbutterbeans?\b/g, /\bbutternut\b/g,
    /\bcream\s+of\s+tartar\b/g,
    /\begg\s*plants?\b/g, /\beggplants?\b/g,
    /\b(?:dairy|milk|egg|gluten|wheat|meat|animal)[\s-]*free\b/g,
    /\bfree\s+from\s+(?:dairy|milk|egg|gluten|wheat)\b/g,
    /\bno\s+(?:milk|dairy|eggs?|meat|gluten)\b/g,
    /\bsuitable\s+for\s+(?:vegans?|vegetarians?)\b/g,
    /\bvegan\s+(?:cheese|butter|mayo|mayonnaise|cream)\b/g,
    /\bmilk\s+thistle\b/g, /\bhoneydew\b/g, /\bhoney\s*dew\b/g,
    /\bbuckwheat\b/g,
    /\bvegetable\s+(?:rennet|stock|gelatine|gelatin)\b/g,
    /\b(?:microbial|non[\s-]?animal|vegetarian)\s+(?:rennet|enzymes?)\b/g,
    /\bvitamin\s*d2\b/g, /\bergocalciferol\b/g,
    /\b(?:vitamin\s*d3?|cholecalciferol)\s*\(?\s*(?:from\s+)?(?:lichen|vegan|plant)/g,
    /\b(?:lecithins?|e\s?322)\s*\(?\s*(?:soya|soy|sunflower|rapeseed)\b/g,
    /\b(?:soya|soy|sunflower|rapeseed)\s+lecithins?\b/g,
    /\blactic\s+acid\b/g, /\b(?:calcium|sodium|potassium)\s+lactate\b/g,
    /\bmilk\s+chocolate\s+flavou?r/g
  ];

  // Gluten-specific safe phrases (Coeliac UK: these are fine)
  const GLUTEN_SAFE = [
    /\b(?:glucose(?:[\s-]fructose)?|fructose[\s-]glucose)\s+syrups?\s*\(?\s*(?:from\s+)?(?:wheat|barley)\)?/g,
    /\b(?:wheat|barley)\s+(?:glucose(?:[\s-]fructose)?\s+syrup|dextrose|maltodextrin)\b/g,
    /\b(?:dextrose|maltodextrin|caramel)\s*\(?\s*(?:from\s+)?(?:wheat|barley)\)?/g,
    /\bgluten[\s-]free\s+oats?\b/g, /\boats?\s*\(?\s*gluten[\s-]free\)?/g,
    /\bgluten[\s-]free\b/g, /\bwheat[\s-]free\b/g, /\bbuckwheat\b/g,
    /\bmaltodextrin\b/g, /\bmaltitol\b/g, /\bmaltose\b/g, /\bisomalt\b/g, /\bmaltol\b/g
  ];

  // "Bacon flavour", "cheese & onion flavour seasoning" etc.: a flavour name, not the food itself
  const FLAVOUR_NAME = /\b(?:smoky\s+|smoked\s+|crispy\s+|roast\s+|bbq\s+|barbecue\s+|sour\s+)?(?:bacon|cheese|cheddar|chicken|beef|prawn|prawn\s+cocktail|ham|gammon|sausage|turkey|lamb|steak|pork|fish|salmon|cream|butter|honey|yog(?:h)?urt|milk|egg|seafood|lobster|crab)(?:\s*(?:&|and)\s*[a-z]+)?\s+flavou?r(?:ed|ing|ings)?\b/g;

  // ---------- Things that rule a product out ----------
  // cat: what kind of animal product it is. veg: still OK for vegetarians?
  const STRONG = [
    // Dairy
    { re: /\b(?:whole|skimmed|semi[\s-]skimmed|condensed|evaporated|dried|fresh|pasteuri[sz]ed)?\s*milks?\b(?:\s+(?:powder|solids|protein|fat|sugar|minerals|permeate))?/g, cat: 'dairy', veg: true },
    { re: /\bbutter(?:milk|fat|\s+oil)?\b/g, cat: 'dairy', veg: true },
    { re: /\bghee\b/g, cat: 'dairy', veg: true },
    { re: /\b(?:double|single|whipping|sour|clotted|soured)?\s*cream\b/g, cat: 'dairy', veg: true },
    { re: /\bcr[eè]me\s+fra[iî]che\b/g, cat: 'dairy', veg: true },
    { re: /\bcheeses?\b|\bcheddar\b|\bmozzarella\b|\bricotta\b|\bmascarpone\b|\bhalloumi\b|\bfeta\b|\bquark\b|\bfromage\s+frais\b|\bpaneer\b|\bcream\s+cheese\b/g, cat: 'dairy', veg: true },
    { re: /\byog(?:h)?urts?\b|\bkefir\b/g, cat: 'dairy', veg: true },
    { re: /\bwhey\b(?:\s+(?:powder|protein|permeate))?/g, cat: 'dairy', veg: true },
    { re: /\bcasein(?:ates?)?\b|\b(?:sodium|calcium)\s+caseinate\b/g, cat: 'dairy', veg: true },
    { re: /\blactose\b|\blactitol\b|\be\s?966\b/g, cat: 'dairy', veg: true },
    // Egg
    { re: /\b(?:free[\s-]range\s+)?(?:dried\s+|pasteuri[sz]ed\s+|whole\s+)?eggs?\b(?:\s+(?:white|yolk|powder|albumen))?/g, cat: 'egg', veg: true },
    { re: /\balbumen\b|\begg\s+albumin\b|\blysozyme\b|\be\s?1105\b/g, cat: 'egg', veg: true },
    // Bees
    { re: /\bhoney\b|\bbeeswax\b|\be\s?901\b|\broyal\s+jelly\b|\bpropolis\b/g, cat: 'from bees', veg: true },
    // Insects
    { re: /\bcarmines?\b|\bcochineal\b|\be\s?120\b|\bcarminic\s+acid\b/g, cat: 'insects (red colour)', veg: false },
    // Wool
    { re: /\blanolin\b|\be\s?913\b/g, cat: "sheep's wool", veg: true },
    // Meat, fish & other slaughter products
    { re: /\bgelatine?\b|\be\s?441\b/g, cat: 'animal bones/skin', veg: false },
    { re: /\bcollagen\b|\bbone\s+(?:broth|stock|marrow|phosphate|char)\b|\be\s?542\b/g, cat: 'animal bones/skin', veg: false },
    { re: /\blard\b|\btallow\b|\bsuet\b|\bdripping\b|\banimal\s+(?:fat|fats|oil|rennet|protein)\b/g, cat: 'animal fat', veg: false },
    { re: /\bisinglass\b/g, cat: 'fish', veg: false },
    { re: /\b(?:beef|pork|chicken|turkey|lamb|mutton|veal|venison|duck|goose|rabbit|ham|bacon|gammon|chorizo|pepperoni|salami|prosciutto|pancetta|meat|mechanically\s+separated\s+meat|liver|offal)\b/g, cat: 'meat', veg: false },
    { re: /\b(?:fish|anchov(?:y|ies)|tuna|salmon|cod|haddock|pollock|pollack|hake|mackerel|sardines?|pilchards?|trout|herring|whitebait|basa|tilapia)\b(?:\s+(?:sauce|oil|extract|gelatine))?/g, cat: 'fish', veg: false },
    { re: /\b(?:prawns?|shrimps?|crabs?|lobsters?|crayfish|langoustines?|mussels?|oysters?|squid|calamari|octopus|scallops?|clams?|cockles?|whelks?|shellfish|crustaceans?|molluscs?)\b(?:\s+sauce)?/g, cat: 'shellfish', veg: false },
    { re: /\bpepsin\b/g, cat: 'animal enzyme', veg: false }
  ];

  // ---------- Grey areas, each with the reason it's worth checking ----------
  const CHECK = [
    { re: /\b(?:vitamin\s*d3?|cholecalciferol)\b/g, vegan: "Vitamin D in UK foods is usually D3 made from sheep's wool (lanolin), unless it says D2 or vegan" },
    { re: /\bmono[\s-]*(?:and|&)?[\s-]*di[\s-]*glycerides\b|\be\s?47[1-5][a-f]?\b/g, vegan: 'Emulsifier (E471-E475) that can be made from animal fat; usually plant-based in the UK, but only certain if labelled vegan', vegetarian: 'Emulsifier that can be made from animal fat' },
    { re: /\bl[\s-]?cysteine\b|\be\s?920\b/g, vegan: 'Dough improver often made from feathers or hair', vegetarian: 'Dough improver often made from feathers or hair' },
    { re: /\b(?:disodium\s+)?(?:inosinate|guanylate|ribonucleotides?)\b|\be\s?6(?:27|31|35)\b/g, vegan: 'Flavour enhancer that is sometimes made from fish or meat', vegetarian: 'Flavour enhancer that is sometimes made from fish or meat' },
    { re: /\bshellac\b|\be\s?904\b|\bglazing\s+agent\b(?!\s*\(?\s*(?:carnauba|e\s?903|candelilla|e\s?902))/g, vegan: 'Glazing agents are often shellac (from insects) or beeswax' },
    { re: /\brennet\b/g, vegetarian: 'Rennet is traditionally from calves unless it says vegetarian or microbial' },
    { re: /\b(?:parmesan|parmigiano(?:\s+reggiano)?|grana\s+padano|pecorino(?:\s+romano)?|gorgonzola|gruy[eè]re|emmental|manchego)\b/g, vegetarian: 'This cheese is traditionally made with animal rennet' },
    { re: /\bstearic\s+acid\b|\be\s?570\b|\bmagnesium\s+stearate\b|\be\s?470b?\b/g, vegan: 'Can come from animal fat', vegetarian: 'Can come from animal fat' },
    { re: /\bomega[\s-]?3\b(?!\s*\(?\s*(?:from\s+)?(?:algae|algal|flax|linseed))/g, vegan: 'Added omega-3 is often fish oil', vegetarian: 'Added omega-3 is often fish oil' }
  ];

  // ---------- Gluten ----------
  const GLUTEN = [
    { re: /\bwheat\b(?:\s+(?:flour|starch|protein|fibre|bran|germ|semolina|gluten))?/g, label: 'Wheat' },
    { re: /\bbarley\b(?:\s+(?:malt\s+extract|malt|flour|flakes))?/g, label: 'Barley' },
    { re: /\brye\b(?:\s+flour)?/g, label: 'Rye' },
    { re: /\bspelt\b|\bkamut\b|\bkhorasan\b|\btriticale\b|\beinkorn\b|\bemmer\b|\bfarro\b|\bfreekeh\b|\bdurum\b/g, label: 'Wheat variety' },
    { re: /\bsemolina\b|\bcous\s*cous\b|\bbulg[ua]r\b|\bseitan\b/g, label: 'Wheat product' },
    { re: /\bmalt(?:ed)?\b(?:\s+(?:extract|flour|vinegar|barley))?/g, label: 'Malt (usually barley)' },
    { re: /\boats?\b(?:\s+(?:flour|bran|flakes))?|\boatmeal\b|\bporridge\s+oats\b/g, label: 'Oats (only safe for coeliacs if certified gluten-free)' },
    { re: /\bgluten\b/g, label: 'Gluten' },
    { re: /\brusk\b|\bbreadcrumbs?\b|\bcroutons?\b/g, label: 'Bread / rusk (wheat)' }
  ];

  // ---------- Text helpers ----------
  // Keep string length identical so match positions line up with the original for highlighting
  function blank(text, re) { return text.replace(re, m => ' '.repeat(m.length)); }
  function normalise(raw) {
    // lower-case without changing length; drop OFF's _allergen_ underscores
    let t = raw.replace(/[_*]/g, ' ');
    t = [...t].map(c => { const l = c.toLowerCase(); return l.length === c.length ? l : c; }).join('');
    return t;
  }
  function splitTraces(t) {
    // Everything from "may contain" / "made in a factory" onwards is a cross-contamination warning
    const m = t.match(/\b(?:may\s+(?:also\s+)?contain|may\s+be\s+present|traces?\s+of|made\s+(?:in|on)\s+(?:a\s+)?(?:factory|site|premises|line)|produced\s+(?:in|on)\s+(?:a\s+)?(?:factory|site|line)|not\s+suitable\s+for\s+(?:milk|egg|nut|peanut)|also\s+handles|manufactured\s+(?:in|on))/);
    if (!m) return { main: t, traces: '', at: t.length };
    return { main: t.slice(0, m.index) + ' '.repeat(t.length - m.index), traces: t.slice(m.index), at: m.index };
  }
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const tidy = s => cap(s.replace(/\s+/g, ' ').trim())
    .replace(/\bvitamin\s*([a-z]\d?)\b/gi, (m, v) => 'Vitamin ' + v.toUpperCase())
    .replace(/\be\s?(\d{3,4}[a-f]?)\b/gi, (m, n) => 'E' + n);

  function findAll(text, list) {
    const hits = [];
    for (const rule of list) {
      rule.re.lastIndex = 0;
      let m;
      while ((m = rule.re.exec(text))) {
        const word = m[0].trim();
        if (!word) { rule.re.lastIndex++; continue; }
        const start = m.index + m[0].indexOf(word);
        hits.push({ rule, word, start, end: start + word.length });
      }
    }
    // Drop hits fully inside a longer hit (e.g. "milk" inside "skimmed milk powder")
    hits.sort((a, b) => a.start - b.start || b.end - a.end);
    return hits.filter((h, i) => !hits.some((o, j) => j !== i && o.start <= h.start && o.end >= h.end && (o.end - o.start) > (h.end - h.start)));
  }
  function uniqBy(arr, key) {
    const seen = new Set();
    return arr.filter(x => { const k = key(x).toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
  }

  // ---------- Main ----------
  /**
   * analyse({ text, offProduct })
   * text: ingredients list (from Open Food Facts or a photo)
   * offProduct: Open Food Facts product object (optional)
   * returns { vegan, vegetarian, gluten, marks, source }
   */
  function analyse(opts) {
    const p = opts.offProduct || {};
    const raw = (opts.text != null ? opts.text
      : (p.ingredients_text_en || p.ingredients_text || (p.ingredients || []).map(i => i.text).filter(Boolean).join(', '))) || '';
    const labels = p.labels_tags || [];
    const allergens = p.allergens_tags || [];
    const offTraces = p.traces_tags || [];
    const hasText = raw.replace(/[^a-z]/gi, '').length >= 3;

    let t = normalise(raw);
    const { main, traces } = splitTraces(t);
    let base = main;
    base = blank(base, FLAVOUR_NAME);
    let animalText = base;
    for (const re of SAFE) animalText = blank(animalText, re);
    let glutenText = base;
    for (const re of GLUTEN_SAFE) glutenText = blank(glutenText, re);
    for (const re of SAFE) glutenText = blank(glutenText, re);
    const maltVinegar = /\bmalt\s+vinegar\b/.test(glutenText);
    glutenText = blank(glutenText, /\b(?:barley\s+)?malt\s+vinegar(?:\s+powder)?\b/g);

    const strong = findAll(animalText, STRONG);
    const checks = findAll(animalText, CHECK);
    const gluten = findAll(glutenText, GLUTEN);
    const marks = [];

    // Allergen tags from OFF catch things written in ways we didn't parse
    const ALLERGEN_ANIMAL = { 'en:milk': ['Milk', 'dairy', true], 'en:eggs': ['Egg', 'egg', true], 'en:fish': ['Fish', 'fish', false], 'en:crustaceans': ['Crustaceans', 'shellfish', false], 'en:molluscs': ['Molluscs', 'shellfish', false] };
    const tagHits = allergens.filter(a => ALLERGEN_ANIMAL[a]).map(a => ({ word: ALLERGEN_ANIMAL[a][0], rule: { cat: ALLERGEN_ANIMAL[a][1], veg: ALLERGEN_ANIMAL[a][2] }, tag: true }));

    // OFF's own "definitely not vegan" ingredient flags (ignoring flavour names)
    const offNo = (k) => uniqBy((function flat(list, out) { for (const i of list || []) { out.push(i); flat(i.ingredients, out); } return out; })(p.ingredients, [])
      .filter(i => i[k] === 'no' && !/flavou?r/i.test(i.text || '') && !(p.labels_tags || []).includes('en:' + k)), i => i.text || i.id)
      .map(i => tidy(i.text || (i.id || '').replace(/^[a-z]{2}:/, '').replace(/-/g, ' ')));

    const traceText = (traces + ' ' + offTraces.map(x => x.replace(/^[a-z]{2}:/, '')).join(' ')).trim();
    const traceAnimals = uniqBy([
      ...(/\bmilk\b|dairy/.test(traceText) ? ['milk'] : []),
      ...(/\beggs?\b/.test(traceText) ? ['egg'] : []),
      ...(/\bfish\b/.test(traceText) ? ['fish'] : []),
      ...(/crustacean|shellfish|mollusc/.test(traceText) ? ['shellfish'] : [])
    ], x => x);

    function buildAnimal(kind) {
      const isVegan = kind === 'vegan';
      const labelled = isVegan ? labels.includes('en:vegan') : (labels.includes('en:vegetarian') || labels.includes('en:vegan'));
      const relevantStrong = strong.filter(h => isVegan || !h.rule.veg);
      const relevantTags = tagHits.filter(h => isVegan || !h.rule.veg);
      const relevantChecks = checks.filter(h => h.rule[kind]);

      const reasons = uniqBy([
        ...relevantStrong.map(h => ({ text: tidy(h.word), why: h.rule.cat })),
        ...offNo(kind).filter(w => !relevantStrong.some(h => h.word.toLowerCase().includes(w.toLowerCase()) || w.toLowerCase().includes(h.word.toLowerCase())))
          .map(w => ({ text: w, why: 'flagged by Open Food Facts' })),
        ...relevantTags.filter(h => !relevantStrong.some(s => s.rule.cat === h.rule.cat)).map(h => ({ text: h.word, why: 'listed allergen' }))
      ], r => r.text);
      const maybes = uniqBy(relevantChecks.map(h => ({ text: tidy(h.word), why: h.rule[kind] })), r => r.why);

      relevantStrong.forEach(h => marks.push({ start: h.start, end: h.end, level: 'no', kinds: [kind] }));
      relevantChecks.forEach(h => marks.push({ start: h.start, end: h.end, level: 'maybe', kinds: [kind] }));

      const traceNote = isVegan && traceAnimals.length
        ? `May contain ${traceAnimals.join(', ')} (cross-contamination warning only; most vegans accept this)`
        : (!isVegan && traceAnimals.some(a => a === 'fish' || a === 'shellfish') ? `May contain ${traceAnimals.filter(a => a === 'fish' || a === 'shellfish').join(', ')} (cross-contamination only)` : '');

      if (labelled && !reasons.length) return { status: 'yes', note: isVegan ? 'Labelled vegan' : 'Labelled vegetarian', extra: traceNote };
      if (reasons.length) return { status: 'no', reasons, maybes };
      if (!hasText) {
        if (labelled) return { status: 'yes', note: isVegan ? 'Labelled vegan' : 'Labelled vegetarian' };
        return { status: 'unknown', note: 'No ingredients list for this product yet' };
      }
      if (maybes.length) return { status: 'maybe', note: 'No obvious animal ingredients, but check these', maybes, extra: traceNote };
      return { status: 'yes', note: isVegan ? 'No animal ingredients found' : 'No meat, fish or animal by-products found', extra: traceNote };
    }

    function buildGluten() {
      const labelled = labels.includes('en:gluten-free') || labels.includes('en:no-gluten');
      const reasons = uniqBy(gluten.map(h => ({ text: tidy(h.word), why: h.rule.label })), r => r.text);
      if (!reasons.length && allergens.includes('en:gluten')) reasons.push({ text: 'Gluten', why: 'listed allergen' });
      gluten.forEach(h => marks.push({ start: h.start, end: h.end, level: 'no', kinds: ['gluten'] }));
      const glutenTrace = /\bgluten\b|\bwheat\b|\bbarley\b|\brye\b|\boats?\b|cereals?\s+containing/.test(traceText);
      const vinegarNote = maltVinegar ? 'Contains malt vinegar, which Coeliac UK says is fine' : '';

      if (labelled && !reasons.length) return { status: 'yes', note: 'Labelled gluten-free', extra: vinegarNote };
      if (reasons.length) {
        // Only oats? Softer verdict, since certified oats are OK for most coeliacs
        if (reasons.every(r => /^oat/i.test(r.text))) return { status: 'maybe', note: 'Contains oats', maybes: [{ text: 'Oats', why: 'Usually cross-contaminated with wheat unless the pack says gluten-free' }] };
        return { status: 'no', reasons };
      }
      if (!hasText) {
        if (labelled) return { status: 'yes', note: 'Labelled gluten-free' };
        return { status: 'unknown', note: 'No ingredients list for this product yet' };
      }
      if (glutenTrace) return { status: 'maybe', note: 'No gluten ingredients, but may contain traces', maybes: [{ text: 'May contain gluten', why: 'Made where gluten is handled; not safe for coeliacs' }], extra: vinegarNote };
      return { status: 'yes', note: 'No gluten ingredients found', extra: vinegarNote };
    }

    const result = {
      vegan: buildAnimal('vegan'),
      vegetarian: buildAnimal('vegetarian'),
      gluten: buildGluten(),
      text: raw,
      tracesAt: splitTraces(t).at,
      marks
    };
    return result;
  }

  // Build HTML for the ingredients text with flagged words highlighted for the active checks
  function highlight(result, activeKinds, esc) {
    const raw = result.text || '';
    const marks = result.marks.filter(m => m.kinds.some(k => activeKinds.includes(k)))
      .sort((a, b) => a.start - b.start || (a.level === 'no' ? -1 : 1));
    let out = '', pos = 0;
    for (const m of marks) {
      if (m.start < pos) continue;
      out += esc(raw.slice(pos, m.start)) + `<mark class="${m.level}">` + esc(raw.slice(m.start, m.end)) + '</mark>';
      pos = m.end;
    }
    return out + esc(raw.slice(pos));
  }

  const api = { analyse, highlight };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LettuceRules = api;
})(typeof window !== 'undefined' ? window : globalThis);
